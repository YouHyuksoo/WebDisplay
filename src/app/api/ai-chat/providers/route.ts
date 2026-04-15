/**
 * @file route.ts
 * @description GET 4개 프로바이더 설정 조회 (마스킹) / PUT 단건 업데이트
 */
import { NextResponse } from 'next/server';
import { listProviders, updateProvider } from '@/lib/ai/provider-store';
import type { ProviderId } from '@/lib/ai/providers/types';

export async function GET() {
  try {
    const providers = await listProviders();
    return NextResponse.json({ providers });
  } catch (e) {
    console.error('[providers GET]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { providerId, ...input } = body;
    await updateProvider(providerId as ProviderId, input);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[providers PUT]', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
