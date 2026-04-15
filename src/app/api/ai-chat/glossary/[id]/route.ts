/**
 * @file route.ts
 * @description PATCH 용어 수정 / DELETE 용어 삭제
 */
import { NextResponse } from 'next/server';
import { updateTerm, deleteTerm } from '@/lib/ai/context/glossary-store';

interface Ctx { params: Promise<{ id: string }>; }

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();
    await updateTerm(id, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[glossary PATCH]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    await deleteTerm(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[glossary DELETE]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
