/**
 * @file src/app/api/ai-tables/[site]/[table]/examples/[id]/route.ts
 * @description Example 단건 수정(PATCH) + 삭제(DELETE).
 *
 * 초보자 가이드:
 * - PATCH 는 기존 값과 patch 를 머지한 뒤 다시 validateExample 로 검증.
 * - DELETE 는 찾지 못해도 404 대신 200 + ok:true 반환 (idempotent).
 */

import { NextRequest, NextResponse } from 'next/server';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
import { validateExample } from '@/lib/ai-tables/validators';
import type { Example, SiteKey } from '@/lib/ai-tables/types';

type Params = { site: string; table: string; id: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { site, table, id } = await params;
  let patch: Partial<Example>;
  try {
    patch = (await req.json()) as Partial<Example>;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const tables = await loadTables();
  const meta = tables.sites[site as SiteKey]?.tables[table];
  if (!meta) {
    return NextResponse.json({ error: 'table not found' }, { status: 404 });
  }
  const ex = meta.examples?.find((x) => x.id === id);
  if (!ex) {
    return NextResponse.json({ error: 'example not found' }, { status: 404 });
  }

  const merged = { ...ex, ...patch };
  const v = validateExample(merged);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  Object.assign(ex, patch);
  meta.lastEditedAt = new Date().toISOString();
  await saveTables(tables);

  return NextResponse.json({ ok: true, example: ex });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { site, table, id } = await params;
  const tables = await loadTables();
  const meta = tables.sites[site as SiteKey]?.tables[table];
  if (!meta) {
    return NextResponse.json({ ok: true });
  }
  const before = meta.examples?.length ?? 0;
  meta.examples = (meta.examples ?? []).filter((x) => x.id !== id);
  if (meta.examples.length !== before) {
    meta.lastEditedAt = new Date().toISOString();
    await saveTables(tables);
  }
  return NextResponse.json({ ok: true });
}
