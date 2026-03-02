/**
 * @file route.ts
 * @description 라인별 생산현황 API (메뉴 26).
 * 초보자 가이드: GET /api/display/26?orgId=1&lines=S01,S02 로 호출하면
 * 해당 라인의 생산 KPI 목록(계획/목표/실적/달성률)을 반환한다.
 * lines 파라미터가 없거나 '%'이면 전체 라인 조회.
 * PB 원본: d_display_line_kpi_status
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlProductionKpiList, buildLineFilter } from '@/lib/queries/production-kpi';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds: lineBinds } = buildLineFilter(lineCodes);
  const binds = { orgId: Number(orgId), ...lineBinds };

  try {
    const lines = await executeQuery(sqlProductionKpiList(clause), binds);

    return NextResponse.json({
      lines,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/26] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', lines: [] },
      { status: 500 },
    );
  }
}
