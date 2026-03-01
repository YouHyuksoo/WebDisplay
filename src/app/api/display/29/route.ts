/**
 * @file route.ts
 * @description MSL Warning List API (메뉴 29).
 * 초보자 가이드: GET /api/display/29?orgId=1 로 호출하면
 * MSL 경고 아이템 목록과 NG 건수를 반환한다.
 * PB 원본: d_display_msl_waring_list, d_display_msl_waring_ng_count
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlMslWarningList, sqlMslNgCount } from '@/lib/queries/msl-warning-list';

export async function GET() {
  try {
    const [warningList, ngCountResult] = await Promise.all([
      executeQuery(sqlMslWarningList()),
      executeQuery<{ NG_COUNT: number }>(sqlMslNgCount()),
    ]);

    const ngCount = ngCountResult[0]?.NG_COUNT ?? 0;

    return NextResponse.json({
      warningList,
      ngCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/29] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', warningList: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
