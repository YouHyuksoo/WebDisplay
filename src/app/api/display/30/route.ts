/**
 * @file route.ts
 * @description MSL Warning List 출고기준 API (메뉴 30).
 * 초보자 가이드: GET /api/display/30 으로 호출하면
 * 출고 기준 MSL 경고 아이템 목록과 NG 건수를 반환한다.
 * PB 원본: d_display_msl_waring_list_issue_item, d_display_msl_waring_ng_count_issue_item
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import {
  sqlMslWarningIssueList,
  sqlMslWarningIssueNgCount,
} from '@/lib/queries/msl-warning-issue';

export async function GET() {
  try {
    const [warningList, ngCountResult] = await Promise.all([
      executeQuery(sqlMslWarningIssueList()),
      executeQuery<{ NG_COUNT: number }>(sqlMslWarningIssueNgCount()),
    ]);

    const ngCount = ngCountResult[0]?.NG_COUNT ?? 0;

    return NextResponse.json({
      warningList,
      ngCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /display/30] Error:', error);
    return NextResponse.json(
      { error: 'Database query failed', warningList: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
