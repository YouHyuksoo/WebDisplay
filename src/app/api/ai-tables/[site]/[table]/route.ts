/**
 * @file src/app/api/ai-tables/[site]/[table]/route.ts
 * @description 단일 테이블 상세 조회·수정.
 *
 * 초보자 가이드:
 * - GET: meta (tables.json) + schema (schema-cache) + resolvedColumns (도메인 머지 결과) 반환
 * - PATCH: TableMeta의 특정 필드만 화이트리스트로 업데이트. lastEditedAt/By 자동 기록
 */

import { NextResponse, type NextRequest } from 'next/server';
import os from 'os';
import { loadTables, loadDomains, saveTables } from '@/lib/ai-tables/store';
import { getTableSchema } from '@/lib/ai-tables/schema-loader';
import { resolveColumn } from '@/lib/ai-tables/domain-resolver';
import type { SiteKey, TableMeta } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ site: SiteKey; table: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { site, table } = await params;
    const tableName = decodeURIComponent(table);
    const [tables, domains, schema] = await Promise.all([
      loadTables(),
      loadDomains(),
      getTableSchema(site, tableName),
    ]);
    const meta = tables.sites[site]?.tables[tableName];
    if (!meta || !schema) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    const resolvedColumns = schema.columns.map((c) =>
      resolveColumn(c, meta, domains.domains),
    );
    return NextResponse.json({ meta, schema, resolvedColumns });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

const ALLOWED_PATCH_FIELDS: Array<keyof TableMeta> = [
  'enabled',
  'tags',
  'summary',
  'keywords',
  'businessNotes',
  'defaultFilters',
  'joinPatterns',
  'relatedTables',
];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { site, table } = await params;
    const tableName = decodeURIComponent(table);
    const patch = (await req.json()) as Partial<TableMeta>;
    const tables = await loadTables();
    const meta = tables.sites[site]?.tables[tableName];
    if (!meta) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }

    for (const key of ALLOWED_PATCH_FIELDS) {
      if (key in patch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (meta as any)[key] = (patch as any)[key];
      }
    }
    meta.lastEditedAt = new Date().toISOString();
    meta.lastEditedBy = os.userInfo().username || 'unknown';

    await saveTables(tables);
    return NextResponse.json({ ok: true, meta });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
