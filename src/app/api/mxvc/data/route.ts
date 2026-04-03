/**
 * @file src/app/api/mxvc/data/route.ts
 * @description 선택된 LOG 테이블의 데이터를 날짜 조건으로 조회하는 API.
 * 초보자 가이드:
 * - 쿼리 파라미터: table(테이블명), from(시작일), to(종료일), dateCol(날짜 컬럼명)
 * - page/pageSize: 서버 사이드 페이지네이션 (Oracle ROWNUM 패턴)
 * - exportAll=1: 엑셀 다운로드용 전체 데이터 조회 (페이지네이션 무시)
 * - metaOnly=1: 컬럼 메타데이터만 반환 (데이터 조회 생략)
 * - 테이블명은 화이트리스트(LOG_ 접두사) 검증으로 SQL Injection을 방지한다.
 * - dateCol은 USER_TAB_COLUMNS 메타로 존재 여부를 검증한다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** 테이블명 화이트리스트 검증: LOG_로 시작하고 영문/숫자/언더스코어만 허용 */
function isValidLogTable(name: string): boolean {
  return /^LOG_[A-Z0-9_]+$/i.test(name);
}

/** 컬럼명 검증: 영문/숫자/언더스코어만 허용 */
function isValidColumn(name: string): boolean {
  return /^[A-Z0-9_]+$/i.test(name);
}

interface ColumnMeta {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number;
}

/** BigInt, Lob, Date 등 JSON 직렬화 불가 타입을 안전하게 변환 */
function sanitizeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const safe: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      if (val == null) {
        safe[key] = val;
      } else if (typeof val === 'bigint') {
        safe[key] = Number.isSafeInteger(Number(val)) ? Number(val) : String(val);
      } else if (val instanceof Date) {
        safe[key] = val.toISOString();
      } else if (Buffer.isBuffer(val)) {
        safe[key] = val.toString('base64');
      } else if (typeof val === 'object' && val.constructor?.name === 'Lob') {
        safe[key] = '[LOB]';
      } else {
        try { JSON.stringify(val); safe[key] = val; } catch { safe[key] = String(val); }
      }
    }
    return safe;
  });
}

/** 컬럼 목록을 원하는 순서로 정렬: LOG_ID, LOGTIMESTAMP → ... → LINE_CODE, EQUIPMENT_ID → ... → FILE_NAME(맨뒤) */
function orderColumns(cols: ColumnMeta[]): ColumnMeta[] {
  const FRONT = ['LOG_ID', 'LOGTIMESTAMP'];
  const BEFORE_EQP = ['LINE_CODE'];
  const TAIL = ['FILE_NAME'];
  const special = new Set([...FRONT, ...BEFORE_EQP, ...TAIL]);

  const front = FRONT.map((n) => cols.find((c) => c.COLUMN_NAME === n)).filter(Boolean) as ColumnMeta[];
  const tail = TAIL.map((n) => cols.find((c) => c.COLUMN_NAME === n)).filter(Boolean) as ColumnMeta[];
  const rest = cols.filter((c) => !special.has(c.COLUMN_NAME));

  /* LINE_CODE를 EQUIPMENT_ID 바로 앞에 삽입 */
  const lineCode = cols.find((c) => c.COLUMN_NAME === 'LINE_CODE');
  if (lineCode) {
    const eqpIdx = rest.findIndex((c) => c.COLUMN_NAME === 'EQUIPMENT_ID');
    if (eqpIdx !== -1) {
      rest.splice(eqpIdx, 0, lineCode);
    } else {
      rest.push(lineCode);
    }
  }

  return [...front, ...rest, ...tail];
}

/** 정렬된 컬럼명으로 SELECT 절 생성 */
function buildSelectList(orderedCols: ColumnMeta[]): string {
  return orderedCols.map((c) => c.COLUMN_NAME).join(', ');
}

/** 날짜 WHERE 절 빌드 */
function buildDateClause(
  dateCol: string,
  from: string,
  to: string,
): { clause: string; binds: Record<string, string> } {
  const binds: Record<string, string> = {};
  if (dateCol && from && to) {
    binds.fromDate = from;
    binds.toDate = to;
    return { clause: ` WHERE ${dateCol} BETWEEN TO_DATE(:fromDate, 'YYYY-MM-DD') AND TO_DATE(:toDate, 'YYYY-MM-DD') + 0.99999`, binds };
  }
  if (dateCol && from) {
    binds.fromDate = from;
    return { clause: ` WHERE ${dateCol} >= TO_DATE(:fromDate, 'YYYY-MM-DD')`, binds };
  }
  if (dateCol && to) {
    binds.toDate = to;
    return { clause: ` WHERE ${dateCol} <= TO_DATE(:toDate, 'YYYY-MM-DD') + 0.99999`, binds };
  }
  return { clause: '', binds };
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const table = searchParams.get('table') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const dateCol = searchParams.get('dateCol') ?? '';
  const metaOnly = searchParams.get('metaOnly') === '1';
  const exportAll = searchParams.get('exportAll') === '1';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(200, Math.max(10, Number(searchParams.get('pageSize') ?? '100')));

  if (!table || !isValidLogTable(table)) {
    return NextResponse.json(
      { error: '유효하지 않은 테이블명입니다' },
      { status: 400 },
    );
  }

  if (dateCol && !isValidColumn(dateCol)) {
    return NextResponse.json(
      { error: '유효하지 않은 컬럼명입니다' },
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

    /* 컬럼 순서 정렬 */
    const ordered = orderColumns(columns);
    const selectList = buildSelectList(ordered);

    if (metaOnly) {
      return NextResponse.json({ columns: ordered, rows: [], total: 0, page: 1, pageSize, totalPages: 0 });
    }

    /* 2) 날짜 조건 빌드 */
    const validDateCol = dateCol && columns.some((c) => c.COLUMN_NAME === dateCol.toUpperCase());
    const { clause: whereClause, binds } = validDateCol
      ? buildDateClause(dateCol.toUpperCase(), from, to)
      : { clause: '', binds: {} as Record<string, string> };

    const upperTable = table.toUpperCase();

    /* 3-A) 엑셀 전체 다운로드 모드 */
    if (exportAll) {
      const sql = `SELECT ${selectList} FROM ${upperTable}${whereClause}`;
      const rows = await executeQuery(sql, binds);
      return NextResponse.json({ columns: ordered, rows: sanitizeRows(rows as Record<string, unknown>[]), total: rows.length, page: 1, pageSize: rows.length, totalPages: 1 });
    }

    /* 3-B) 서버 사이드 페이지네이션 */
    const startRow = (page - 1) * pageSize;
    const endRow = page * pageSize;

    const [countResult, rows] = await Promise.all([
      executeQuery<{ CNT: number }>(
        `SELECT COUNT(*) AS CNT FROM ${upperTable}${whereClause}`,
        binds,
      ),
      executeQuery(
        `SELECT ${selectList} FROM (
          SELECT A.*, ROWNUM AS RNUM FROM (
            SELECT ${selectList} FROM ${upperTable}${whereClause}
          ) A
          WHERE ROWNUM <= :endRow
        )
        WHERE RNUM > :startRow`,
        { ...binds, startRow, endRow },
      ),
    ]);

    const total = countResult[0]?.CNT ?? 0;

    return NextResponse.json({
      columns: ordered,
      rows: sanitizeRows(rows as Record<string, unknown>[]),
      total: typeof total === 'bigint' ? Number(total) : total,
      page,
      pageSize,
      totalPages: Math.ceil(Number(total) / pageSize),
    });
  } catch (err) {
    console.error(`LOG 데이터 조회 실패 [${table}]:`, err);
    return NextResponse.json(
      { error: `데이터 조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
