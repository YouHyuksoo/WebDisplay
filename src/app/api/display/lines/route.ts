/**
 * @file route.ts
 * @description 라인 목록 조회 API. ip_product_line 테이블에서 라인 목록을 반환.
 * 초보자 가이드:
 * - GET /api/display/lines?orgId=1 로 호출하면 해당 조직의 라인 목록을 반환한다.
 * - 응답에 lines(플랫 목록)과 groups(line_product_division_name별 그룹) 모두 포함.
 * PB 원본: w_line_multi_select_flat_smd.srw 의 ip_product_line 조회 SQL 참조.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const SQL_LINE_LIST = `
SELECT
  line_code                  AS "lineCode",
  line_name                  AS "lineName",
  mes_display_sequence       AS "sequence",
  line_product_division      AS "divisionName"
FROM ip_product_line
WHERE organization_id = :orgId
ORDER BY line_product_division, mes_display_sequence
`;

interface LineRow {
  lineCode: string;
  lineName: string;
  sequence: number;
  divisionName: string;
}

export interface LineGroup {
  division: string;
  lines: { lineCode: string; lineName: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';

  try {
    const lines = await executeQuery<LineRow>(SQL_LINE_LIST, {
      orgId: Number(orgId),
    });

    /* 그룹별로 묶기 */
    const groupMap = new Map<string, { lineCode: string; lineName: string }[]>();
    for (const row of lines) {
      const div = row.divisionName || 'ETC';
      if (!groupMap.has(div)) groupMap.set(div, []);
      groupMap.get(div)!.push({ lineCode: row.lineCode, lineName: row.lineName });
    }

    const groups: LineGroup[] = [];
    for (const [division, items] of groupMap) {
      groups.push({ division, lines: items });
    }

    return NextResponse.json({ lines, groups });
  } catch (error) {
    console.error('[API /display/lines] Error:', error);
    return NextResponse.json({ error: 'Database query failed', lines: [], groups: [] }, { status: 500 });
  }
}
