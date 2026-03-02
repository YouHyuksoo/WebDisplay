/**
 * @file route.ts
 * @description SMD 생산현황 API (메뉴 24).
 * 초보자 가이드: GET /api/display/24?orgId=1&lines=S01,S02 로 호출하면
 * 해당 라인의 SMD 점검 항목과 생산현황을 반환한다.
 * lines 파라미터가 없거나 '%'이면 전체 라인 조회.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  buildLineFilter,
  sqlCheckItems,
  sqlSmdProduction,
} from '@/lib/queries/smd-production';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '%';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);

  const { clause, binds: lineBinds } = buildLineFilter(lineCodes);
  const binds = { orgId: Number(orgId), ...lineBinds };

  try {
    const [checkItems, smdProduction] = await Promise.all([
      executeQuery(sqlCheckItems(clause), binds),
      executeQuery(sqlSmdProduction(clause), binds),
    ]);

    return NextResponse.json({
      checkItems,
      smdProduction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/24] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', checkItems: [], smdProduction: [] },
      { status: 500 },
    );
  }
}
