/**
 * @file route.ts
 * @description 종합F/P현황 API (메뉴 25).
 * 초보자 가이드: GET /api/display/25?orgId=1&lines=S01,S02 로 호출하면
 * 해당 라인의 Foolproof 점검 항목 상태를 반환한다.
 * lines 파라미터가 없거나 '%'이면 전체 라인 조회.
 * PB 원본: d_display_machine_foolproof_status_check_items
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlCheckItems, buildLineFilter } from '@/lib/queries/smd-production';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds: lineBinds } = buildLineFilter(lineCodes);
  const binds = { orgId: Number(orgId), ...lineBinds };

  try {
    const rows = await executeQuery(sqlCheckItems(clause), binds);

    return NextResponse.json({
      rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/25] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', rows: [] },
      { status: 500 },
    );
  }
}
