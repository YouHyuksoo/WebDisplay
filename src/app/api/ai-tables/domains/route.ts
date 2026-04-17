/**
 * @file src/app/api/ai-tables/domains/route.ts
 * @description 컬럼 도메인(column-domains.json) CRUD — GET/POST.
 *
 * 초보자 가이드:
 * - GET: 전체 도메인 파일 내용을 그대로 반환 ({ version, updatedAt, domains[] })
 * - POST: 신규 도메인 추가. id/name/members 필수, 중복 id 는 409.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { loadDomains, saveDomains } from '@/lib/ai-tables/store';
import type { ColumnDomain } from '@/lib/ai-tables/types';

export async function GET() {
  try {
    const d = await loadDomains();
    return NextResponse.json(d);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ColumnDomain;
    if (!body.id || !body.name || !Array.isArray(body.members)) {
      return NextResponse.json(
        { error: 'id, name, members(array) required' },
        { status: 400 },
      );
    }
    const data = await loadDomains();
    if (data.domains.find((d) => d.id === body.id)) {
      return NextResponse.json(
        { error: 'domain id already exists' },
        { status: 409 },
      );
    }
    data.domains.push(body);
    await saveDomains(data);
    return NextResponse.json({ ok: true, domain: body });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
