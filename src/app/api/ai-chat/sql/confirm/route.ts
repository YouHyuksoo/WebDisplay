/**
 * @file src/app/api/ai-chat/sql/confirm/route.ts
 * @description POST /api/ai-chat/sql/confirm
 *   Confirmation-required SQL을 사용자가 승인하면 실행 후 sql_result/assistant 메시지를 저장한다.
 */

import { NextResponse } from 'next/server';
import { executeAiReadQuery } from '@/lib/db';
import { appendMessage, loadMessages } from '@/lib/ai/chat-store';
import { loadChatSession } from '@/lib/ai-config';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getPersona, getDefaultPersona } from '@/lib/ai/persona-store';
import { buildSystemPrompt } from '@/lib/ai/context/prompt-builder';
import { getProvider } from '@/lib/ai/router';
import type { ProviderId } from '@/lib/ai/providers/types';

export const runtime = 'nodejs';

interface RequestBody {
  sessionId?: string;
  messageId?: string;
}

function getServerShift(): 'A' | 'B' {
  const utcHours = new Date().getUTCHours();
  const ictHours = (utcHours + 7) % 24;
  return ictHours >= 8 && ictHours < 20 ? 'A' : 'B';
}

export async function POST(request: Request) {
  try {
    const { sessionId, messageId } = (await request.json().catch(() => ({}))) as RequestBody;
    if (!sessionId || !messageId) {
      return NextResponse.json({ error: 'sessionId and messageId are required' }, { status: 400 });
    }

    const session = await loadChatSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'session not found' }, { status: 404 });
    }

    const sqlMsg = session.messages.find((m) => m.messageId === messageId && m.role === 'sql');
    if (!sqlMsg?.sqlText) {
      return NextResponse.json({ error: 'SQL message not found' }, { status: 404 });
    }

    if (!session.providerId) {
      return NextResponse.json({ error: 'provider not configured in session' }, { status: 400 });
    }

    const providerCfg = await getProviderForRuntime(session.providerId as ProviderId);
    if (!providerCfg?.apiKey) {
      return NextResponse.json({ error: 'provider apiKey missing' }, { status: 400 });
    }

    const provider = getProvider(session.providerId as ProviderId);
    const model = session.modelId || providerCfg.defaultModelId || provider.listModels()[0];

    // 1) SQL 실행
    const sqlToExecute = sqlMsg.sqlText.trim().replace(/;\s*$/, '');
    const t0 = Date.now();
    let resultRows: Record<string, unknown>[] = [];
    let execError: string | null = null;
    try {
      resultRows = await executeAiReadQuery(sqlToExecute);
    } catch (e) {
      execError = e instanceof Error ? e.message : String(e);
    }
    const execMs = Date.now() - t0;

    if (execError) {
      await appendMessage({
        sessionId,
        role: 'sql_result',
        content: `실행 실패: ${execError}`,
        execMs,
      });
      await appendMessage({
        sessionId,
        role: 'assistant',
        content: `요청하신 SQL 실행 중 오류가 발생했습니다.\n\n- 오류: ${execError}\n- SQL을 수정하거나 질문을 조금 더 구체적으로 다시 요청해주세요.`,
      });
      return NextResponse.json({ success: false, error: execError, execMs });
    }

    const resultJson = JSON.stringify(resultRows.slice(0, 100));
    await appendMessage({
      sessionId,
      role: 'sql_result',
      resultJson,
      execMs,
    });

    // 2) 분석 단계
    const persona = session.personaId ? await getPersona(session.personaId) : await getDefaultPersona();
    const today = new Date().toISOString().slice(0, 10);
    const analysisPrompt = await buildSystemPrompt({
      stage: 'analysis',
      personaPrompt: persona?.systemPrompt,
      currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
      customAnalysisPrompt: providerCfg.analysisPrompt || undefined,
    });

    const history = await loadMessages(sessionId);
    const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || '';

    const analysisUserMsg =
      `사용자 질문: ${lastUser}\n\n` +
      `실행한 SQL:\n\`\`\`sql\n${sqlMsg.sqlText}\n\`\`\`\n\n` +
      `결과 (${resultRows.length}행 중 상위 100):\n\`\`\`json\n${resultJson}\n\`\`\`\n\n` +
      '위 결과를 분석해주세요.';

    let analysisText = '';
    let inTokens = 0;
    let outTokens = 0;
    let assistantSaved = false;

    for await (const chunk of provider.chatStream(
      {
        model,
        messages: [{ role: 'user', content: analysisUserMsg }],
        systemPrompt: analysisPrompt,
        temperature: 0.5,
      },
      providerCfg.apiKey,
    )) {
      if (chunk.type === 'token' && chunk.delta) {
        analysisText += chunk.delta;
      } else if (chunk.type === 'done') {
        inTokens = chunk.tokensIn ?? 0;
        outTokens = chunk.tokensOut ?? 0;
        await appendMessage({
          sessionId,
          role: 'assistant',
          content: analysisText,
          tokensIn: inTokens,
          tokensOut: outTokens,
        });
        assistantSaved = true;
      }
    }

    if (!assistantSaved && analysisText.trim().length > 0) {
      await appendMessage({ sessionId, role: 'assistant', content: analysisText });
    }

    return NextResponse.json({
      success: true,
      rowCount: resultRows.length,
      rows: resultRows.slice(0, 100),
      analysis: analysisText,
      execMs,
      tokensIn: inTokens,
      tokensOut: outTokens,
    });
  } catch (e) {
    console.error('[ai-chat/sql/confirm]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
