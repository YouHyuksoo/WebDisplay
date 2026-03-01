/**
 * @file route.ts
 * @description 라인 목록 조회 API. ip_product_line 테이블에서 라인 목록을 반환.
 * 초보자 가이드: GET /api/display/lines?orgId=1 로 호출하면 해당 조직의 SMD 라인 목록을 반환한다.
 * PB 원본: w_line_multi_select_flat_smd.srw 의 ip_product_line 조회 SQL 참조.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const SQL_LINE_LIST = `
SELECT
  line_code              AS "lineCode",
  line_name              AS "lineName",
  mes_display_sequence   AS "sequence"
FROM ip_product_line
WHERE organization_id = :orgId
ORDER BY mes_display_sequence
`;

interface LineRow {
  lineCode: string;
  lineName: string;
  sequence: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';

  try {
    const lines = await executeQuery<LineRow>(SQL_LINE_LIST, {
      orgId: Number(orgId),
    });

    return NextResponse.json({ lines });
  } catch (error) {
    console.error('[API /display/lines] Error:', error);
    return NextResponse.json({ error: 'Database query failed', lines: [] }, { status: 500 });
  }
}
