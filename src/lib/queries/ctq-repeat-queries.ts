/**
 * @file ctq-repeat-queries.ts
 * @description CTQ 반복성/비연속 불량 모니터링 SQL 쿼리
 *
 * 초보자 가이드:
 * - A급: 동일위치 연속불량 (sqlCtqRepeatFtSummary, sqlCtqRepeatFtLocations)
 * - B급: 동일위치 비연속불량 (sqlCtqNonConsecutive) — A급 제외 후 2건+ 집계
 * - FT 공정 테이블 기준 대표 예시이며, 다른 공정은 테이블명만 변경
 */

/* ============================================================
 * 1. 반복성 (Repeatability) — A급 동일위치 연속불량
 * ============================================================ */

/** FT 라인별 NG 요약 집계 */
export function sqlCtqRepeatFtSummary(): string {
  return `
SELECT t.LINE_CODE,
       COUNT(*) AS NG_COUNT,
       0 AS PENDING_COUNT,
       MAX(t.INSPECT_DATE) AS LAST_INSPECT
FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
  AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
  AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
  AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
  AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
  AND t.LAST_FLAG = 'Y'
  AND t.LINE_CODE IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM IP_PRODUCT_WORK_QC q
    WHERE q.SERIAL_NO = t.PID AND q.RECEIPT_DEFICIT = '2' AND q.QC_RESULT = 'O'
  )
  /* AND t.LINE_CODE IN (:line0, ...) */
GROUP BY t.LINE_CODE
`;
}

/** FT 동일위치 연속불량(A급) 감지 — LAG 윈도우 함수 */
export function sqlCtqRepeatFtLocations(): string {
  return `
SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE, COUNT(*) AS LOC_COUNT
FROM (
  SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE
  FROM (
    SELECT base.LINE_CODE, base.MODEL_NAME,
           r.LOCATION_CODE, base.SORT_DATE,
           LAG(r.LOCATION_CODE) OVER (
             PARTITION BY base.LINE_CODE, base.MODEL_NAME ORDER BY base.SORT_DATE
           ) AS PREV_LOC,
           LAG(base.SORT_DATE) OVER (
             PARTITION BY base.LINE_CODE, base.MODEL_NAME ORDER BY base.SORT_DATE
           ) AS PREV_SORT_DATE
    FROM (
      SELECT t.LINE_CODE, t.PID AS PID_VAL, t.INSPECT_DATE AS SORT_DATE,
             F_GET_MODEL_NAME_BY_PID(t.PID) AS MODEL_NAME
      FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
      JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
        AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
      WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
        AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
        AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
        AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
        AND t.LAST_FLAG = 'Y'
        AND t.LINE_CODE IS NOT NULL
        /* AND t.LINE_CODE IN (:line0, ...) */
    ) base
    JOIN (
      SELECT SERIAL_NO, LOCATION_CODE FROM (
        SELECT rr.SERIAL_NO, rr.LOCATION_CODE,
               ROW_NUMBER() OVER (PARTITION BY rr.SERIAL_NO ORDER BY rr.QC_DATE DESC) AS RN
        FROM IP_PRODUCT_WORK_QC rr
        WHERE rr.RECEIPT_DEFICIT = '2' AND rr.QC_RESULT != 'O'
          AND rr.LOCATION_CODE IS NOT NULL AND rr.LOCATION_CODE <> '*'
      ) WHERE RN = 1
    ) r ON r.SERIAL_NO = base.PID_VAL
  ) sub
  WHERE sub.LOCATION_CODE = sub.PREV_LOC
    AND NOT EXISTS (
      SELECT 1 FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t_chk
      WHERE t_chk.LINE_CODE = sub.LINE_CODE
        AND t_chk.INSPECT_DATE > sub.PREV_SORT_DATE
        AND t_chk.INSPECT_DATE < sub.SORT_DATE
        AND t_chk.INSPECT_RESULT IN ('PASS', 'GOOD', 'OK', 'Y')
        AND t_chk.LAST_FLAG = 'Y'
    )
)
GROUP BY LINE_CODE, MODEL_NAME, LOCATION_CODE
`;
}

/* ============================================================
 * 2. 비연속 (Non-Consecutive) — B급 동일위치 비연속불량
 * ============================================================ */

/** FT 동일위치 2건+ 비연속불량(B급) 감지 — A급 제외 */
export function sqlCtqNonConsecutive(): string {
  return `
SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE, LOC_COUNT
FROM (
  -- 전체 동일 Location 2건+ 집계
  SELECT base.LINE_CODE, base.MODEL_NAME, r.LOCATION_CODE, COUNT(*) AS LOC_COUNT
  FROM (
    SELECT t.LINE_CODE, t.PID AS PID_VAL, t.INSPECT_DATE AS SORT_DATE,
           F_GET_MODEL_NAME_BY_PID(t.PID) AS MODEL_NAME
    FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
    JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
      AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
      AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
      AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
      AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
      AND t.LAST_FLAG = 'Y'
      AND t.LINE_CODE IS NOT NULL
      /* AND t.LINE_CODE IN (:line0, ...) */
  ) base
  JOIN (
    SELECT SERIAL_NO, LOCATION_CODE FROM (
      SELECT rr.SERIAL_NO, rr.LOCATION_CODE,
             ROW_NUMBER() OVER (PARTITION BY rr.SERIAL_NO ORDER BY rr.QC_DATE DESC) AS RN
      FROM IP_PRODUCT_WORK_QC rr
      WHERE rr.RECEIPT_DEFICIT = '2' AND rr.QC_RESULT != 'O'
        AND rr.LOCATION_CODE IS NOT NULL AND rr.LOCATION_CODE <> '*'
    ) WHERE RN = 1
  ) r ON r.SERIAL_NO = base.PID_VAL
  GROUP BY base.LINE_CODE, base.MODEL_NAME, r.LOCATION_CODE
  HAVING COUNT(*) >= 2
) total_loc
WHERE (LINE_CODE, MODEL_NAME, LOCATION_CODE) NOT IN (
  -- A급(연속불량) Location 제외 (LAG 기반 연속 감지 서브쿼리)
  SELECT LINE_CODE, MODEL_NAME, LOCATION_CODE
  FROM ( /* ... 연속불량 감지 서브쿼리 — repeatability와 동일 구조 ... */ )
)
`;
}
