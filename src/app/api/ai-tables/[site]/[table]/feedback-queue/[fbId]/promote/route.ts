/**
 * @file src/app/api/ai-tables/[site]/[table]/feedback-queue/[fbId]/promote/route.ts
 * @description 피드백을 정식 examples[] 로 승격.
 *
 * 초보자 가이드:
 * - POST body: Partial<Example> (kind/question/sql/why 등). 누락되면 큐의 값으로 대체.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { promoteFeedback } from '@/lib/ai-tables/feedback-queue';
import type { SiteKey, Example } from '@/lib/ai-tables/types';

type Params = {
  params: Promise<{ site: SiteKey; table: string; fbId: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { site, table, fbId } = await params;
    const body = (await req.json().catch(() => ({}))) as Partial<Example>;
    const result = await promoteFeedback(
      site,
      decodeURIComponent(table),
      fbId,
      body,
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
