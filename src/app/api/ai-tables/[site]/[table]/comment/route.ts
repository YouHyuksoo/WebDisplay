/**
 * @file src/app/api/ai-tables/[site]/[table]/comment/route.ts
 * @description 테이블 주석 DDL 실제 실행.
 *
 * 초보자 가이드:
 * - 요청 body: { ddl, before, after }
 * - 처리 순서: validateCommentDdl → executeDml → 이력 파일 작성 → syncSingleTable
 */

import { NextResponse, type NextRequest } from 'next/server';
import { executeCommentDdl } from '@/lib/ai-tables/ddl-executor';
import { syncSingleTable } from '@/lib/ai-tables/schema-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ site: SiteKey; table: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { site, table } = await params;
    const tableName = decodeURIComponent(table);
    const { ddl, before, after } = (await req.json()) as {
      ddl: string;
      before: string | null;
      after: string;
    };
    const result = await executeCommentDdl(
      { table: tableName, before: before ?? null, after: after ?? '' },
      ddl,
    );
    // 주석만 바뀌었으므로 부분 재sync (해당 테이블만)
    await syncSingleTable(site, tableName).catch(() => {});
    return NextResponse.json({ ok: true, historyFile: result.historyFile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
