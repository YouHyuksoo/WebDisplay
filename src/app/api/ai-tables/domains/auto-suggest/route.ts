/**
 * @file src/app/api/ai-tables/domains/auto-suggest/route.ts
 * @description 스키마·basecode 캐시 기반 도메인 자동 제안.
 *
 * 초보자 가이드:
 * - POST: `{ suggestions: DomainSuggestion[] }` 반환.
 * - 현재는 제안만 — 실제 추가는 프론트에서 개별 `POST /api/ai-tables/domains` 호출.
 */

import { NextResponse } from 'next/server';
import { loadDomains } from '@/lib/ai-tables/store';
import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import { loadBasecodes } from '@/lib/ai-tables/basecode-loader';
import { suggestDomains } from '@/lib/ai-tables/domain-suggester';

export async function POST() {
  try {
    const [cache, basecodes, existing] = await Promise.all([
      loadSchemaCache(),
      loadBasecodes(),
      loadDomains(),
    ]);
    const suggestions = suggestDomains(cache, basecodes, existing.domains);
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
