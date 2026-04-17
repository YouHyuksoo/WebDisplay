/**
 * @file src/app/api/ai-tables/[site]/[table]/columns/[col]/route.ts
 * @description 컬럼 오버라이드 PATCH.
 *
 * 초보자 가이드:
 * - 요청 body: Partial<ColumnOverride>
 * - tables.json의 meta.columnOverrides[col] 와 merge. undefined 필드는 유지.
 */

import { NextResponse, type NextRequest } from 'next/server';
import os from 'os';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
import type { SiteKey, ColumnOverride } from '@/lib/ai-tables/types';

type Params = {
  params: Promise<{ site: string; table: string; col: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { site, table, col } = await params;
    const tableName = decodeURIComponent(table);
    const colName = decodeURIComponent(col);
    const patch = (await req.json()) as Partial<ColumnOverride>;

    const tables = await loadTables();
    const meta = tables.sites[site as SiteKey]?.tables[tableName];
    if (!meta) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    meta.columnOverrides ??= {};
    const current = meta.columnOverrides[colName] ?? {};
    meta.columnOverrides[colName] = { ...current, ...patch };
    meta.lastEditedAt = new Date().toISOString();
    meta.lastEditedBy = os.userInfo().username || 'unknown';

    await saveTables(tables);
    return NextResponse.json({
      ok: true,
      override: meta.columnOverrides[colName],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
