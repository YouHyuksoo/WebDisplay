/**
 * @file route.ts
 * @description GET 용어 목록 / POST 용어 생성
 */
import { NextResponse } from 'next/server';
import { listTerms, createTerm } from '@/lib/ai/context/glossary-store';

export async function GET() {
  try {
    const terms = await listTerms({ topN: 500, activeOnly: false });
    return NextResponse.json({ terms });
  } catch (e) {
    console.error('[glossary GET]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const termId = await createTerm(body);
    return NextResponse.json({ termId });
  } catch (e) {
    console.error('[glossary POST]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
