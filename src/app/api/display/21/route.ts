/**
 * @file route.ts
 * @description 제품생산현황 API (메뉴 21).
 * 초보자 가이드: GET /api/display/21?orgId=1&lines=A01,A02 로 호출하면
 * 해당 라인의 제품 생산현황(시간대별 실적, 목표수량, 달성률)을 반환한다.
 * lines 파라미터가 없거나 '%'이면 전체 라인 조회.
 * PB 원본: d_display_assy_product_status_lst2
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlAssyProductionList, buildLineFilter } from '@/lib/queries/assy-production-status';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds: lineBinds } = buildLineFilter(lineCodes);
  const binds = { orgId: Number(orgId), ...lineBinds };

  try {
    const rows = await executeQuery(sqlAssyProductionList(clause), binds);

    return NextResponse.json({
      rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/21] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', rows: [] },
      { status: 500 },
    );
  }
}
