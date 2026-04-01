/**
 * @file src/app/api/mxvc/tables/route.ts
 * @description LOG_ 로 시작하는 Oracle 테이블 목록을 반환하는 API.
 * 초보자 가이드:
 * - USER_TABLES 뷰에서 LOG_ 접두사 테이블을 조회한다.
 */
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TableInfo {
  TABLE_NAME: string;
  COMMENTS: string | null;
}

export async function GET() {
  try {
    const tables = await executeQuery<TableInfo>(
      `SELECT T.TABLE_NAME, C.COMMENTS
         FROM USER_TABLES T
         LEFT JOIN USER_TAB_COMMENTS C ON T.TABLE_NAME = C.TABLE_NAME
        WHERE T.TABLE_NAME LIKE 'LOG\\_%' ESCAPE '\\'
        ORDER BY T.TABLE_NAME`,
    );
    return NextResponse.json({ tables });
  } catch (err) {
    console.error('LOG 테이블 목록 조회 실패:', err);
    return NextResponse.json(
      { error: '테이블 목록을 불러올 수 없습니다' },
      { status: 500 },
    );
  }
}
