/**
 * @file src/app/api/ai-tables/[site]/[table]/feedback-queue/route.ts
 * @description 특정 테이블의 승격 대기 피드백 목록 GET.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { loadTables } from '@/lib/ai-tables/store';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ site: string; table: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { site, table } = await params;
    const tableName = decodeURIComponent(table);
    const data = await loadTables();
    const meta = data.sites[site as SiteKey]?.tables[tableName];
    return NextResponse.json({ queue: meta?.feedbackQueue ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
