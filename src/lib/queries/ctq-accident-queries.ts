/**
 * @file ctq-accident-queries.ts
 * @description CTQ 사고성 불량 모니터링 SQL 쿼리 (HIPOT/BURNIN/ATE)
 *
 * 초보자 가이드:
 * - HIPOT/ATE 사고성 NG 요약은 sqlCtqAccidentSummary 사용
 * - BURNIN 전용 수리실 등록 건은 sqlCtqAccidentBurnin 사용
 * - 테이블/조인 조건만 다르며 구조는 동일
 */

/* ============================================================
 * 3. 사고성 (Accident) — HIPOT/BURNIN/ATE
 * ============================================================ */

/** HIPOT/ATE 사고성 NG 요약 + 수리판정 상태 분류 */
export function sqlCtqAccidentSummary(): string {
  return `
-- HIPOT 예시 (ATE는 테이블/qcJoinExtra 변경)
SELECT t.LINE_CODE,
       COUNT(*) AS NG_COUNT,
       COUNT(CASE WHEN r.RECEIPT_DEFICIT = '2'
                   AND r.REPAIR_RESULT_CODE IS NOT NULL
                   AND r.REPAIR_RESULT_CODE <> '-'
                  THEN 1 END) AS JUDGED_COUNT,
       COUNT(CASE WHEN r.RECEIPT_DEFICIT = '2'
                   AND (r.REPAIR_RESULT_CODE IS NULL OR r.REPAIR_RESULT_CODE = '-')
                  THEN 1 END) AS PENDING_COUNT,
       MAX(t.INSPECT_DATE) AS LAST_INSPECT
FROM IQ_MACHINE_HIPOT_POWER_DATA_RAW t
JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
  AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
LEFT JOIN IP_PRODUCT_WORK_QC r
  ON r.SERIAL_NO = t.PID AND r.RECEIPT_DEFICIT = '2'
  AND (r.QC_RESULT IS NULL OR r.QC_RESULT != 'O')
WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
  AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
  AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
  AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN <> 'Y')
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

/** BURNIN 전용 — IP_PRODUCT_WORK_QC 수리실 등록 건 집계 */
export function sqlCtqAccidentBurnin(): string {
  return `
SELECT LINE_CODE,
       COUNT(*) AS NG_COUNT,
       COUNT(CASE WHEN REPAIR_RESULT_CODE IS NOT NULL AND REPAIR_RESULT_CODE <> '-' THEN 1 END) AS JUDGED_COUNT,
       COUNT(CASE WHEN REPAIR_RESULT_CODE IS NULL OR REPAIR_RESULT_CODE = '-' THEN 1 END) AS PENDING_COUNT,
       MAX(QC_DATE_STR) AS LAST_INSPECT
FROM (
  SELECT t.LINE_CODE,
         TO_CHAR(t.QC_DATE, 'YYYYMMDDHH24MISS') AS QC_DATE_STR,
         t.REPAIR_RESULT_CODE,
         ROW_NUMBER() OVER (PARTITION BY t.SERIAL_NO ORDER BY t.QC_DATE DESC) AS RN
  FROM IP_PRODUCT_WORK_QC t
  WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
    AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
    AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
    AND t.RECEIPT_DEFICIT = '1'
    AND t.WORKSTAGE_CODE = 'W500'
    AND t.LINE_CODE IS NOT NULL
    AND (t.QC_RESULT IS NULL OR t.QC_RESULT != 'O')
    /* AND t.LINE_CODE IN (:line0, ...) */
) WHERE RN = 1
GROUP BY LINE_CODE
`;
}
