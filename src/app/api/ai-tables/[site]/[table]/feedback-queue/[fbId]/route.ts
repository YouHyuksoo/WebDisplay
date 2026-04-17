/**
 * @file src/app/api/ai-tables/[site]/[table]/feedback-queue/[fbId]/route.ts
 * @description 개별 피드백 기각(삭제). DELETE 만 지원.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { rejectFeedback } from '@/lib/ai-tables/feedback-queue';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = {
  params: Promise<{ site: string; table: string; fbId: string }>;
};

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { site, table, fbId } = await params;
    await rejectFeedback(site as SiteKey, decodeURIComponent(table), fbId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
