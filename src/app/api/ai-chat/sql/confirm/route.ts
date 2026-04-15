/**
 * @file route.ts
 * @description POST /api/ai-chat/sql/confirm — 사용자가 위험 쿼리 ▶ 클릭 시 호출.
 *   기존 sql 메시지 ID를 받아 SQL을 실행하고 결과+분석을 추가 메시지로 저장.
 *   응답은 비스트리밍 JSON (스트리밍 흐름은 /stream과 분리).
 */
import { NextResponse } from 'next/server';
import { executeQuery, executeAiReadQuery } from '@/lib/db';
import { appendMessage } from '@/lib/ai/chat-store';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getPersona, getDefaultPersona } from '@/lib/ai/persona-store';
import { buildSystemPrompt } from '@/lib/ai/context/prompt-builder';
import { getProvider } from '@/lib/ai/router';
import type { ProviderId } from '@/lib/ai/providers/types';

export const runtime = 'nodejs';

interface SqlMsgRow {
  SESSION_ID: string;
  SQL_TEXT: string | null;
}

interface SessionRow {
  PROVIDER_ID: string | null;
  MODEL_ID: string | null;
  PERSONA_ID: string | null;
}

function getServerShift(): 'A' | 'B' {
  const utcHours = new Date().getUTCHours();
  const ictHours = (utcHours + 7) % 24;
  return ictHours >= 8 && ictHours < 20 ? 'A' : 'B';
}

export async function POST(request: Request) {
  try {
    const { messageId } = await request.json();
    if (!messageId) return NextResponse.json({ error: 'messageId required' }, { status: 400 });

    // 1. SQL 메시지 조회
    const sqlRows = await executeQuery<SqlMsgRow>(
      `SELECT SESSION_ID, SQL_TEXT FROM AI_CHAT_MESSAGE WHERE MESSAGE_ID = :id`,
      { id: messageId },
    );
    if (sqlRows.length === 0 || !sqlRows[0].SQL_TEXT) {
      return NextResponse.json({ error: 'SQL message not found' }, { status: 404 });
    }
    const { SESSION_ID: sessionId, SQL_TEXT: sql } = sqlRows[0];

    // 2. 세션 메타로 프로바이더/모델/페르소나 식별
    const sesRows = await executeQuery<SessionRow>(
      `SELECT PROVIDER_ID, MODEL_ID, PERSONA_ID FROM AI_CHAT_SESSION WHERE SESSION_ID = :sid`,
      { sid: sessionId },
    );
    if (sesRows.length === 0) return NextResponse.json({ error: 'session not found' }, { status: 404 });
    const ses = sesRows[0];
    if (!ses.PROVIDER_ID) return NextResponse.json({ error: 'session has no provider' }, { status: 400 });

    // 3. SQL 실행
    const t0 = Date.now();
    let resultRows: Record<string, unknown>[] = [];
    let execError: string | null = null;
    try {
      resultRows = await executeAiReadQuery(sql);
    } catch (e) {
      execError = e instanceof Error ? e.message : String(e);
    }
    const execMs = Date.now() - t0;

    if (execError) {
      await appendMessage({
        sessionId, role: 'sql_result',
        content: `실행 실패: ${execError}`, execMs,
      });
      return NextResponse.json({ error: execError }, { status: 500 });
    }

    const resultJson = JSON.stringify(resultRows.slice(0, 100));
    await appendMessage({ sessionId, role: 'sql_result', resultJson, execMs });

    // 4. 분석 단계 (비스트리밍)
    const providerCfg = await getProviderForRuntime(ses.PROVIDER_ID as ProviderId);
    if (!providerCfg?.apiKey) return NextResponse.json({ error: 'provider not configured' }, { status: 400 });
    const persona = ses.PERSONA_ID ? await getPersona(ses.PERSONA_ID) : await getDefaultPersona();
    const provider = getProvider(ses.PROVIDER_ID as ProviderId);

    const today = new Date().toISOString().slice(0, 10);
    const analysisPrompt = await buildSystemPrompt({
      stage: 'analysis',
      personaPrompt: persona?.systemPrompt,
      currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
    });

    let analysisText = '';
    let inT = 0, outT = 0;
    for await (const chunk of provider.chatStream({
      model: ses.MODEL_ID || provider.listModels()[0],
      messages: [{ role: 'user', content: `실행 결과:\n${resultJson}\n\n분석해주세요.` }],
      systemPrompt: analysisPrompt,
    }, providerCfg.apiKey)) {
      if (chunk.type === 'token' && chunk.delta) analysisText += chunk.delta;
      if (chunk.type === 'done') { inT = chunk.tokensIn || 0; outT = chunk.tokensOut || 0; }
    }

    await appendMessage({
      sessionId, role: 'assistant', content: analysisText,
      tokensIn: inT, tokensOut: outT,
    });

    return NextResponse.json({
      success: true,
      rowCount: resultRows.length,
      rows: resultRows.slice(0, 100),
      analysis: analysisText,
      execMs,
    });
  } catch (e) {
    console.error('[ai-chat/sql/confirm]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
