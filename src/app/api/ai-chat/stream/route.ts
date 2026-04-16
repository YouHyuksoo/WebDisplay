/**
 * @file src/app/api/ai-chat/stream/route.ts
 * @description SSE chat endpoint for AI chat flow.
 */

import { loadMessages, appendMessage, updateSessionMeta } from '@/lib/ai/chat-store';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getPersona, getDefaultPersona } from '@/lib/ai/persona-store';
import { buildSystemPrompt } from '@/lib/ai/context/prompt-builder';
import { guardSql, extractSqlFromResponse } from '@/lib/ai/sql-guard';
import { executeAiReadQuery, executeQueryByProfile } from '@/lib/db';
import { getProvider } from '@/lib/ai/router';
import { selectContext } from '@/lib/ai/context/context-selector';
import { loadSelectedContext } from '@/lib/ai/context/context-loader';
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
  // Vietnam local (UTC+7): 08:00~20:00 => A, otherwise B.
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
        try {
          controller.enqueue(enc.encode(sseEvent(event, data)));
        } catch {
          // ignore enqueue failure after close
        }
      };

      const closeStream = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // ignore double close
        }
      };

      try {
        // 1) Save user message.
        await appendMessage({ sessionId, role: 'user', content: prompt });
        send('user_saved', { ok: true });

        // 2) Load provider/persona runtime settings.
        const providerCfg = await getProviderForRuntime(providerId);
        if (!providerCfg || !providerCfg.apiKey) {
          send('error', { message: 'API 키가 없습니다. 설정 > AI 공급자에서 키를 입력하세요.' });
          send('done', { ok: false });
          closeStream();
          return;
        }

        const persona = personaId ? await getPersona(personaId) : await getDefaultPersona();
        const provider = getProvider(providerId);
        const model = modelId || providerCfg.defaultModelId || provider.listModels()[0];

        await updateSessionMeta(sessionId, {
          providerId,
          modelId: model,
          personaId: persona?.personaId,
        });

        // 2.5) Stage 0: context selection
        send('stage', { stage: 'context_selection' });
        const selection = await selectContext(prompt, providerId, model);
        const normalizedPrompt = prompt.toLowerCase();
        if (normalizedPrompt.includes('베트남') || normalizedPrompt.includes('smvnpdb')) {
          selection.site = '베트남VD외부';
        } else if (normalizedPrompt.includes('멕시코vd') || normalizedPrompt.includes('smmexpdb')) {
          selection.site = '멕시코VD외부';
        }
        const contextDocs = loadSelectedContext(selection.tables, selection.domains);
        send('context_selected', {
          tables: selection.tables,
          domains: selection.domains,
          site: selection.site,
        });

        // 3) SQL generation stage.
        const today = new Date().toISOString().slice(0, 10);
        const sqlSystemPrompt = await buildSystemPrompt({
          stage: 'sql_generation',
          currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
          customSqlPrompt: providerCfg.sqlSystemPrompt || undefined,
          selectedContextDocs: contextDocs || undefined,
          selectedSite: selection.site,
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
            closeStream();
            return;
          }
        }

        // 4) Extract + guard SQL.
        const rawSql = extractSqlFromResponse(sqlResponseText);
        if (!rawSql) {
          await appendMessage({ sessionId, role: 'assistant', content: sqlResponseText });
          send('done', { ok: true, hasNoSql: true });
          closeStream();
          return;
        }

        const guard = await guardSql(rawSql);
        if (!guard.safe) {
          const errMsg = `SQL 안전성 검사 실패: ${guard.reason}`;
          await appendMessage({ sessionId, role: 'sql', sqlText: rawSql, content: errMsg });
          send('error', { message: errMsg });
          send('done', { ok: false });
          closeStream();
          return;
        }

        if (guard.needsConfirmation) {
          const sqlMsgId = await appendMessage({
            sessionId,
            role: 'sql',
            sqlText: guard.rewritten,
            content: `사용자 확인 필요 - ${guard.reason}`,
          });

          send('confirm_required', {
            sessionId,
            messageId: sqlMsgId,
            sql: guard.rewritten,
            estimatedCost: guard.estimatedCost,
            estimatedRows: guard.estimatedRows,
            reason: guard.reason,
          });

          send('done', { ok: true, awaitingConfirm: true });
          closeStream();
          return;
        }

        // 5) Execute SQL (site-aware).
        const t0 = Date.now();
        let resultRows: Record<string, unknown>[] = [];
        let execError: string | null = null;

        try {
          if (selection.site === 'default') {
            resultRows = await executeAiReadQuery(guard.rewritten);
          } else {
            resultRows = await executeQueryByProfile(selection.site, guard.rewritten);
          }
        } catch (e) {
          execError = e instanceof Error ? e.message : String(e);
        }

        const execMs = Date.now() - t0;

        await appendMessage({
          sessionId,
          role: 'sql',
          sqlText: guard.rewritten,
          content: execError ? `실행 오류: ${execError}` : `조회 ${resultRows.length}건 (${execMs}ms)`,
          execMs,
        });

        if (execError) {
          send('error', { message: `SQL 실행 오류: ${execError}` });
          send('done', { ok: false });
          closeStream();
          return;
        }

        const resultJson = JSON.stringify(resultRows.slice(0, 100));
        await appendMessage({ sessionId, role: 'sql_result', resultJson });
        send('sql_executed', {
          rowCount: resultRows.length,
          execMs,
          rows: resultRows.slice(0, 100),
          site: selection.site,
        });

        // 6) Analysis stage.
        const analysisSystemPrompt = await buildSystemPrompt({
          stage: 'analysis',
          personaPrompt: persona?.systemPrompt,
          currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
          customAnalysisPrompt: providerCfg.analysisPrompt || undefined,
        });

        const analysisUserMsg =
          `사용자 질문: ${prompt}\n\n` +
          `실행된 SQL:\n\`\`\`sql\n${guard.rewritten}\n\`\`\`\n\n` +
          `조회 결과 (${resultRows.length}건, 최대 100건):\n\`\`\`json\n${resultJson}\n\`\`\`\n\n` +
          '결과를 표/차트/요약으로 설명하세요.';

        send('stage', { stage: 'analysis' });
        let analysisText = '';
        let assistantSaved = false;

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
              sessionId,
              role: 'assistant',
              content: analysisText,
              tokensIn: chunk.tokensIn,
              tokensOut: chunk.tokensOut,
            });
            assistantSaved = true;
          }
        }

        if (!assistantSaved && analysisText.trim().length > 0) {
          await appendMessage({ sessionId, role: 'assistant', content: analysisText });
        }

        send('done', { ok: true });
        closeStream();
      } catch (e) {
        console.error('[ai-chat/stream]', e);
        send('error', { message: e instanceof Error ? e.message : String(e) });
        send('done', { ok: false });
        closeStream();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
