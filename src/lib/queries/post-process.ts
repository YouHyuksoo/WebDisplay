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

/**
 * 각 테이블의 최종 판정 컬럼 / 바코드 컬럼.
 * 모든 테이블이 IS_LAST 컬럼을 가지므로 IS_LAST='Y' 행만 대상으로 집계한다.
 * IS_LAST='Y': 한 검사 실행(FILE_NAME)의 최종 판정 행
 *   → 재검사 = 동일 BARCODE에 IS_LAST='Y' 행이 2개 이상
 */
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
 * LOG 테이블 1개 — 바코드 단위 불량/재검 통계.
 * - TOTAL_BC  : 전체 고유 바코드 수      (IS_LAST='Y' 최종 판정 기준)
 * - FAIL_BC   : 불량 바코드 수           (IS_LAST='Y' 최종 판정 기준)
 * - RETEST_BC : 재검 바코드 수           (FILE_NAME 기준: distinct FILE_NAME ≥ 2)
 *
 * 불량 판정: IS_LAST='Y' 행만 대상 (재검 시 이전 실행 행은 IS_LAST='N'으로 업데이트됨)
 * 재검 판정: 전체 행에서 (BARCODE, FILE_NAME) 기준 — 동일 바코드가 2개 이상의
 *            FILE_NAME을 가지면 한 번 이상 재검을 받은 것.
 *            IS_LAST를 쓰면 업데이트로 이전 검사 이력이 사라지므로 사용 불가.
 */
export function sqlTableStats(tableKey: PostProcessTableKey, timeWhere: string): string {
  const { result, barcode } = TABLE_COLS[tableKey];
  return `
    SELECT
      (SELECT COUNT(DISTINCT ${barcode})
       FROM ${tableKey}
       WHERE ${timeWhere}
         AND ${result}  IS NOT NULL
         AND ${barcode} IS NOT NULL
         AND IS_LAST    = 'Y')                                    AS TOTAL_BC,
      (SELECT COUNT(DISTINCT ${barcode})
       FROM ${tableKey}
       WHERE ${timeWhere}
         AND ${result}  NOT IN (${PASS_IN})
         AND ${barcode} IS NOT NULL
         AND IS_LAST    = 'Y')                                    AS FAIL_BC,
      (SELECT COUNT(*)
       FROM (
         SELECT ${barcode}
         FROM ${tableKey}
         WHERE ${timeWhere}
           AND ${barcode}  IS NOT NULL
           AND FILE_NAME   IS NOT NULL
         GROUP BY ${barcode}
         HAVING COUNT(DISTINCT FILE_NAME) > 1
       ))                                                         AS RETEST_BC
    FROM DUAL
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
        AND IS_LAST    = 'Y'
      GROUP BY ${barcode}
    )
    GROUP BY TO_CHAR(MIN_TS, 'HH24')
    ORDER BY HOUR
  `;
}

/**
 * LOG_EOL — 스텝별 불량 분포 (파이차트용).
 * STEP_RESULT = FAIL 행을 NAME_DETAIL로 집계.
 * IS_LAST 필터 없음 — 재검 이력 포함 전체 불량 스텝 분포를 봄.
 */
export function sqlEolStepDefects(timeWhere: string): string {
  return `
    SELECT
      NVL(NAME_DETAIL, '(미분류)')  AS NAME_DETAIL,
      COUNT(*)                       AS FAIL_CNT
    FROM LOG_EOL
    WHERE ${timeWhere}
      AND BARCODE     IS NOT NULL
      AND STEP_RESULT IS NOT NULL
      AND STEP_RESULT NOT IN (${PASS_IN})
    GROUP BY NAME_DETAIL
    ORDER BY FAIL_CNT DESC
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
 * IP_PRODUCT_MAGAZINE_INVENTORY — 매거진 재공 재고 현황.
 * CURRENT_QTY = RECEIPT_QTY - ISSUE_QTY (현재 잔량).
 * 시간 필터 없음 — 현재 재고 스냅샷.
 */
export const sqlMagazine = `
  SELECT
    MAGAZINE_NO                                              AS MAGAZINE_NO,
    NVL(MODEL_NAME, MAGAZINE_NO)                            AS MODEL_NAME,
    NVL(WORKSTAGE_CODE, '-')                                AS WORKSTAGE_CODE,
    NVL(CURRENT_QTY, 0)                                    AS CURRENT_QTY,
    TO_CHAR(LAST_MODIFY_DATE, 'MM-DD HH24:MI')             AS LAST_MODIFY_TIME,
    LAST_MODIFY_DATE                                        AS LAST_MODIFY_DATE
  FROM IP_PRODUCT_MAGAZINE_INVENTORY
  ORDER BY MODEL_NAME, WORKSTAGE_CODE, MAGAZINE_NO
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
