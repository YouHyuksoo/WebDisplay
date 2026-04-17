/**
 * @file src/app/api/ai-tables/[site]/[table]/preview/route.ts
 * @description Stage 1 compact 프롬프트 블록 + 예상 토큰 수 반환.
 *
 * 초보자 가이드:
 * - GET: buildStage1Prompt(site, [table]) 결과와 estimateTokens 값을 JSON 으로.
 * - 실제 `/ai-chat`가 이 테이블을 단독 컨텍스트로 쓴다면 보게 될 문자열.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { buildStage1Prompt } from '@/lib/ai-tables/merged-context';
import { estimateTokens } from '@/lib/ai-tables/tokenizer';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ site: string; table: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { site, table } = await params;
    const tableName = decodeURIComponent(table);
    const compactBlock = await buildStage1Prompt(site as SiteKey, [tableName]);
    return NextResponse.json({
      compactBlock,
      estimatedTokens: estimateTokens(compactBlock),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
