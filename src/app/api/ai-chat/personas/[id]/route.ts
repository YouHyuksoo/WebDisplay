/**
 * @file route.ts
 * @description PATCH 페르소나 수정 / DELETE 페르소나 삭제
 */
import { NextResponse } from 'next/server';
import { updatePersona, deletePersona } from '@/lib/ai/persona-store';

interface Ctx { params: Promise<{ id: string }>; }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    await updatePersona(id, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[personas PATCH]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await deletePersona(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[personas DELETE]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
