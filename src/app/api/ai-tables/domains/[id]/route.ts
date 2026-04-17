/**
 * @file src/app/api/ai-tables/domains/[id]/route.ts
 * @description 단일 도메인 PATCH/DELETE.
 *
 * 초보자 가이드:
 * - PATCH: 전달된 필드만 머지. id/members 변경 가능 (원하면 프론트에서 제어).
 * - DELETE: 해당 id 제거. 어떤 members 컬럼에서도 그 도메인 설정이 사라지게 됨.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { loadDomains, saveDomains } from '@/lib/ai-tables/store';
import type { ColumnDomain } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const patch = (await req.json()) as Partial<ColumnDomain>;
    const data = await loadDomains();
    const d = data.domains.find((x) => x.id === id);
    if (!d) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    Object.assign(d, patch);
    await saveDomains(data);
    return NextResponse.json({ ok: true, domain: d });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const data = await loadDomains();
    const before = data.domains.length;
    data.domains = data.domains.filter((x) => x.id !== id);
    if (data.domains.length === before) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    await saveDomains(data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
