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
  /** 출력 형식 프리셋 (table/chart/detail/markdown/html/text). 분석 단계에서만 적용 */
  outputFormat?: string;
  /** 응답 스타일 프리셋 (brief/normal/detailed/summary/steps). 분석 단계에서만 적용 */
  responseStyle?: string;
}

// 서버에서 LLM에 주입할 hint 문구 — 클라이언트와 분리 관리
const FORMAT_HINTS: Record<string, string> = {
  table: '마크다운 표 위주로 정리',
  chart: '차트 시각화(JSON) 포함',
  detail: '상세 분석 텍스트로 서술',
  markdown: '마크다운 형식 (제목·볼드·리스트·코드블록)',
  html: 'HTML 태그로 구조화 (table·ul·strong 등)',
  text: '서식 없는 순수 텍스트',
};
const STYLE_HINTS: Record<string, string> = {
  brief: '핵심만 1~3문장으로 간결하게. 불필요한 배경 설명·서론 생략.',
  normal: '적절한 분량으로 균형있게.',
  detailed: '근거·수치·분석 과정을 포함해 상세히. 판단 근거도 설명.',
  summary: '핵심을 bullet point 3~5개로. 서론·결론 생략.',
  steps: '단계 1, 2, 3… 순서로 번호를 매겨 절차적으로.',
};

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
  const { sessionId, prompt, providerId, modelId, personaId, outputFormat, responseStyle } = body;
  const requestStart = Date.now();

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

        const sqlGenStart = Date.now();
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
        const sqlGenMs = Date.now() - sqlGenStart;

        // 4) Extract + guard SQL.
        const rawSql = extractSqlFromResponse(sqlResponseText);
        if (!rawSql) {
          await appendMessage({ sessionId, role: 'assistant', content: sqlResponseText, sqlGenMs });
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
        const sqlExecStart = Date.now();
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

        const sqlExecMs = Date.now() - sqlExecStart;

        await appendMessage({
          sessionId,
          role: 'sql',
          sqlText: guard.rewritten,
          content: execError ? `실행 오류: ${execError}` : `조회 ${resultRows.length}건 (${sqlExecMs}ms)`,
          execMs: sqlExecMs,
          sqlGenMs,
          sqlExecMs,
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
          execMs: sqlExecMs,
          rows: resultRows.slice(0, 100),
          site: selection.site,
        });

        // 6) Analysis stage.
        const baseAnalysisSystemPrompt = await buildSystemPrompt({
          stage: 'analysis',
          personaPrompt: persona?.systemPrompt,
          currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
          customAnalysisPrompt: providerCfg.analysisPrompt || undefined,
        });

        // 사용자 선택한 출력 형식 / 응답 스타일을 system prompt 말미에 강하게 주입.
        // "반드시" "예외 없이" 키워드로 LLM이 덮어쓰지 못하게 강조.
        const formatDirective = outputFormat && outputFormat !== 'auto' && FORMAT_HINTS[outputFormat]
          ? `\n\n[출력 형식 강제 지시]\n반드시 다음 형식을 따르세요: ${FORMAT_HINTS[outputFormat]}. 예외 없음.`
          : '';
        const styleDirective = responseStyle && responseStyle !== 'auto' && STYLE_HINTS[responseStyle]
          ? `\n\n[응답 스타일 강제 지시]\n반드시 다음 스타일로 답하세요: ${STYLE_HINTS[responseStyle]} 이 지시는 다른 어떤 기본 지침보다 우선합니다.`
          : '';
        const analysisSystemPrompt = baseAnalysisSystemPrompt + formatDirective + styleDirective;

        // 분석 유저 메시지 — 기본 지시문은 스타일이 auto일 때만, 아닐 땐 사용자 선택 존중
        const defaultCue = (outputFormat && outputFormat !== 'auto') || (responseStyle && responseStyle !== 'auto')
          ? '위 지시된 형식/스타일로 결과를 설명하세요.'
          : '결과를 표/차트/요약으로 설명하세요.';
        const analysisUserMsg =
          `사용자 질문: ${prompt}\n\n` +
          `실행된 SQL:\n\`\`\`sql\n${guard.rewritten}\n\`\`\`\n\n` +
          `조회 결과 (${resultRows.length}건, 최대 100건):\n\`\`\`json\n${resultJson}\n\`\`\`\n\n` +
          defaultCue;

        const analysisStart = Date.now();
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
            const analysisMs = Date.now() - analysisStart;
            await appendMessage({
              sessionId,
              role: 'assistant',
              content: analysisText,
              tokensIn: chunk.tokensIn,
              tokensOut: chunk.tokensOut,
              sqlGenMs,
              analysisMs,
            });
            assistantSaved = true;
          }
        }

        const analysisMs = assistantSaved ? undefined : (Date.now() - analysisStart);
        if (!assistantSaved && analysisText.trim().length > 0) {
          await appendMessage({ sessionId, role: 'assistant', content: analysisText, sqlGenMs, analysisMs });
        }

        const totalMs = Date.now() - requestStart;
        send('done', { ok: true, perf: { totalMs, sqlGenMs, sqlExecMs, analysisMs } });
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
