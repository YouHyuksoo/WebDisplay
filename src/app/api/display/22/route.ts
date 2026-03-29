/**
 * @file route.ts
 * @description 투입현황 API (메뉴 22, WORKSTAGE_CODE = 'W310').
 *
 * 초보자 가이드:
 * 1. GET /api/display/22?orgId=1&lines=A01 로 호출한다.
 * 2. 단일 라인의 오늘 계획, 시간대별 실적, 총 실적을 병렬 조회하여 반환한다.
 * 3. lines가 비어있거나 '%'이면 빈 응답을 반환 (단일 라인 전용).
 * 4. 시간대별 실적은 mapTimeZoneToGroup으로 2시간 묶음 6구간으로 그룹핑.
 * 5. PB 원본: w_display_product_io_status (W310)
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlProductPlan,
  sqlTimeZoneActual,
  sqlTotalActual,
  mapTimeZoneToGroup,
  getCurrentShift,
  TIME_LABELS,
} from '@/lib/queries/product-io-status';

/** WORKSTAGE_CODE — 투입 공정 */
const WORKSTAGE_CODE = 'W310';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '';
  const lineCode = linesParam.split(',').map((s) => s.trim()).filter(Boolean)[0] ?? '';

  /* 라인 미선택 시 빈 응답 */
  if (!lineCode || lineCode === '%') {
    return NextResponse.json({
      plan: null,
      timeZones: [0, 0, 0, 0, 0, 0],
      targets: [0, 0, 0, 0, 0, 0],
      totalActual: 0,
      timeLabels: TIME_LABELS[getCurrentShift()],
      shift: getCurrentShift(),
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const shift = getCurrentShift();
    const commonBinds = {
      lineCode,
      orgId: Number(orgId),
    };

    /* 3개 쿼리 병렬 실행 */
    const [planRows, tzRows, totalRows] = await Promise.all([
      executeQuery(sqlProductPlan(), commonBinds),
      executeQuery(sqlTimeZoneActual(), { ...commonBinds, workstageCode: WORKSTAGE_CODE }),
      executeQuery(sqlTotalActual(), { ...commonBinds, workstageCode: WORKSTAGE_CODE }),
    ]);

    /* 계획 데이터 (첫 번째 행) */
    const plan = (planRows as Record<string, unknown>[])[0] ?? null;

    /* 시간대별 실적 그룹핑 (6구간) */
    const timeZones = [0, 0, 0, 0, 0, 0];
    for (const row of tzRows as { WORK_TIME_ZONE: string; QTY: number }[]) {
      const idx = mapTimeZoneToGroup(row.WORK_TIME_ZONE);
      if (idx >= 0 && idx < 6) {
        timeZones[idx] += Number(row.QTY) || 0;
      }
    }

    /* 총 실적 */
    const totalActual = Number((totalRows as { TOTAL_QTY: number }[])[0]?.TOTAL_QTY) || 0;

    /* 목표 분배: PLAN_QTY ÷ 6 (나머지는 마지막 구간에) */
    const planQty = Number((plan as Record<string, unknown> | null)?.PLAN_QTY) || 0;
    const targets = [0, 0, 0, 0, 0, 0];
    if (planQty > 0) {
      const base = Math.floor(planQty / 6);
      const remainder = planQty - base * 6;
      for (let i = 0; i < 6; i++) {
        targets[i] = base + (i === 5 ? remainder : 0);
      }
    }

    return NextResponse.json({
      plan,
      timeZones,
      targets,
      totalActual,
      timeLabels: TIME_LABELS[shift],
      shift,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/22] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', plan: null },
      { status: 500 },
    );
  }
}
