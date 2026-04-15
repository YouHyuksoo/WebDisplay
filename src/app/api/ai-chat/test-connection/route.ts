/**
 * @file route.ts
 * @description POST {providerId, apiKey, model?} → 프로바이더 ping 테스트
 *   apiKey가 '<USE_SAVED>'면 DB의 저장된 키 사용 (마스킹된 키로는 호출 불가하므로)
 */
import { NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/router';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import type { ProviderId } from '@/lib/ai/providers/types';

export async function POST(request: Request) {
  try {
    const { providerId, apiKey, model } = await request.json();
    let realKey = apiKey;
    if (apiKey === '<USE_SAVED>') {
      const cfg = await getProviderForRuntime(providerId as ProviderId);
      if (!cfg?.apiKey) {
        return NextResponse.json({ ok: false, error: '저장된 키가 없습니다' }, { status: 400 });
      }
      realKey = cfg.apiKey;
    }
    const provider = getProvider(providerId as ProviderId);
    const result = await provider.testConnection(realKey, model);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
