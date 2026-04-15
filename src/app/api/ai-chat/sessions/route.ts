/**
 * @file route.ts
 * @description GET /api/ai-chat/sessions — 세션 목록 / POST — 세션 생성
 */
import { NextResponse } from 'next/server';
import { listSessions, createSession } from '@/lib/ai/chat-store';

export async function GET() {
  try {
    const sessions = await listSessions(50);
    return NextResponse.json({ sessions });
  } catch (e) {
    console.error('[ai-chat/sessions GET]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = await createSession({
      title: body.title,
      providerId: body.providerId,
      modelId: body.modelId,
      personaId: body.personaId,
    });
    return NextResponse.json({ sessionId });
  } catch (e) {
    console.error('[ai-chat/sessions POST]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
