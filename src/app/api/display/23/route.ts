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
  sqlCurrentShift,
  SHIFT_ZONES,
} from '@/lib/queries/product-io-status';

/** WORKSTAGE_CODE — 포장 공정 */
const WORKSTAGE_CODE = 'W220';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') ?? '1';
  const linesParam = searchParams.get('lines') ?? '';
  const lineCode = linesParam.split(',').map((s) => s.trim()).filter(Boolean)[0] ?? '';

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

    const commonBinds = { lineCode, orgId: Number(orgId) };

    /* 3개 쿼리 병렬 실행 */
    const [planRows, tzRows, totalRows] = await Promise.all([
      executeQuery(sqlProductPlan(), commonBinds),
      executeQuery(sqlTimeZoneActual(), { ...commonBinds, workstageCode: WORKSTAGE_CODE }),
      executeQuery(sqlTotalActual(), { ...commonBinds, workstageCode: WORKSTAGE_CODE }),
    ]);

    const plan = (planRows as Record<string, unknown>[])[0] ?? null;

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
      plan, timeZones, targets, totalActual,
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
