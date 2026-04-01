/**
 * @file src/app/api/u1/data/route.ts
 * @description 베트남U1 공정 테이블의 데이터를 날짜 조건으로 조회하는 API.
 * 초보자 가이드:
 * - 쿼리 파라미터: table(테이블명), from(시작일), to(종료일), dateCol(날짜 컬럼명)
 * - 테이블명은 U1 공정 화이트리스트로 검증하여 SQL Injection을 방지한다.
 * - 기본 active 프로필(베트남VD)을 사용하므로 executeQuery로 연결한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { U1_TABLES } from '../tables/route';

export const dynamic = 'force-dynamic';

/** U1 공정 테이블 화이트리스트 검증 */
function isValidU1Table(name: string): boolean {
  return (U1_TABLES as readonly string[]).includes(name.toUpperCase());
}

interface ColumnMeta {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const table = searchParams.get('table') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const dateCol = searchParams.get('dateCol') ?? '';
  const metaOnly = searchParams.get('metaOnly') === '1';

  if (!table || !isValidU1Table(table)) {
    return NextResponse.json(
      { error: '유효하지 않은 테이블명입니다' },
      { status: 400 },
    );
  }

  try {
    /* 1) 컬럼 메타 조회 */
    const columns = await executeQuery<ColumnMeta>(
      `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH
         FROM USER_TAB_COLUMNS
        WHERE TABLE_NAME = :tname
        ORDER BY COLUMN_ID`,
      { tname: table.toUpperCase() },
    );

    /* metaOnly=1이면 컬럼 메타만 반환 (데이터 조회 생략) */
    if (metaOnly) {
      return NextResponse.json({ columns, rows: [], total: 0 });
    }

    /* 2) 데이터 조회 (날짜 필터 선택적 적용) */
    let sql = `SELECT * FROM ${table.toUpperCase()}`;
    const binds: Record<string, string> = {};

    if (dateCol && from && to) {
      sql += ` WHERE ${dateCol} BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD') AND TO_DATE(:toDate, 'YYYY-MM-DD') + 0.99999`;
      binds.fromDate = from;
      binds.toDate = to;
    } else if (dateCol && from) {
      sql += ` WHERE ${dateCol} >= TO_DATE(:fromDate, 'YYYY-MM-DD')`;
      binds.fromDate = from;
    } else if (dateCol && to) {
      sql += ` WHERE ${dateCol} <= TO_DATE(:toDate, 'YYYY-MM-DD') + 0.99999`;
      binds.toDate = to;
    }

    sql += ` FETCH FIRST 5000 ROWS ONLY`;

    const rows = Object.keys(binds).length > 0
      ? await executeQuery(sql, binds)
      : await executeQuery(sql);

    return NextResponse.json({ columns, rows, total: rows.length });
  } catch (err) {
    console.error(`U1 데이터 조회 실패 [${table}]:`, err);
    return NextResponse.json(
      { error: `데이터 조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
