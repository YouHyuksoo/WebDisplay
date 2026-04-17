/**
 * @file src/app/api/ai-tables/[site]/[table]/columns/[col]/comment/route.ts
 * @description 컬럼 주석 DDL 실제 실행 + 이력 기록.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { executeCommentDdl } from '@/lib/ai-tables/ddl-executor';
import { syncSingleTable } from '@/lib/ai-tables/schema-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = {
  params: Promise<{ site: SiteKey; table: string; col: string }>;
};

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { site, table, col } = await params;
    const tableName = decodeURIComponent(table);
    const colName = decodeURIComponent(col);
    const { ddl, before, after } = (await req.json()) as {
      ddl: string;
      before: string | null;
      after: string;
    };
    const result = await executeCommentDdl(
      {
        table: tableName,
        column: colName,
        before: before ?? null,
        after: after ?? '',
      },
      ddl,
    );
    await syncSingleTable(site, tableName).catch(() => {});
    return NextResponse.json({ ok: true, historyFile: result.historyFile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
