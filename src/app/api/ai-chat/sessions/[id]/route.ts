/**
 * @file route.ts
 * @description DELETE — 세션 삭제 / PATCH — 세션 메타 수정 (제목 등)
 */
import { NextResponse } from 'next/server';
import { deleteSession, renameSession, updateSessionMeta } from '@/lib/ai/chat-store';

interface Ctx { params: Promise<{ id: string }>; }

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[ai-chat/sessions DELETE]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    if (body.title !== undefined) {
      await renameSession(id, body.title);
    }
    if (body.providerId || body.modelId || body.personaId) {
      await updateSessionMeta(id, {
        providerId: body.providerId, modelId: body.modelId, personaId: body.personaId,
      });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[ai-chat/sessions PATCH]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
