/**
 * @file route.ts
 * @description GET /api/ai-chat/sessions/[id]/messages — 세션의 모든 메시지
 */
import { NextResponse } from 'next/server';
import { loadMessages } from '@/lib/ai/chat-store';

interface Ctx { params: Promise<{ id: string }>; }

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const messages = await loadMessages(id);
    return NextResponse.json(
      { messages },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch (e) {
    console.error('[ai-chat/messages GET]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
