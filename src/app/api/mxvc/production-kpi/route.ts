/**
 * @file src/app/api/mxvc/production-kpi/route.ts
 * @description 멕시코전장 라인별 생산현황 API.
 * 초보자 가이드: GET /api/mxvc/production-kpi?orgId=1&lines=01,02 로 호출하면
 * 해당 라인의 생산 KPI 목록(계획/목표/실적/달성률)을 반환한다.
 * lines 파라미터가 없거나 '%'이면 전체 라인 조회.
 * IRPT_PRODUCT_LINE_TARGET_MONITORING 뷰 사용:
 *   - TARGET_QTY: F_GET_ASSEMBLY_TARGET_BY_FIX
 *   - OUTPUT_QTY: F_GET_HW_VW_LTS_BOARD (한화 DBLINK 당일 주간 실적)
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlMxvcProductionKpiList, buildLineFilter } from '@/lib/queries/production-kpi';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds: lineBinds } = buildLineFilter(lineCodes);
  const binds = { orgId: Number(orgId), ...lineBinds };

  try {
    const lines = await executeQuery(sqlMxvcProductionKpiList(clause), binds);

    return NextResponse.json({
      lines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /mxvc/production-kpi] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', lines: [] },
      { status: 500 },
    );
  }
}
