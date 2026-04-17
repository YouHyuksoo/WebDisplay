/**
 * @file src/app/api/ai-tables/sync/route.ts
 * @description DB → schema-cache.json 동기화 API.
 *
 * 초보자 가이드:
 * - 신규 테이블 추가/삭제/컬럼 변화 발생 시 호출해 schema-cache.json을 갱신.
 * - 반환값: { added, removed, modified } — 프런트에서 사용자에게 diff 안내.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { syncFromDb } from '@/lib/ai-tables/schema-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const site: SiteKey = (body.site as SiteKey) ?? 'default';
    const diff = await syncFromDb(site);
    return NextResponse.json(diff);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
