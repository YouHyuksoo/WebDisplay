/**
 * @file route.ts
 * @description SMD 듀얼생산현황 API (메뉴 27).
 * 초보자 가이드: GET /api/display/27?orgId=1&lines=S01,S02 로 호출하면
 * 해당 라인의 상세 생산현황 + 점검 항목 + NG 건수를 반환한다.
 * PB 원본: d_display_machine_status_single, d_display_machine_status_check_items_single_smd
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  buildLineFilter,
  sqlSmdDualProduction,
  sqlSmdDualNgCount,
} from '@/lib/queries/smd-dual-production';
import { sqlCheckItems } from '@/lib/queries/smd-production';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds: lineBinds } = buildLineFilter(lineCodes);
  const binds = { orgId: Number(orgId), ...lineBinds };

  try {
    const [productionList, checkItems, ngResult] = await Promise.all([
      executeQuery(sqlSmdDualProduction(clause), binds),
      executeQuery(sqlCheckItems(clause), binds),
      executeQuery<{ NG_COUNT: number }>(sqlSmdDualNgCount(clause), binds),
    ]);

    return NextResponse.json({
      productionList,
      checkItems,
      ngCount: ngResult[0]?.NG_COUNT ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/27] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', productionList: [], checkItems: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
