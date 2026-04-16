/**
 * @file route.ts
 * @description GET 페르소나 목록 (전체) / POST 페르소나 생성
 */
import { NextResponse } from 'next/server';
import { listPersonas, createPersona } from '@/lib/ai/persona-store';

export async function GET() {
  try {
    const personas = await listPersonas(false);
    return NextResponse.json({ personas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[personas GET]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personaId = await createPersona(body);
    return NextResponse.json({ personaId });
  } catch (e) {
    console.error('[personas POST]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
