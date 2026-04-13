/**
 * @file src/lib/queries/post-process.ts
 * @description 후공정생산현황 API용 SQL 쿼리 헬퍼
 * 초보자 가이드:
 * 1. buildTimeWhere — LOG_TIMESTAMP 기반 기간 필터 생성
 * 2. sqlTableStats — LOG 테이블 1개의 바코드 단위 불량/재검 통계
 * 3. sqlTableFpyHourly — LOG 테이블 1개의 시간대별 직행율
 * 4. sqlQcStats — IP_PRODUCT_WORK_QC 수리 건수 쿼리
 * 5. sqlMagazine — IP_PRODUCT_MAGAZINE 재공 조회
 * 6. sqlProductionKpiAgg — IRPT_PRODUCT_LINE_TARGET_MONITORING 집계
 */

/** 검사공정 5개 테이블 */
export const POST_PROCESS_TABLES = [
  'LOG_ICT', 'LOG_EOL', 'LOG_COATING1', 'LOG_COATING2', 'LOG_DOWNLOAD',
] as const;
export type PostProcessTableKey = typeof POST_PROCESS_TABLES[number];

/** 테이블 표시명 */
export const POST_PROCESS_TABLE_LABELS: Record<PostProcessTableKey, string> = {
  LOG_ICT:      'ICT',
  LOG_EOL:      'EOL',
  LOG_COATING1: 'COATING 1',
  LOG_COATING2: 'COATING 2',
  LOG_DOWNLOAD: 'DOWNLOAD',
};

/** 각 테이블의 판정 컬럼 / 바코드 컬럼 */
const TABLE_COLS: Record<PostProcessTableKey, { result: string; barcode: string }> = {
  LOG_ICT:      { result: 'RESULT',       barcode: 'BARCODE' },
  LOG_EOL:      { result: 'ARRAY_RESULT', barcode: 'BARCODE' },
  LOG_COATING1: { result: 'RESULT',       barcode: 'BARCODE' },
  LOG_COATING2: { result: 'RESULT',       barcode: 'BARCODE' },
  LOG_DOWNLOAD: { result: 'RESULT',       barcode: 'BARCODE' },
};

/** PASS 판정값 목록 */
const PASS_IN = ["'OK'", "'PASS'", "'GOOD'", "'Good'", "'Y'", "'SKIP'", "'OverKill'"].join(',');

/**
 * LOG_TIMESTAMP 기반 기간 WHERE 절 생성.
 * dateFrom/dateTo 없으면 당일 08:00 ~ 현재 (작업일 기준).
 */
export function buildTimeWhere(dateFrom: string, dateTo: string): {
  where: string;
  binds: Record<string, string>;
} {
  if (dateFrom && dateTo) {
    return {
      where: `LOG_TIMESTAMP >= TO_TIMESTAMP(:fromDate || ':00', 'YYYY-MM-DD HH24:MI:SS')
        AND LOG_TIMESTAMP <= TO_TIMESTAMP(:toDate || ':59', 'YYYY-MM-DD HH24:MI:SS')`,
      binds: {
        fromDate: dateFrom.replace('T', ' '),
        toDate:   dateTo.replace('T', ' '),
      },
    };
  }
  const workDay = `CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE,'HH24'))>=8
    THEN TRUNC(SYSDATE)+8/24
    ELSE TRUNC(SYSDATE)-1+8/24 END`;
  return {
    where: `LOG_TIMESTAMP >= (${workDay}) AND LOG_TIMESTAMP <= SYSDATE`,
    binds: {},
  };
}

/**
 * LOG 테이블 1개 — 바코드 단위 불량/재검사 통계 쿼리.
 * - TOTAL_BC  : 전체 고유 바코드 수
 * - FAIL_BC   : 1회라도 FAIL인 바코드 수
 * - RETEST_BC : 2회 이상 검사된 바코드 수
 */
export function sqlTableStats(tableKey: PostProcessTableKey, timeWhere: string): string {
  const { result, barcode } = TABLE_COLS[tableKey];
  return `
    SELECT
      COUNT(*) AS TOTAL_BC,
      SUM(CASE WHEN HAS_FAIL = 1 THEN 1 ELSE 0 END) AS FAIL_BC,
      SUM(CASE WHEN TEST_CNT > 1 THEN 1 ELSE 0 END)  AS RETEST_BC
    FROM (
      SELECT
        ${barcode}                                                              AS BC,
        COUNT(*)                                                                AS TEST_CNT,
        MAX(CASE WHEN ${result} NOT IN (${PASS_IN}) THEN 1 ELSE 0 END)        AS HAS_FAIL
      FROM ${tableKey}
      WHERE ${timeWhere}
        AND ${result}  IS NOT NULL
        AND ${barcode} IS NOT NULL
      GROUP BY ${barcode}
    )
  `;
}

/**
 * LOG 테이블 1개 — 시간대별 직행율 쿼리.
 * 바코드 그룹 기준: 같은 바코드의 최초 스캔 시각으로 시간대 결정.
 * - HOUR     : 2자리 시간 ('08', '09', ...)
 * - TOTAL    : 해당 시간대 바코드 수
 * - PASS_CNT : 합격 바코드 수
 */
export function sqlTableFpyHourly(tableKey: PostProcessTableKey, timeWhere: string): string {
  const { result, barcode } = TABLE_COLS[tableKey];
  return `
    SELECT
      TO_CHAR(MIN_TS, 'HH24') AS HOUR,
      COUNT(*)                 AS TOTAL,
      SUM(PASS_FLAG)           AS PASS_CNT
    FROM (
      SELECT
        ${barcode}                                                                              AS BC,
        MIN(LOG_TIMESTAMP)                                                                      AS MIN_TS,
        CASE WHEN MAX(CASE WHEN ${result} NOT IN (${PASS_IN}) THEN 1 ELSE 0 END) = 0
             THEN 1 ELSE 0 END                                                                 AS PASS_FLAG
      FROM ${tableKey}
      WHERE ${timeWhere}
        AND ${result}  IS NOT NULL
        AND ${barcode} IS NOT NULL
      GROUP BY ${barcode}
    )
    GROUP BY TO_CHAR(MIN_TS, 'HH24')
    ORDER BY HOUR
  `;
}

/**
 * IP_PRODUCT_WORK_QC — 수리대기/완료 건수.
 * QC_INSPECT_HANDLING: 'W' = 대기, 'U' = 완료
 */
export function sqlQcStats(dateFrom: string, dateTo: string): {
  sql: string;
  binds: Record<string, string>;
} {
  const hasRange = !!(dateFrom && dateTo);
  const where = hasRange
    ? `QC_DATE >= TO_DATE(:qcFrom, 'YYYY-MM-DD') AND QC_DATE <= TO_DATE(:qcTo, 'YYYY-MM-DD')`
    : `QC_DATE >= TRUNC(SYSDATE)`;
  const binds: Record<string, string> = hasRange
    ? { qcFrom: dateFrom.slice(0, 10), qcTo: dateTo.slice(0, 10) }
    : {};
  return {
    sql: `
      SELECT
        SUM(CASE WHEN QC_INSPECT_HANDLING = 'W' THEN 1 ELSE 0 END) AS WAITING,
        SUM(CASE WHEN QC_INSPECT_HANDLING = 'U' THEN 1 ELSE 0 END) AS DONE
      FROM IP_PRODUCT_WORK_QC
      WHERE ${where}
    `,
    binds,
  };
}

/**
 * IP_PRODUCT_MAGAZINE — 라인/공정별 현재 재공 조회.
 * 이 테이블은 현재 재공 스냅샷 — 시간 필터 없음.
 */
export const sqlMagazine = `
  SELECT
    LINE_CODE               AS LINE_CODE,
    WORKSTAGE_CODE          AS WORKSTAGE_CODE,
    MAGAZINE_NO             AS MAGAZINE_NO,
    NVL(MAGAZINE_IN_QTY, 0) AS IN_QTY
  FROM IP_PRODUCT_MAGAZINE
  ORDER BY LINE_CODE, WORKSTAGE_CODE
`;

/**
 * IRPT_PRODUCT_LINE_TARGET_MONITORING — 생산 계획/목표/실적 집계.
 * @param lineClause - buildLineFilter()로 생성한 라인 WHERE 조각 (없으면 빈 문자열)
 */
export function sqlProductionKpiAgg(lineClause: string): string {
  return `
    SELECT
      SUM(NVL(lot_qty, 0))     AS PLAN_QTY,
      SUM(NVL(target_plan, 0)) AS TARGET_QTY,
      SUM(NVL(actual_qty, 0))  AS ACTUAL_QTY,
      CASE WHEN SUM(NVL(target_plan, 0)) > 0
           THEN ROUND(SUM(NVL(actual_qty, 0)) / SUM(NVL(target_plan, 0)) * 100, 1)
           ELSE 0 END          AS ACHIEVEMENT_RATE
    FROM IRPT_PRODUCT_LINE_TARGET_MONITORING
    WHERE organization_id = :orgId
    ${lineClause}
  `;
}
