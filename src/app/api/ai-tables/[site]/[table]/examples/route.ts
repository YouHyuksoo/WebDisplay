/**
 * @file src/app/api/ai-tables/[site]/[table]/examples/route.ts
 * @description 특정 테이블의 Example 목록 조회(GET) + 추가(POST).
 *
 * 초보자 가이드:
 * - GET  → `{ examples: Example[] }` 반환. 테이블이 없으면 빈 배열.
 * - POST → 검증(validators.ts) 통과 시 nanoid(10) id + createdAt 부여 후 저장.
 *   - body.source 를 지정하지 않으면 'manual'. AI 초안 저장 시 'ai-draft' 명시.
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
import { validateExample } from '@/lib/ai-tables/validators';
import type { Example, SiteKey } from '@/lib/ai-tables/types';

type Params = { site: string; table: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { site, table } = await params;
  const tables = await loadTables();
  const meta = tables.sites[site as SiteKey]?.tables[table];
  return NextResponse.json({ examples: meta?.examples ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  const { site, table } = await params;
  let body: Partial<Example>;
  try {
    body = (await req.json()) as Partial<Example>;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const v = validateExample(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const tables = await loadTables();
  const meta = tables.sites[site as SiteKey]?.tables[table];
  if (!meta) {
    return NextResponse.json({ error: 'table not found' }, { status: 404 });
  }

  const ex: Example = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    source: 'manual',
    ...body,
    // 필수 필드가 Partial 로 들어올 수 있으니 validator 통과를 신뢰하고 단언
    kind: body.kind!,
    question: body.question!,
    why: body.why ?? '',
  } as Example;

  meta.examples = meta.examples ?? [];
  meta.examples.push(ex);
  meta.lastEditedAt = new Date().toISOString();
  await saveTables(tables);

  return NextResponse.json({ ok: true, example: ex });
}
