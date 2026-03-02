/**
 * @file route.ts
 * @description SMT 픽업률현황(HEAD) API (메뉴 35).
 * 초보자 가이드: GET /api/display/35 로 호출하면
 * HEAD 아이템의 라인별 SMT 픽업률(Takeup/Miss/Realize/PPM)과 NG 건수를 반환한다.
 * PB 원본: d_display_smt_pickup_rate_lst2_head, d_display_smt_pickup_rate_ng_count_ys_head
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlSmtPickupRateHeadList,
  sqlSmtPickupRateHeadNgCount,
} from '@/lib/queries/smt-pickup-rate-head';

export async function GET() {
  try {
    const [pickupList, ngResult] = await Promise.all([
      executeQuery(sqlSmtPickupRateHeadList()),
      executeQuery<{ NG_COUNT: number }>(sqlSmtPickupRateHeadNgCount()),
    ]);

    return NextResponse.json({
      pickupList,
      ngCount: ngResult[0]?.NG_COUNT ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/35] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', pickupList: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
