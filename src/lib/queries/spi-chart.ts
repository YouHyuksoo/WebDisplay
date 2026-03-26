/**
 * @file spi-chart.ts
 * @description SPI 차트분석 화면(메뉴 40) SQL 쿼리 모음.
 * 초보자 가이드: IQ_MACHINE_INSPECT_DATA_SPI 테이블에서 LINE_CODE, RESULT, ACTUAL_DATE를 조회.
 * ACTUAL_DATE는 작업일 기준(07:30~다음날 07:30)이 이미 반영된 DATE 컬럼이므로
 * 당일 조회 시 TRUNC(SYSDATE)와 직접 비교하면 된다.
 * 모든 쿼리는 lineClause 파라미터로 라인 선택 필터를 받는다.
 */

/** 라인별 검사 결과 집계 (당일) */
export function sqlSpiByLine(lineClause: string): string {
  return `
SELECT
  LINE_CODE,
  F_GET_LINE_NAME(LINE_CODE, 1)                         AS LINE_NAME,
  COUNT(*)                                              AS TOTAL_CNT,
  SUM(CASE WHEN RESULT = 'GOOD' THEN 1 ELSE 0 END)    AS GOOD_CNT,
  SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END)   AS NG_CNT,
  ROUND(
    SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 2
  ) AS NG_RATE
FROM IQ_MACHINE_INSPECT_DATA_SPI
WHERE ACTUAL_DATE = TRUNC(SYSDATE)
  ${lineClause}
GROUP BY LINE_CODE, F_GET_LINE_NAME(LINE_CODE, 1)
ORDER BY LINE_CODE
`;
}

/** 직행율(FPY) 최근 7일 추이 */
export function sqlSpiFpyTrend(lineClause: string): string {
  return `
SELECT
  TO_CHAR(ACTUAL_DATE, 'MM/DD') AS WORK_DATE,
  COUNT(*)                                              AS TOTAL_CNT,
  SUM(CASE WHEN RESULT = 'GOOD' THEN 1 ELSE 0 END)    AS GOOD_CNT,
  SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END)   AS NG_CNT,
  ROUND(
    SUM(CASE WHEN RESULT = 'GOOD' THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS FPY
FROM IQ_MACHINE_INSPECT_DATA_SPI
WHERE ACTUAL_DATE >= TRUNC(SYSDATE) - 6
  AND ACTUAL_DATE <= TRUNC(SYSDATE)
  ${lineClause}
GROUP BY ACTUAL_DATE
ORDER BY ACTUAL_DATE
`;
}

/** 당일 전체 요약 (검사수, 불량수, 불량율, 직행율) */
export function sqlSpiSummary(lineClause: string): string {
  return `
SELECT
  COUNT(*)                                              AS TOTAL_INSPECTED,
  SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END)   AS TOTAL_DEFECTS,
  ROUND(
    SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 2
  ) AS DEFECT_RATE,
  ROUND(
    SUM(CASE WHEN RESULT = 'GOOD' THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS FPY_RATE
FROM IQ_MACHINE_INSPECT_DATA_SPI
WHERE ACTUAL_DATE = TRUNC(SYSDATE)
  ${lineClause}
`;
}

/** 라인별 불량 TOP5 (NG 건수 기준 내림차순) */
export function sqlSpiTopLines(lineClause: string): string {
  return `
SELECT * FROM (
  SELECT
    LINE_CODE,
    F_GET_LINE_NAME(LINE_CODE, 1) AS LINE_NAME,
    SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END) AS NG_CNT,
    COUNT(*) AS TOTAL_CNT,
    ROUND(
      SUM(CASE WHEN RESULT != 'GOOD' THEN 1 ELSE 0 END)
      / NULLIF(COUNT(*), 0) * 100, 1
    ) AS NG_RATE
  FROM IQ_MACHINE_INSPECT_DATA_SPI
  WHERE ACTUAL_DATE = TRUNC(SYSDATE)
    ${lineClause}
  GROUP BY LINE_CODE, F_GET_LINE_NAME(LINE_CODE, 1)
  ORDER BY NG_CNT DESC
)
WHERE ROWNUM <= 5
`;
}

/** SPI 라인별 데이터 행 타입 */
export interface SpiLineRow {
  LINE_CODE: string;
  LINE_NAME: string;
  TOTAL_CNT: number;
  GOOD_CNT: number;
  NG_CNT: number;
  NG_RATE: number;
}

/** SPI 직행율 추이 행 타입 */
export interface SpiFpyRow {
  WORK_DATE: string;
  TOTAL_CNT: number;
  GOOD_CNT: number;
  NG_CNT: number;
  FPY: number | null;
}

/** SPI 요약 행 타입 */
export interface SpiSummaryRow {
  TOTAL_INSPECTED: number;
  TOTAL_DEFECTS: number;
  DEFECT_RATE: number | null;
  FPY_RATE: number | null;
}

/** SPI TOP 라인 행 타입 */
export interface SpiTopLineRow {
  LINE_CODE: string;
  LINE_NAME: string;
  NG_CNT: number;
  TOTAL_CNT: number;
  NG_RATE: number;
}

/** API 전체 응답 타입 */
export interface SpiChartApiResponse {
  byLine: SpiLineRow[];
  fpyTrend: SpiFpyRow[];
  summary: SpiSummaryRow;
  topLines: SpiTopLineRow[];
  timestamp: string;
}
