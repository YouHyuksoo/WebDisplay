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
    /**
     * 실제 검사 시간 컬럼 우선 선택 (등록/생성일 + LOG_TIMESTAMP/LOG_TIME 제외).
     * LOG_TIMESTAMP는 DB insert 시각이라 실제 검사 시각이 아님.
     * 우선순위: INSPECT_DATE > START_TIME > END_TIME > 기타 > (fallback) LOG_TIMESTAMP/LOG_TIME
     */
    const excludeDate = (c: string) => /^(ENTER|LAST_MODIFY|CREATE|UPDATE|REG)_?(DATE|DT)$/i.test(c);
    const preferredTs = ['INSPECT_DATE', 'START_TIME', 'END_TIME', 'RUN_DATE', 'ACTUAL_DATE']
      .find((c) => dateCols.includes(c));
    const fallbackTs = ['LOG_TIMESTAMP', 'LOG_TIME'].find((c) => dateCols.includes(c));
    const otherTs = dateCols.find((c) =>
      !excludeDate(c) && !['LOG_TIMESTAMP', 'LOG_TIME'].includes(c)
    );
    const tsCol = preferredTs ?? otherTs ?? fallbackTs ?? null;
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

/* ─────────────────────────────────────────────
 * 자재 조회 루틴 — 마운터 종류별 분리
 * ─────────────────────────────────────────────*/

/**
 * 한화 마운터 자재 조회
 * HW_VW_LTS_BOARD / HW_VW_LTS 뷰 기반 (BOARDSN = 바코드)
 */
async function queryMaterialHanwha(barcode: string): Promise<TimelineEvent[]> {
  const [boardEvents, detailEvents] = await Promise.all([
    timed(
      executeQuery<Record<string, unknown>>(
        `SELECT * FROM HW_VW_LTS_BOARD WHERE BOARDSN = :bcode`,
        { bcode: barcode },
      ).then((rows) => rows.map((row) => {
        const safe = sanitizeRow(row);
        return {
          source: 'MATERIAL_BOARD', type: 'log' as const,
          timestamp: safe['STARTDT'] ? String(safe['STARTDT']) : '',
          data: safe,
        };
      })).catch(() => [] as TimelineEvent[]),
      'HW_MATERIAL_BOARD',
    ),
    timed(
      executeQuery<Record<string, unknown>>(
        `SELECT * FROM HW_VW_LTS WHERE BOARDSN = :bcode`,
        { bcode: barcode },
      ).then((rows) => rows.map((row) => {
        const safe = sanitizeRow(row);
        return {
          source: 'MATERIAL_DETAIL', type: 'log' as const,
          timestamp: safe['STARTDT'] ? String(safe['STARTDT']) : '',
          data: safe,
        };
      })).catch(() => [] as TimelineEvent[]),
      'HW_MATERIAL_DETAIL',
    ),
  ]);
  return [...boardEvents, ...detailEvents];
}

/**
 * 파나소닉 마운터 자재 조회
 * IB_SMT_CHECKHIST + IM_ITEM_RECEIPT_BARCODE + ID_ITEM 기반
 * RUN_NO 기준 피딩 이력 — SPI/MAOI/AOI 검사 시간 이전 투입 자재만 포함
 *
 * @param barcode  SERIAL_NO (바코드)
 * @param orgId    ORGANIZATION_ID (IP_PRODUCT_2D_BARCODE에서 추출)
 */
async function queryMaterialPanasonic(
  barcode: string,
  orgId: string,
): Promise<TimelineEvent[]> {
  /*
   * 파나소닉 마운터 자재 포함 조회
   *   - IB_SMT_CHECKHIST        : 파나소닉 SMT 피딩 체크 이력
   *   - IM_ITEM_RECEIPT_BARCODE : 자재 수입 바코드 (ITEM_BARCODE PK, SCAN_PARTNAME과 조인)
   *   - ID_ITEM                 : 아이템 마스터 (MSL 정보)
   *   - LOG_SPI_VD              : SPI 검사 로그 (MASTER_BARCODE 기준, INSPECTION_DATE VARCHAR2 'YYYY-MM-DD')
   *
   * inspect_date 기준: LOG_SPI_VD에서 해당 MASTER_BARCODE의 최초 검사 시각(MIN)
   *   → SPI 검사 시점 이전 투입된 자재만 포함 (check_date <= inspect_date)
   *   → valid_date가 inspect_date 이후인 유효 자재만 포함
   *   → INSPECTION_DATE 형식 이상값(예: '-101') 제거 — REGEXP_LIKE로 'YYYY-MM-DD' 검증
   */
  const sql = `
    SELECT F_GET_LINE_NAME(c.line_code, 1)                                   AS line_name,
           c.location_code,
           c.pcb_item,
           DECODE(c.check_type, '1','CCS', '2','REEL', c.check_type)         AS check_type,
           c.scan_partname,
           b.supplier_barcode,
           b.supplier_lot_no,
           b.manufacture_week,
           DECODE(c.scan_qty, 0, c.vendor_name, TRIM(TO_CHAR(c.scan_qty)))   AS scan_qty,
           c.check_date                                                        AS feeding_date,
           b.reel_destroy_date,
           i.msl_level,
           i.msl_max_time,
           F_GET_MSL_PASSED_TIME(b.item_barcode)                              AS msl_passed_time,
           c.valid_date,
           c.check_date,
           z.inspect_date
      FROM ib_smt_checkhist c,
           im_item_receipt_barcode b,
           id_item i,
           (
             SELECT MIN(
                      TO_DATE(x.INSPECTION_DATE || ' ' || x.INSPECTION_START_TIME,
                              'YYYY-MM-DD HH24:MI:SS')
                    ) AS inspect_date
               FROM log_spi_vd x
              WHERE x.MASTER_BARCODE = :serialNo
                AND REGEXP_LIKE(x.INSPECTION_DATE, '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
                AND REGEXP_LIKE(x.INSPECTION_START_TIME, '^[0-9]{2}:[0-9]{2}:[0-9]{2}$')
           ) z
     WHERE c.scan_partname = b.item_barcode
       AND c.item_code     = i.item_code
       AND c.run_no = (
             SELECT run_no
               FROM ip_product_2d_barcode
              WHERE serial_no LIKE :serialNo
                AND organization_id = :orgId
                AND ROWNUM = 1
           )
       AND c.check_type   IN ('1','2')
       AND c.check_status  = 'P'
       AND c.check_date   <= z.inspect_date
       AND NVL(c.valid_date, SYSDATE) > z.inspect_date
  `;

  try {
    const rows = await executeQuery<Record<string, unknown>>(sql, { serialNo: barcode, orgId });
    return rows.map((row) => {
      const safe = sanitizeRow(row);
      return {
        source: 'MATERIAL_PANASONIC', type: 'log' as const,
        timestamp: safe['FEEDING_DATE'] ? String(safe['FEEDING_DATE']) : '',
        data: safe,
      };
    });
  } catch (err) {
    console.error('[추적성] MATERIAL_PANASONIC 실패:', (err as Error).message);
    return [];
  }
}

/* ───────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')?.trim() ?? '';
  /**
   * materialType: 'hanwha' | 'panasonic' | '' (미지정 = 미포함)
   * 클라이언트에서 자재 포함 시 반드시 타입을 명시
   */
  const materialType = req.nextUrl.searchParams.get('materialType')?.trim() ?? '';
  const includeMaterial = materialType === 'hanwha' || materialType === 'panasonic';
  const mode = req.nextUrl.searchParams.get('mode') ?? '';
  /** 포함할 테이블 목록 (콤마 구분). 빈 값이면 전체 포함 */
  const selectedTablesParam = req.nextUrl.searchParams.get('tables') ?? '';
  const selectedTables = selectedTablesParam
    ? new Set(selectedTablesParam.split(',').map((s) => s.trim()).filter(Boolean))
    : null;

  /* mode=tables: LOG_ 테이블 + 마스터/출하 테이블 목록 반환 (체크박스 구성용) */
  if (mode === 'tables') {
    try {
      const logTables = await findLogTablesWithBarcode();
      return NextResponse.json({
        tables: [
          'IP_PRODUCT_2D_BARCODE',
          'IP_PRODUCT_PACK_SERIAL',
          'IP_PRODUCT_WORK_QC',
          'IMCN_JIG_INPUT_HIST',
          'IM_ITEM_SOLDER_INPUT_HIST',
          'LOG_LCR',
          ...logTables.map((t) => t.tableName),
        ],
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

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
    /* IP_PRODUCT_2D_BARCODE 체크 해제 시 master 숨김 (단, RUN_NO/MODEL_NAME은 내부적으로 사용) */
    const masterRawSanitized = masterRaw ? sanitizeRow(masterRaw) : null;
    const master = selectedTables && !selectedTables.has('IP_PRODUCT_2D_BARCODE')
      ? null
      : masterRawSanitized;

    /* ── 2. RUN_CARD / MODEL_MASTER 병렬 조회 (master 체크 여부와 무관) ── */
    const runNo = masterRawSanitized?.['RUN_NO'] as string | undefined;
    const modelName = masterRawSanitized?.['MODEL_NAME'] as string | undefined;

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
    const allLogTables = await findLogTablesWithBarcode();
    /* 선택된 테이블만 필터 (selectedTables가 null이면 전체) */
    const logTables = selectedTables
      ? allLogTables.filter((t) => selectedTables.has(t.tableName))
      : allLogTables;
    console.log(`[추적성] 3단계 테이블탐지: ${Date.now() - t1}ms (${logTables.length}/${allLogTables.length}개)`);

    /* ── 4. 모든 LOG_ 테이블 + 고정 테이블 병렬 조회 ── */
    const logPromises = logTables.map(({ tableName, barcodeCols, dateCols }) =>
      timed(queryLogTable(tableName, barcodeCols, dateCols, barcode), tableName),
    );

    /* 수리이력 (IP_PRODUCT_WORK_QC) — SERIAL_NO 조건 */
    const workQcPromise: Promise<TimelineEvent[]> =
      !selectedTables || selectedTables.has('IP_PRODUCT_WORK_QC')
        ? timed(executeQuery<Record<string, unknown>>(
            `SELECT * FROM IP_PRODUCT_WORK_QC WHERE SERIAL_NO = :bcode ORDER BY QC_DATE DESC`,
            { bcode: barcode },
          ).then((rows) => rows.map((row) => {
            const safe = sanitizeRow(row);
            /* 실제 검사/수리 시간만 사용 (등록일 ENTER_DATE 제외) */
            const ts = safe['QC_DATE'] ?? safe['REPAIR_DATE'] ?? '';
            return {
              source: 'IP_PRODUCT_WORK_QC', type: 'repair' as const,
              timestamp: String(ts),
              data: safe,
            };
          })).catch(() => [] as TimelineEvent[]), 'WORK_QC')
        : Promise.resolve([]);

    const workstageIoPromise = timed(queryFixedTable(
      'IP_PRODUCT_WORKSTAGE_IO',
      ['PID', 'BARCODE', 'MASTER_BARCODE'],
      ['IO_DATE'],  /* 실제 공정 이동 시간만 (등록/생성일 제외) */
      barcode, 'stage_move',
    ).catch(() => [] as TimelineEvent[]), 'WORKSTAGE_IO');

    const inspectResultPromise = timed(queryFixedTable(
      'IQ_MACHINE_INSPECT_RESULT',
      ['PID'],
      ['INSPECT_DATE'],
      barcode, 'log',
    ).catch(() => [] as TimelineEvent[]), 'INSPECT_RESULT');

    /* 출하정보 (IP_PRODUCT_PACK_SERIAL) — 선택 시에만 조회 */
    const packSerialPromise: Promise<TimelineEvent[]> =
      !selectedTables || selectedTables.has('IP_PRODUCT_PACK_SERIAL')
        ? timed(executeQuery<Record<string, unknown>>(
            `SELECT * FROM IP_PRODUCT_PACK_SERIAL WHERE BARCODE = :bcode`,
            { bcode: barcode },
          ).then((rows) => rows.map((row) => {
            const safe = sanitizeRow(row);
            /* 실제 스캔/검사 시간만 (등록일 ENTER_DATE 제외) */
            const ts = safe['SCAN_DATE'] ?? safe['FINAL_INSPECT_DATE'] ?? '';
            return {
              source: 'IP_PRODUCT_PACK_SERIAL', type: 'log' as const,
              timestamp: String(ts),
              data: safe,
            };
          })).catch(() => [] as TimelineEvent[]), 'PACK_SERIAL')
        : Promise.resolve([]);

    /* 지그투입이력 (IMCN_JIG_INPUT_HIST) — RUN_NO 조건 */
    const runNoForChildren = masterRawSanitized?.['RUN_NO'] as string | undefined;
    const jigInputPromise: Promise<TimelineEvent[]> =
      runNoForChildren && (!selectedTables || selectedTables.has('IMCN_JIG_INPUT_HIST'))
        ? timed(executeQuery<Record<string, unknown>>(
            `SELECT * FROM IMCN_JIG_INPUT_HIST WHERE RUN_NO = :runNo ORDER BY INPUT_DATE DESC`,
            { runNo: runNoForChildren },
          ).then((rows) => rows.map((row) => {
            const safe = sanitizeRow(row);
            /* 실제 투입 시간만 (등록일 ENTER_DATE 제외) */
            const ts = safe['INPUT_DATE'] ?? '';
            return {
              source: 'IMCN_JIG_INPUT_HIST', type: 'log' as const,
              timestamp: String(ts),
              data: safe,
            };
          })).catch(() => [] as TimelineEvent[]), 'JIG_INPUT')
        : Promise.resolve([]);

    /* 솔더투입이력 (IM_ITEM_SOLDER_INPUT_HIST) — RUN_NO 조건 */
    const solderInputPromise: Promise<TimelineEvent[]> =
      runNoForChildren && (!selectedTables || selectedTables.has('IM_ITEM_SOLDER_INPUT_HIST'))
        ? timed(executeQuery<Record<string, unknown>>(
            `SELECT * FROM IM_ITEM_SOLDER_INPUT_HIST WHERE RUN_NO = :runNo ORDER BY INPUT_DATE DESC`,
            { runNo: runNoForChildren },
          ).then((rows) => rows.map((row) => {
            const safe = sanitizeRow(row);
            /* 실제 투입 시간만 (등록일 ENTER_DATE 제외) */
            const ts = safe['INPUT_DATE'] ?? '';
            return {
              source: 'IM_ITEM_SOLDER_INPUT_HIST', type: 'log' as const,
              timestamp: String(ts),
              data: safe,
            };
          })).catch(() => [] as TimelineEvent[]), 'SOLDER_INPUT')
        : Promise.resolve([]);

    /* LCR 로그 (LOG_LCR) — LCR_MSG 컬럼이 RUN_NO 값 */
    const lcrPromise: Promise<TimelineEvent[]> =
      runNoForChildren && (!selectedTables || selectedTables.has('LOG_LCR'))
        ? timed(executeQuery<Record<string, unknown>>(
            `SELECT * FROM LOG_LCR WHERE LCR_MSG = :runNo`,
            { runNo: runNoForChildren },
          ).then((rows) => rows.map((row) => {
            const safe = sanitizeRow(row);
            /* 실제 검사 시간 우선: DTIME > LOG_TIMESTAMP (fallback) */
            const ts = safe['DTIME'] ?? safe['LOG_TIMESTAMP'] ?? '';
            return {
              source: 'LOG_LCR', type: 'log' as const,
              timestamp: String(ts),
              data: safe,
            };
          })).catch(() => [] as TimelineEvent[]), 'LCR')
        : Promise.resolve([]);

    /* ── 4-B. 자재(MATERIAL) — materialType에 따라 루틴 분기 ── */
    let materialPromise: Promise<TimelineEvent[]> = Promise.resolve([]);

    if (includeMaterial) {
      if (materialType === 'hanwha') {
        console.log('[추적성] 자재 포함 조회 — 한화 마운터');
        materialPromise = timed(queryMaterialHanwha(barcode), 'MATERIAL_HANWHA');
      } else if (materialType === 'panasonic') {
        console.log('[추적성] 자재 포함 조회 — 파나소닉 마운터');
        /* ORGANIZATION_ID: IP_PRODUCT_2D_BARCODE에서 이미 조회한 masterRaw에서 추출 */
        const orgId = String(masterRawSanitized?.['ORGANIZATION_ID'] ?? '');
        materialPromise = timed(queryMaterialPanasonic(barcode, orgId), 'MATERIAL_PANASONIC');
      }
    }

    const t2 = Date.now();
    const allResults = await Promise.all([
      ...logPromises, workQcPromise, workstageIoPromise, inspectResultPromise,
      packSerialPromise, jigInputPromise, solderInputPromise, lcrPromise,
      materialPromise,
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
    const materialTables =
      materialType === 'hanwha'    ? ['MATERIAL_BOARD', 'MATERIAL_DETAIL'] :
      materialType === 'panasonic' ? ['MATERIAL_PANASONIC'] :
      [];
    const queriedTables = [
      ...logTables.map((t) => t.tableName),
      ...REFLOW_TABLES,
      'IQ_MACHINE_INSPECT_RESULT',
      'IP_PRODUCT_WORK_QC',
      'IP_PRODUCT_WORKSTAGE_IO',
      ...materialTables,
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
