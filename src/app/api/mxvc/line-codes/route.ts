/**
 * @file src/app/api/mxvc/line-codes/route.ts
 * @description 선택된 LOG_ 테이블의 DISTINCT LINE_CODE 목록을 조회하는 API.
 * 초보자 가이드:
 * - table 파라미터로 테이블명을 받아 해당 테이블에 LINE_CODE 컬럼이 있으면 고유값 목록을 반환
 * - LINE_CODE 컬럼이 없는 테이블이면 빈 배열 반환
 * - SQL Injection 방지를 위해 테이블명은 LOG_ 접두사 화이트리스트 검증
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isValidLogTable(name: string): boolean {
  return /^LOG_[A-Z0-9_]+$/i.test(name);
}

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get('table') ?? '';

  if (!table || !isValidLogTable(table)) {
    return NextResponse.json({ lineCodes: [] });
  }

  try {
    /* LINE_CODE 컬럼 존재 여부 확인 */
    const colCheck = await executeQuery<{ CNT: number }>(
      `SELECT COUNT(*) AS CNT FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME = :tname AND COLUMN_NAME = 'LINE_CODE'`,
      { tname: table.toUpperCase() },
    );

    if (Number(colCheck[0]?.CNT ?? 0) === 0) {
      return NextResponse.json({ lineCodes: [] });
    }

    /* DISTINCT LINE_CODE 조회 */
    const rows = await executeQuery<{ LINE_CODE: string }>(
      `SELECT DISTINCT LINE_CODE FROM ${table.toUpperCase()}
        WHERE LINE_CODE IS NOT NULL ORDER BY LINE_CODE`,
    );

    return NextResponse.json({
      lineCodes: rows.map((r) => r.LINE_CODE),
    });
  } catch (err) {
    console.error('LINE_CODE 조회 실패:', err);
    return NextResponse.json({ lineCodes: [] });
  }
}
