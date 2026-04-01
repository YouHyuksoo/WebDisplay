/**
 * @file route.ts
 * @description 포장현황 API (메뉴 23, WORKSTAGE_CODE = 'W220').
 *
 * 초보자 가이드:
 * 1. GET /api/display/23?orgId=1&lines=A01 로 호출한다.
 * 2. 단일 라인의 오늘 계획, 시간대별 실적, 총 실적을 병렬 조회하여 반환한다.
 * 3. lines가 비어있거나 '%'이면 빈 응답을 반환 (단일 라인 전용).
 * 4. 시간대별 실적은 mapTimeZoneToGroup으로 2시간 묶음 6구간으로 그룹핑.
 * 5. PB 원본: w_display_product_io_status (W220)
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlProductPlan,
  sqlTimeZoneActual,
  sqlTotalActual,
  sqlModelActuals,
  sqlCurrentShift,
  SHIFT_ZONES,
} from '@/lib/queries/product-io-status';

/** WORKSTAGE_CODE — 포장 공정 */
const WORKSTAGE_CODE = 'W220';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '';
  const lineCodes = linesParam.split(',').map((s) => s.trim()).filter(Boolean);
  const lineCode = lineCodes[lineCodes.length - 1] ?? '';

  /* 라인 미선택 시 빈 응답 */
  if (!lineCode || lineCode === '%') {
    const zones = SHIFT_ZONES.A;
    return NextResponse.json({
      plan: null, timeZones: zones.map(() => 0), targets: zones.map(() => 0),
      totalActual: 0, zoneLabels: zones.map((z) => z.zone), timeLabels: zones.map((z) => z.label),
      shift: 'A', timestamp: new Date().toISOString(),
    });
  }

  try {
    /* 서버 시간 기준 shift/작업일 조회 */
    const shiftRows = await executeQuery<{ SHIFT_CODE: string; WORK_DATE: string }>(sqlCurrentShift(), {});
    const shift = shiftRows[0]?.SHIFT_CODE ?? 'A';
    const zones = SHIFT_ZONES[shift] ?? SHIFT_ZONES.A;
    const zoneCount = zones.length;

    const planBinds = { lineCode, orgId: Number(orgId), shift };
    const ioBinds = { lineCode, orgId: Number(orgId), workstageCode: WORKSTAGE_CODE };

    /* 5개 쿼리 병렬 실행 */
    const [planRows, tzRows, totalRows, modelRows, lineNameRows] = await Promise.all([
      executeQuery(sqlProductPlan(), planBinds),
      executeQuery(sqlTimeZoneActual(), ioBinds),
      executeQuery(sqlTotalActual(), ioBinds),
      executeQuery(sqlModelActuals(), ioBinds),
      executeQuery<{ LINE_NAME: string }>(`SELECT F_GET_LINE_NAME(:lineCode, 1) AS LINE_NAME FROM DUAL`, { lineCode }),
    ]);

    const allPlans = planRows as Record<string, unknown>[];
    const plan = allPlans[0] ?? null;
    const lineName = lineNameRows[0]?.LINE_NAME ?? lineCode;

    /* 해당 라인/일자의 모든 계획 PLAN_QTY 합계 */
    const totalPlanQty = allPlans.reduce((sum, r) => sum + (Number(r.PLAN_QTY) || 0), 0);
    if (plan) {
      plan.LINE_NAME = plan.LINE_NAME ?? lineName;
      plan.PLAN_QTY = totalPlanQty;
    }

    /* 시간대별 실적 — TIME_SLOT(A~E) → 인덱스 매핑 */
    const slotMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };
    const timeZones = new Array(zoneCount).fill(0);
    for (const row of tzRows as { TIME_SLOT: string; QTY: number }[]) {
      const idx = slotMap[row.TIME_SLOT];
      if (idx != null && idx < zoneCount) {
        timeZones[idx] += Number(row.QTY) || 0;
      }
    }

    const totalActual = Number((totalRows as { TOTAL_QTY: number }[])[0]?.TOTAL_QTY) || 0;

    /* 목표 균등 분배 */
    const planQty = Number((plan as Record<string, unknown> | null)?.PLAN_QTY) || 0;
    const targets = new Array(zoneCount).fill(0);
    if (planQty > 0) {
      const base = Math.floor(planQty / zoneCount);
      const remainder = planQty - base * zoneCount;
      for (let i = 0; i < zoneCount; i++) {
        targets[i] = base + (i === zoneCount - 1 ? remainder : 0);
      }
    }

    return NextResponse.json({
      plan, lineName, timeZones, targets, totalActual,
      models: modelRows,
      zoneLabels: zones.map((z) => z.zone),
      timeLabels: zones.map((z) => z.label),
      shift, timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/23] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', plan: null },
      { status: 500 },
    );
  }
}
