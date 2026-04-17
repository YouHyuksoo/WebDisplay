/**
 * @file src/app/api/ai-tables/[site]/[table]/examples/[id]/run/route.ts
 * @description Example SQL 라이브 프리뷰 (POST).
 *
 * 초보자 가이드:
 * - body: `{ bindings?: Record<string, string|number> }`
 * - exact 는 sql, template/skeleton 은 sqlTemplate 을 사용.
 * - ROWNUM ≤ 10 을 자동 주입 (이미 있으면 건드리지 않음).
 * - SELECT/WITH 로 시작하지 않으면 400.
 * - site 가 'default' 가 아니면 `executeQueryByProfile(site, ...)` 로 보조 풀 사용.
 * - oracledb 바인드(`:name`) 그대로 전달 → SQL 주입 방지.
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadTables } from '@/lib/ai-tables/store';
import { executeQuery, executeQueryByProfile } from '@/lib/db';
import type { SiteKey } from '@/lib/ai-tables/types';

type Params = { site: string; table: string; id: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { site, table, id } = await params;
  const body = await req.json().catch(() => ({})) as {
    bindings?: Record<string, string | number>;
  };
  const bindings = body.bindings ?? {};

  const tables = await loadTables();
  const meta = tables.sites[site as SiteKey]?.tables[table];
  if (!meta) {
    return NextResponse.json({ error: 'table not found' }, { status: 404 });
  }
  const ex = meta.examples?.find((e) => e.id === id);
  if (!ex) {
    return NextResponse.json({ error: 'example not found' }, { status: 404 });
  }

  let sql = (ex.sql ?? ex.sqlTemplate ?? '').trim();
  if (!sql) {
    return NextResponse.json({ error: 'no sql' }, { status: 400 });
  }

  // SELECT/WITH 만
  if (!/^(SELECT|WITH)\b/i.test(sql)) {
    return NextResponse.json({ error: 'only SELECT/WITH allowed' }, { status: 400 });
  }
  // 끝의 세미콜론 제거 (서브쿼리 래핑 시 문제)
  sql = sql.replace(/;+\s*$/, '');

  // ROWNUM ≤ 10 자동 주입
  if (!/\bROWNUM\s*<=?\s*\d+/i.test(sql)) {
    sql = `SELECT * FROM (${sql}) WHERE ROWNUM <= 10`;
  }

  const started = Date.now();
  try {
    const rows =
      site === 'default'
        ? await executeQuery<Record<string, unknown>>(sql, bindings)
        : await executeQueryByProfile<Record<string, unknown>>(
            site,
            sql,
            bindings,
          );
    const columns = rows[0]
      ? Object.keys(rows[0]).map((n) => ({ name: n }))
      : [];
    return NextResponse.json({
      ok: true,
      renderedSql: sql,
      rows,
      columns,
      elapsedMs: Date.now() - started,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        renderedSql: sql,
        elapsedMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
