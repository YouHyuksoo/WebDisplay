/**
 * @file route.ts
 * @description SMT 픽업률현황(BASE) API (메뉴 34).
 * 초보자 가이드: GET /api/display/34 로 호출하면
 * 라인별 SMT 픽업률(Takeup/Miss/Realize/PPM)과 NG 건수를 반환한다.
 * PB 원본: d_display_smt_pickup_rate_lst2_base, d_display_smt_pickup_rate_ng_count_ys_base
 *
 * [최적화] 기존에는 list SQL과 ngCount SQL을 Promise.all로 2번 실행했으나,
 * 동일한 복잡한 LAG 윈도우 함수가 중복 실행되어 DB 부하가 2배였음.
 * 이제 list 쿼리 1회만 실행하고, 결과에서 ITEM_WARNING_SIGN='S'인 행을 세어 ngCount를 계산.
 * 응답 형식(pickupList, ngCount, timestamp)은 기존과 동일하게 유지.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlSmtPickupRateBaseList } from '@/lib/queries/smt-pickup-rate-base';
import { countNgFromList } from '@/lib/display-helpers';

export async function GET() {
  try {
    const pickupList = await executeQuery<Record<string, unknown>>(
      sqlSmtPickupRateBaseList(),
    );

    /** list 결과에서 ITEM_WARNING_SIGN='S' 행 수를 세어 ngCount 계산 (DB 쿼리 1회 절약) */
    const ngCount = countNgFromList(pickupList);

    return NextResponse.json({
      pickupList,
      ngCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/34] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', pickupList: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
