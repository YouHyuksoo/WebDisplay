/**
 * @file src/app/api/mxvc/data/route.ts
 * @description 선택된 LOG 테이블의 데이터를 날짜 조건으로 조회하는 API.
 * 초보자 가이드:
 * - 쿼리 파라미터: table(테이블명), from(시작일), to(종료일), dateCol(날짜 컬럼명)
 * - 테이블명은 화이트리스트(LOG_ 접두사) 검증으로 SQL Injection을 방지한다.
 * - 컬럼 메타데이터도 함께 반환하여 AG Grid에서 동적 컬럼을 생성할 수 있다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 테이블명 화이트리스트 검증: LOG_로 시작하고 영문/숫자/언더스코어만 허용 */
function isValidLogTable(name: string): boolean {
  return /^LOG_[A-Z0-9_]+$/i.test(name);
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

  if (!table || !isValidLogTable(table)) {
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
    console.error(`LOG 데이터 조회 실패 [${table}]:`, err);
    return NextResponse.json(
      { error: `데이터 조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
