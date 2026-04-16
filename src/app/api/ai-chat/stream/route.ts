/**
 * @file route.ts
 * @description POST /api/ai-chat/stream — SSE 스트리밍 채팅.
 *
 * 흐름:
 * 1. user 메시지 저장
 * 2. SQL 생성 단계: prompt-builder → provider.chatStream
 * 3. 응답에서 SQL 추출 → guardSql → confirmation 필요 시 SSE event
 * 4. 안전하면 즉시 실행 → SQL/SQL_RESULT 메시지 저장
 * 5. 결과 분석 단계: provider.chatStream(stage=analysis)
 * 6. assistant 메시지 저장 → done 이벤트
 */
import { loadMessages, appendMessage, updateSessionMeta } from '@/lib/ai/chat-store';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getPersona, getDefaultPersona } from '@/lib/ai/persona-store';
import { buildSystemPrompt } from '@/lib/ai/context/prompt-builder';
import { guardSql, extractSqlFromResponse } from '@/lib/ai/sql-guard';
import { executeAiReadQuery } from '@/lib/db';
import { getProvider } from '@/lib/ai/router';
import type { ProviderId, ChatMessage } from '@/lib/ai/providers/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  sessionId: string;
  prompt: string;
  providerId: ProviderId;
  modelId?: string;
  personaId?: string;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getServerShift(): 'A' | 'B' {
  // 베트남 로컬 = UTC+7. 08~20 = A, 그 외 = B
  const utcHours = new Date().getUTCHours();
  const ictHours = (utcHours + 7) % 24;
  return ictHours >= 8 && ictHours < 20 ? 'A' : 'B';
}

export async function POST(request: Request) {
  const body = (await request.json()) as RequestBody;
  const { sessionId, prompt, providerId, modelId, personaId } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(sseEvent(event, data))); } catch { /* 무시 */ }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try { close(); } catch { /* 무시 */ }
      };

      try {
        // 1. user 메시지 저장
        await appendMessage({ sessionId, role: 'user', content: prompt });
        send('user_saved', { ok: true });

        // 2. 프로바이더/페르소나 로드
        const providerCfg = await getProviderForRuntime(providerId);
        if (!providerCfg || !providerCfg.apiKey) {
          send('error', { message: 'API 키가 등록되지 않았습니다. 설정 → AI 모델에서 등록하세요.' });
          send('done', { ok: false });
          close();
          return;
        }
        const persona = personaId ? await getPersona(personaId) : await getDefaultPersona();
        const provider = getProvider(providerId);
        const model = modelId || providerCfg.defaultModelId || provider.listModels()[0];

        // 세션 메타 갱신
        await updateSessionMeta(sessionId, { providerId, modelId: model, personaId: persona?.personaId });

        // 3. SQL 생성 단계
        const today = new Date().toISOString().slice(0, 10);
        const sqlSystemPrompt = await buildSystemPrompt({
          stage: 'sql_generation',
          currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
          customSqlPrompt: providerCfg.sqlSystemPrompt || undefined,
        });

        const history = await loadMessages(sessionId);
        const conversationMsgs: ChatMessage[] = history
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content || '' }));

        let sqlResponseText = '';
        const sqlStream = provider.chatStream(
          {
            model,
            messages: conversationMsgs,
            systemPrompt: sqlSystemPrompt,
            temperature: 0.1,
          },
          providerCfg.apiKey,
        );

        send('stage', { stage: 'sql_generation' });
        for await (const chunk of sqlStream) {
          if (chunk.type === 'token' && chunk.delta) {
            sqlResponseText += chunk.delta;
            send('token', { delta: chunk.delta, stage: 'sql_generation' });
          } else if (chunk.type === 'error') {
            send('error', { message: chunk.error });
            send('done', { ok: false });
            close();
            return;
          }
        }

        // 4. SQL 추출 + 가드
        const rawSql = extractSqlFromResponse(sqlResponseText);
        if (!rawSql) {
          await appendMessage({ sessionId, role: 'assistant', content: sqlResponseText });
          send('done', { ok: true, hasNoSql: true });
          close();
          return;
        }

        const guard = await guardSql(rawSql);
        if (!guard.safe) {
          const errMsg = `SQL 차단됨: ${guard.reason}`;
          await appendMessage({ sessionId, role: 'sql', sqlText: rawSql, content: errMsg });
          send('error', { message: errMsg });
          send('done', { ok: false });
          close();
          return;
        }

        if (guard.needsConfirmation) {
          const sqlMsgId = await appendMessage({
            sessionId, role: 'sql', sqlText: guard.rewritten,
            content: `대기 중 — ${guard.reason}`,
          });
          send('confirm_required', {
            messageId: sqlMsgId,
            sql: guard.rewritten,
            estimatedCost: guard.estimatedCost,
            estimatedRows: guard.estimatedRows,
            reason: guard.reason,
          });
          send('done', { ok: true, awaitingConfirm: true });
          close();
          return;
        }

        // 5. 안전 → 즉시 실행
        const t0 = Date.now();
        let resultRows: Record<string, unknown>[] = [];
        let execError: string | null = null;
        try {
          resultRows = await executeAiReadQuery(guard.rewritten);
        } catch (e) {
          execError = e instanceof Error ? e.message : String(e);
        }
        const execMs = Date.now() - t0;

        await appendMessage({
          sessionId, role: 'sql', sqlText: guard.rewritten,
          content: execError ? `실패: ${execError}` : `✓ ${resultRows.length}행 (${execMs}ms)`,
          execMs,
        });

        if (execError) {
          send('error', { message: `SQL 실행 실패: ${execError}` });
          send('done', { ok: false });
          close();
          return;
        }

        const resultJson = JSON.stringify(resultRows.slice(0, 100));
        await appendMessage({
          sessionId, role: 'sql_result', resultJson,
        });
        send('sql_executed', { rowCount: resultRows.length, execMs, rows: resultRows.slice(0, 100) });

        // 6. 결과 분석 단계
        const analysisSystemPrompt = await buildSystemPrompt({
          stage: 'analysis',
          personaPrompt: persona?.systemPrompt,
          currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
          customAnalysisPrompt: providerCfg.analysisPrompt || undefined,
        });

        const analysisUserMsg = `사용자 질문: ${prompt}\n\n실행한 SQL:\n\`\`\`sql\n${guard.rewritten}\n\`\`\`\n\n결과 (${resultRows.length}행 중 상위 100):\n\`\`\`json\n${resultJson}\n\`\`\`\n\n위 결과를 분석해주세요.`;

        send('stage', { stage: 'analysis' });
        let analysisText = '';
        const analysisStream = provider.chatStream(
          {
            model,
            messages: [{ role: 'user', content: analysisUserMsg }],
            systemPrompt: analysisSystemPrompt,
            temperature: 0.5,
          },
          providerCfg.apiKey,
        );
        for await (const chunk of analysisStream) {
          if (chunk.type === 'token' && chunk.delta) {
            analysisText += chunk.delta;
            send('token', { delta: chunk.delta, stage: 'analysis' });
          } else if (chunk.type === 'error') {
            send('error', { message: chunk.error });
          } else if (chunk.type === 'done') {
            await appendMessage({
              sessionId, role: 'assistant', content: analysisText,
              tokensIn: chunk.tokensIn, tokensOut: chunk.tokensOut,
            });
          }
        }

        send('done', { ok: true });
        close();
      } catch (e) {
        console.error('[ai-chat/stream]', e);
        send('error', { message: e instanceof Error ? e.message : String(e) });
        send('done', { ok: false });
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
