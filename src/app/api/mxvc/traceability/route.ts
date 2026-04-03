/**
 * @file src/app/api/mxvc/traceability/route.ts
 * @description 멕시코전장 추적성분석 API.
 * 초보자 가이드:
 * 1. ?barcode=XXXX 로 바코드를 넘기면 마스터 정보 + 타임라인을 반환한다.
 * 2. 마스터: IP_PRODUCT_2D_BARCODE → RUN_NO로 IP_PRODUCT_RUN_CARD 조회
 *            → MODEL_NAME으로 IP_PRODUCT_MODEL_MASTER 조회
 * 3. 타임라인: USER_TAB_COLUMNS에서 바코드 컬럼이 있는 LOG_ 테이블을 자동 탐지하여
 *             각 테이블에서 해당 바코드 관련 이벤트를 모두 병렬로 수집한다.
 * 4. IP_PRODUCT_WORK_QC, IP_PRODUCT_WORKSTAGE_IO 도 포함.
 * 5. 결과는 timestamp 오름차순으로 정렬 (null은 뒤로).
 * 6. SQL Injection 방지: 테이블명은 USER_TAB_COLUMNS 조회 결과만 사용,
 *    컬럼명도 메타 데이터에서 검증된 이름만 사용.
 */
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import type { TraceabilityResponse, TimelineEvent } from '@/types/mxvc/traceability';

export const dynamic = 'force-dynamic';

/** 개별 쿼리 타이밍 측정 래퍼 */
function timed<T>(promise: Promise<T>, label: string): Promise<T> {
  const s = Date.now();
  return promise.then((r) => {
    console.log(`[추적성] ${label}: ${Date.now() - s}ms`);
    return r;
  }).catch((err) => {
    console.error(`[추적성] ${label}: ${Date.now() - s}ms FAIL -`, (err as Error).message);
    throw err;
  });
}

/** 바코드로 인식할 수 있는 컬럼명 후보 목록 */
const BARCODE_COLUMNS = [
  'PID', 'BARCODE', 'MASTER_BARCODE', 'SERIAL_NO',
  'PRODUCT_2D_BARCODE', '2D_BARCODE',
  'MAIN_BARCODE', 'SUB_BARCODE', 'MARKED_BARCODE', 'ARRAY_BARCODE',
];

/** 추적성 분석에서 제외할 LOG_ 테이블 */
const EXCLUDED_TABLES = new Set([
  'LOG_ALARM', 'LOG_ERROR', 'LOG_MOUNTER', 'LOG_PROCESS',
  'LOG_REFLOW_01', 'LOG_REFLOW_02',  // REFLOW는 별도 시간범위 조회
]);

/** BigInt, Date, Lob, Buffer 등을 JSON 직렬화 가능한 값으로 변환 */
function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
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
    } else if (typeof val === 'object' && (val as { constructor?: { name?: string } }).constructor?.name === 'Lob') {
      safe[key] = '[LOB]';
    } else {
      try { JSON.stringify(val); safe[key] = val; } catch { safe[key] = String(val); }
    }
  }
  return safe;
}

/** 해당 테이블에서 바코드 컬럼과 날짜 컬럼 목록을 USER_TAB_COLUMNS로 조회 */
async function getTableMeta(
  tableName: string,
): Promise<{ barcodeCols: string[]; dateCols: string[] }> {
  const rows = await executeQuery<{ COLUMN_NAME: string; DATA_TYPE: string }>(
    `SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :tname`,
    { tname: tableName.toUpperCase() },
  );
  const colNames = rows.map((r) => r.COLUMN_NAME.toUpperCase());
  const dataTypeMap = Object.fromEntries(rows.map((r) => [r.COLUMN_NAME.toUpperCase(), r.DATA_TYPE]));

  const barcodeCols = BARCODE_COLUMNS.filter((c) => colNames.includes(c));
  const dateCols = colNames.filter(
    (c) => dataTypeMap[c] === 'DATE' || dataTypeMap[c]?.startsWith('TIMESTAMP'),
  );
  return { barcodeCols, dateCols };
}

/** LOG_ 테이블 목록 중 바코드 컬럼을 가진 테이블과 해당 컬럼/날짜 컬럼 정보를 반환 */
async function findLogTablesWithBarcode(): Promise<
  { tableName: string; barcodeCols: string[]; dateCols: string[] }[]
> {
  /* USER_TAB_COLUMNS에서 LOG_ 테이블 중 바코드 컬럼이 하나라도 있는 테이블 목록 */
  const placeholders = BARCODE_COLUMNS.map((_, i) => `:col${i}`).join(', ');
  const binds = Object.fromEntries(BARCODE_COLUMNS.map((c, i) => [`col${i}`, c]));

  const rows = await executeQuery<{ TABLE_NAME: string }>(
    `SELECT DISTINCT C.TABLE_NAME
       FROM USER_TAB_COLUMNS C
       JOIN USER_TABLES T ON C.TABLE_NAME = T.TABLE_NAME
      WHERE C.TABLE_NAME LIKE 'LOG\\_%' ESCAPE '\\'
        AND C.COLUMN_NAME IN (${placeholders})
      ORDER BY C.TABLE_NAME`,
    binds,
  );

  /* 제외 목록 필터 후 각 테이블 메타 병렬 조회 */
  const candidates = rows
    .map((r) => r.TABLE_NAME)
    .filter((t) => !EXCLUDED_TABLES.has(t));

  const metas = await Promise.all(
    candidates.map(async (t) => {
      const { barcodeCols, dateCols } = await getTableMeta(t);
      return { tableName: t, barcodeCols, dateCols };
    }),
  );

  return metas.filter((m) => m.barcodeCols.length > 0);
}

/** LOG_ 테이블 1개에서 바코드 값으로 조회 */
async function queryLogTable(
  tableName: string,
  barcodeCols: string[],
  dateCols: string[],
  barcodeValue: string,
): Promise<TimelineEvent[]> {
  const where = barcodeCols.map((c) => `${c} = :bcode`).join(' OR ');
  const sql = `SELECT * FROM ${tableName} WHERE ${where}`;

  try {
    const rows = await executeQuery<Record<string, unknown>>(sql, { bcode: barcodeValue });
    const tsCol = dateCols[0] ?? null;
    return rows.map((row) => {
      const safe = sanitizeRow(row);
      let timestamp = '';
      if (tsCol && row[tsCol]) {
        timestamp = row[tsCol] instanceof Date
          ? (row[tsCol] as Date).toISOString()
          : String(safe[tsCol]);
      }
      return { source: tableName, type: 'log' as const, timestamp, data: safe };
    });
  } catch (err) {
    console.error(`[추적성] ${tableName} 실패:`, (err as Error).message);
    return [];
  }
}

/** WORK_QC / WORKSTAGE_IO 고정 테이블에서 바코드 조건으로 조회 */
async function queryFixedTable(
  tableName: string,
  barcodeCandidates: string[],
  timestampCandidates: string[],
  barcodeValue: string,
  eventType: TimelineEvent['type'],
): Promise<TimelineEvent[]> {
  const { barcodeCols, dateCols } = await getTableMeta(tableName).catch(() => ({
    barcodeCols: [] as string[],
    dateCols: [] as string[],
  }));

  const validBarcode = barcodeCandidates.filter((c) => barcodeCols.includes(c));
  if (validBarcode.length === 0) return [];

  const where = validBarcode.map((c) => `${c} = :bcode`).join(' OR ');
  const sql = `SELECT * FROM ${tableName} WHERE ${where}`;

  try {
    const rows = await executeQuery<Record<string, unknown>>(sql, { bcode: barcodeValue });
    const tsCol = timestampCandidates.find((c) => dateCols.includes(c)) ?? null;
    return rows.map((row) => {
      const safe = sanitizeRow(row);
      let timestamp = '';
      if (tsCol && row[tsCol]) {
        timestamp = row[tsCol] instanceof Date
          ? (row[tsCol] as Date).toISOString()
          : String(safe[tsCol]);
      }
      return { source: tableName, type: eventType, timestamp, data: safe };
    });
  } catch (err) {
    console.error(`[추적성] ${tableName} 실패:`, (err as Error).message);
    return [];
  }
}

/** REFLOW 테이블: 바코드 없음 → AOI 시간 기준 20분 전 ~ AOI 시간 범위 + 라인코드로 조회 */
const REFLOW_TABLES = ['LOG_REFLOW_01', 'LOG_REFLOW_02'];

async function queryReflowByAoiTime(
  aoiEvents: TimelineEvent[],
  lineCode: string,
): Promise<TimelineEvent[]> {
  if (aoiEvents.length === 0) return [];

  /* AOI 이벤트 중 가장 이른 시간 기준 */
  const aoiTimes = aoiEvents
    .filter((e) => e.timestamp)
    .map((e) => new Date(e.timestamp).getTime())
    .filter((t) => !isNaN(t));
  if (aoiTimes.length === 0) return [];

  const earliestAoi = new Date(Math.min(...aoiTimes));
  const latestAoi = new Date(Math.max(...aoiTimes));
  const from = new Date(earliestAoi.getTime() - 20 * 60 * 1000); // 20분 전

  const promises = REFLOW_TABLES.map(async (tableName): Promise<TimelineEvent[]> => {
    try {
      const conditions = ['LOG_TIMESTAMP BETWEEN :fromTs AND :toTs'];
      const binds: Record<string, Date | string> = { fromTs: from, toTs: latestAoi };
      if (lineCode) {
        conditions.push('LINE_CODE = :lineCode');
        binds.lineCode = lineCode;
      }
      const sql = `SELECT * FROM ${tableName} WHERE ${conditions.join(' AND ')}`;
      const rows = await executeQuery<Record<string, unknown>>(sql, binds);
      return rows.map((row) => {
        const safe = sanitizeRow(row);
        const ts = row['LOG_TIMESTAMP'] instanceof Date
          ? (row['LOG_TIMESTAMP'] as Date).toISOString()
          : String(safe['LOG_TIMESTAMP'] ?? '');
        return { source: tableName, type: 'log' as const, timestamp: ts, data: safe };
      });
    } catch {
      return [];
    }
  });

  return (await Promise.all(promises)).flat();
}

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')?.trim() ?? '';
  const includeMaterial = req.nextUrl.searchParams.get('material') === '1';

  if (!barcode) {
    return NextResponse.json({ error: 'barcode 파라미터가 필요합니다' }, { status: 400 });
  }

  try {
    const t0 = Date.now();
    /* ── 1. 마스터 정보 조회 ── */
    const masterRows = await executeQuery<Record<string, unknown>>(
      `SELECT * FROM IP_PRODUCT_2D_BARCODE WHERE SERIAL_NO = :bcode`,
      { bcode: barcode },
    );
    const masterRaw = masterRows[0] ?? null;
    const master = masterRaw ? sanitizeRow(masterRaw) : null;

    /* ── 2. RUN_CARD / MODEL_MASTER 병렬 조회 ── */
    const runNo = master?.['RUN_NO'] as string | undefined;
    const modelName = master?.['MODEL_NAME'] as string | undefined;

    const [runCardRows, modelMasterRows] = await Promise.all([
      runNo
        ? executeQuery<Record<string, unknown>>(
            `SELECT * FROM IP_PRODUCT_RUN_CARD WHERE RUN_NO = :rno`,
            { rno: runNo },
          ).catch(() => [])
        : Promise.resolve([]),
      modelName
        ? executeQuery<Record<string, unknown>>(
            `SELECT * FROM IP_PRODUCT_MODEL_MASTER WHERE MODEL_NAME = :mname`,
            { mname: modelName },
          ).catch(() => [])
        : Promise.resolve([]),
    ]);

    const runCard = runCardRows[0] ? sanitizeRow(runCardRows[0]) : null;
    const modelMaster = modelMasterRows[0] ? sanitizeRow(modelMasterRows[0]) : null;

    console.log(`[추적성] 1+2단계 마스터: ${Date.now() - t0}ms`);

    /* ── 3. LOG_ 테이블 자동 탐지 ── */
    const t1 = Date.now();
    const logTables = await findLogTablesWithBarcode();
    console.log(`[추적성] 3단계 테이블탐지: ${Date.now() - t1}ms (${logTables.length}개)`);

    /* ── 4. 모든 LOG_ 테이블 + 고정 테이블 병렬 조회 ── */
    const logPromises = logTables.map(({ tableName, barcodeCols, dateCols }) =>
      timed(queryLogTable(tableName, barcodeCols, dateCols, barcode), tableName),
    );

    const workQcPromise = timed(queryFixedTable(
      'IP_PRODUCT_WORK_QC',
      ['PID', 'BARCODE', 'MASTER_BARCODE'],
      ['REG_DATE', 'CREATE_DATE', 'UPDATE_DATE'],
      barcode, 'repair',
    ).catch(() => [] as TimelineEvent[]), 'WORK_QC');

    const workstageIoPromise = timed(queryFixedTable(
      'IP_PRODUCT_WORKSTAGE_IO',
      ['PID', 'BARCODE', 'MASTER_BARCODE'],
      ['IO_DATE', 'CREATE_DATE', 'REG_DATE'],
      barcode, 'stage_move',
    ).catch(() => [] as TimelineEvent[]), 'WORKSTAGE_IO');

    const inspectResultPromise = timed(queryFixedTable(
      'IQ_MACHINE_INSPECT_RESULT',
      ['PID'],
      ['INSPECT_DATE', 'ENTER_DATE'],
      barcode, 'log',
    ).catch(() => [] as TimelineEvent[]), 'INSPECT_RESULT');

    /* ── 4-B. 자재(MATERIAL) — 토글 ON일 때만 조회 ── */
    let materialBoardPromise: Promise<TimelineEvent[]> = Promise.resolve([]);
    let materialDetailPromise: Promise<TimelineEvent[]> = Promise.resolve([]);

    if (includeMaterial) {
      console.log('[추적성] 자재 포함 조회');
      materialBoardPromise = timed(executeQuery<Record<string, unknown>>(
        `SELECT * FROM HW_VW_LTS_BOARD WHERE BOARDSN = :bcode`,
        { bcode: barcode },
      ).then((rows) => rows.map((row) => ({
        source: 'MATERIAL_BOARD', type: 'log' as const,
        timestamp: sanitizeRow(row)['STARTDT'] ? String(sanitizeRow(row)['STARTDT']) : '',
        data: sanitizeRow(row),
      }))).catch(() => [] as TimelineEvent[]), 'MATERIAL_BOARD');

      materialDetailPromise = timed(executeQuery<Record<string, unknown>>(
        `SELECT * FROM HW_VW_LTS WHERE BOARDSN = :bcode`,
        { bcode: barcode },
      ).then((rows) => rows.map((row) => ({
        source: 'MATERIAL_DETAIL', type: 'log' as const,
        timestamp: sanitizeRow(row)['STARTDT'] ? String(sanitizeRow(row)['STARTDT']) : '',
        data: sanitizeRow(row),
      }))).catch(() => [] as TimelineEvent[]), 'MATERIAL_DETAIL');
    }

    const t2 = Date.now();
    const allResults = await Promise.all([
      ...logPromises, workQcPromise, workstageIoPromise, inspectResultPromise,
      materialBoardPromise, materialDetailPromise,
    ]);
    console.log(`[추적성] 4단계 병렬조회: ${Date.now() - t2}ms`);

    /* ── 4-C. REFLOW: AOI 시간 기준 20분 전 ~ AOI 시간 범위 조회 ── */
    const aoiEvents = allResults.flat().filter((e) => e.source === 'LOG_AOI');
    const lineCode = (master?.['LINE_CODE'] as string) ?? '';
    const reflowEvents = await queryReflowByAoiTime(aoiEvents, lineCode);

    console.log(`[추적성] 4-C REFLOW: ${Date.now() - t2}ms`);
    console.log(`[추적성] 전체: ${Date.now() - t0}ms`);
    console.log('[추적성] 결과:', allResults.map((r, i) => `[${i}] ${r.length}건`).join(', '),
      `| REFLOW: ${reflowEvents.length}건`);

    /* ── 5. 타임라인 병합 및 정렬 ── */
    const timeline: TimelineEvent[] = [...allResults.flat(), ...reflowEvents]
      .sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp.localeCompare(b.timestamp);
      });

    /* 조회 시도한 테이블 목록 (데이터 유무와 무관) */
    const queriedTables = [
      ...logTables.map((t) => t.tableName),
      ...REFLOW_TABLES,
      'IQ_MACHINE_INSPECT_RESULT',
      'MATERIAL_BOARD',
      'MATERIAL_DETAIL',
      'IP_PRODUCT_WORK_QC',
      'IP_PRODUCT_WORKSTAGE_IO',
    ];

    const response: TraceabilityResponse = { master, runCard, modelMaster, timeline, queriedTables };
    return NextResponse.json(response);
  } catch (err) {
    console.error('추적성분석 API 오류:', err);
    return NextResponse.json(
      { error: `조회 실패: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
