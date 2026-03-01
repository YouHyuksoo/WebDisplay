/**
 * @file route.ts
 * @description Solder Paste Warning List API (메뉴 31).
 * 초보자 가이드: GET /api/display/31 로 호출하면
 * 솔더 페이스트 경고 목록과 NG 건수를 반환한다.
 * PB 원본: d_display_solder_waring_list_duckil3, d_display_solder_waring_ng_count2
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sqlSolderWarningList, sqlSolderNgCount } from '@/lib/queries/solder-warning';

/** Promise를 제한 시간 내에 완료하도록 래핑 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 타임아웃 (${ms}ms)`)), ms),
    ),
  ]);
}

export async function GET() {
  try {
    const [warningList, ngCountResult] = await Promise.all([
      withTimeout(executeQuery(sqlSolderWarningList()), 15000, 'warningList'),
      withTimeout(executeQuery<{ NG_COUNT: number }>(sqlSolderNgCount()), 15000, 'ngCount'),
    ]);

    const ngCount = ngCountResult[0]?.NG_COUNT ?? 0;

    return NextResponse.json({
      warningList,
      ngCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[API /display/31] Error:', msg);
    return NextResponse.json(
      { error: msg, warningList: [], ngCount: 0 },
      { status: 500 },
    );
  }
}
