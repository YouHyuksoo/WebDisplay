/**
 * @file src/app/api/mxvc/ict/route.ts
 * @description LOG_ICT 마스터-디테일 전용 API.
 * 초보자 가이드:
 * - mode=master: EQUIPMENT_ID + BARCODE + FILE_NAME 으로 GROUP BY한 마스터 데이터 반환
 * - mode=detail: 특정 EQUIPMENT_ID + BARCODE + FILE_NAME 의 스텝별 상세 데이터 반환
 * - 날짜 필터는 마스터 모드에서만 사용 (LOG_TIMESTAMP 기준)
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** datetime-local 값(YYYY-MM-DDTHH:MM) → Oracle 바인드용 문자열 */
function normalizeDt(val: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val + ' 00:00';
  return val.replace('T', ' ');
}

const DT_FMT = `'YYYY-MM-DD HH24:MI'`;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get('mode') ?? 'master';

  try {
    if (mode === 'detail') {
      return handleDetail(sp);
    }
    return handleMaster(sp);
  } catch (err) {
    console.error('LOG_ICT API 오류:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}

/** 마스터: EQUIPMENT_ID + BARCODE + FILE_NAME 그룹핑 */
async function handleMaster(sp: URLSearchParams) {
  const from = sp.get('from') ?? '';
  const to = sp.get('to') ?? '';
  const lineCodeParam = sp.get('lineCode') ?? '';
  const page = Math.max(1, Number(sp.get('page') ?? '1'));
  const pageSize = Math.min(200, Math.max(10, Number(sp.get('pageSize') ?? '100')));

  /* 날짜 WHERE 절 */
  const binds: Record<string, string | number> = {};
  let where = '';
  if (from && to) {
    binds.fromDate = normalizeDt(from);
    binds.toDate = normalizeDt(to);
    where = ` WHERE LOG_TIMESTAMP BETWEEN TO_DATE(:fromDate, ${DT_FMT}) AND TO_DATE(:toDate, ${DT_FMT})`;
  } else if (from) {
    binds.fromDate = normalizeDt(from);
    where = ` WHERE LOG_TIMESTAMP >= TO_DATE(:fromDate, ${DT_FMT})`;
  } else if (to) {
    binds.toDate = normalizeDt(to);
    where = ` WHERE LOG_TIMESTAMP <= TO_DATE(:toDate, ${DT_FMT})`;
  }

  /* LINE_CODE 조건 추가 */
  if (lineCodeParam) {
    binds.lineCode = lineCodeParam;
    where += where ? ' AND LINE_CODE = :lineCode' : ' WHERE LINE_CODE = :lineCode';
  }

  const groupSql = `
    SELECT EQUIPMENT_ID, BARCODE, FILE_NAME,
           MIN(LINE_CODE) AS LINE_CODE,
           MIN(LOG_TIMESTAMP) AS FIRST_TIME,
           MAX(BOARD) AS BOARD,
           MAX(LOG_TYPE) AS LOG_TYPE,
           MAX(IS_LAST) AS IS_LAST,
           MAX(IS_SAMPLE) AS IS_SAMPLE,
           COUNT(*) AS STEP_COUNT
      FROM LOG_ICT${where}
     GROUP BY EQUIPMENT_ID, BARCODE, FILE_NAME`;

  const countSql = `SELECT COUNT(*) AS CNT FROM (${groupSql})`;
  const startRow = (page - 1) * pageSize;
  const endRow = page * pageSize;

  const pageSql = `
    SELECT * FROM (
      SELECT A.*, ROWNUM AS RNUM FROM (
        ${groupSql} ORDER BY FIRST_TIME DESC
      ) A WHERE ROWNUM <= :endRow
    ) WHERE RNUM > :startRow`;

  const [countRes, rows] = await Promise.all([
    executeQuery<{ CNT: number }>(countSql, binds),
    executeQuery(pageSql, { ...binds, startRow, endRow }),
  ]);

  const total = Number(countRes[0]?.CNT ?? 0);

  return NextResponse.json({
    rows: sanitize(rows as Record<string, unknown>[]),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/** 디테일: 특정 바코드+파일의 스텝별 데이터 */
async function handleDetail(sp: URLSearchParams) {
  const equipment = sp.get('equipment') ?? '';
  const barcode = sp.get('barcode') ?? '';
  const fileName = sp.get('fileName') ?? '';

  if (!equipment || !barcode) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 });
  }

  const sql = `
    SELECT STEP, DEVICE, OPEN, SHORT, BOARD, LOG_TYPE,
           IDEAL, CH_PLUS, CH_MINUS, LC, STD,
           T_PLUS, T_MINUS, MEAS, ERROR_PCT, RESULT, LOG_ROWS
      FROM LOG_ICT
     WHERE EQUIPMENT_ID = :equipment AND BARCODE = :barcode AND FILE_NAME = :fileName
     ORDER BY TO_NUMBER(REGEXP_SUBSTR(STEP, '\\d+'))`;

  const rows = await executeQuery(sql, { equipment, barcode, fileName });

  return NextResponse.json({
    rows: sanitize(rows as Record<string, unknown>[]),
    total: rows.length,
  });
}

/** BigInt, Date 등 JSON 직렬화 안전 변환 */
function sanitize(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === 'RNUM') continue;
      if (v == null) safe[k] = v;
      else if (typeof v === 'bigint') safe[k] = Number(v);
      else if (v instanceof Date) safe[k] = v.toISOString();
      else safe[k] = v;
    }
    return safe;
  });
}
