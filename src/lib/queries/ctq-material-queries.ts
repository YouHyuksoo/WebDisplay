/**
 * @file ctq-material-queries.ts
 * @description CTQ 원자재/Open-Short 불량 모니터링 SQL 쿼리
 *
 * 초보자 가이드:
 * - sqlCtqMaterial: 부품별 일일/90일 누적 NG 집계 (Open/Short 소분류 제외)
 * - sqlCtqOpenShort: ICT 공정 Open/Short 불량 집계 (BAD_REASON_CODE B2020/B2030)
 */

/* ============================================================
 * 4. 원자재 동일부품 (Material)
 * ============================================================ */

/** 부품별 일일/90일 누적 NG 집계 */
export function sqlCtqMaterial(): string {
  return `
SELECT t.LINE_CODE,
       t.DEFECT_ITEM_CODE AS DEFECT_ITEM,
       SUM(CASE WHEN t.QC_DATE >= TO_DATE(:dayStart, 'YYYY/MM/DD HH24:MI:SS') THEN 1 ELSE 0 END) AS NG_DAILY,
       COUNT(*) AS NG_90D
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:ts90, 'YYYY/MM/DD HH24:MI:SS')
  AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
  AND t.SERIAL_NO LIKE 'VN%'
  AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
  AND t.DEFECT_ITEM_CODE IS NOT NULL AND t.DEFECT_ITEM_CODE <> '*'
  -- Open/Short 대상 소분류 제외
  AND t.DEFECT_ITEM_CODE NOT LIKE '2703M01%'
  AND t.DEFECT_ITEM_CODE NOT LIKE '2005A01%'
  AND t.DEFECT_ITEM_CODE NOT LIKE '2007A01%'
  AND t.DEFECT_ITEM_CODE NOT LIKE '2007M01%'
  AND t.DEFECT_ITEM_CODE NOT LIKE '2011A01%'
  AND t.DEFECT_ITEM_CODE NOT LIKE '2203A01%'
  AND NOT EXISTS (
    SELECT 1 FROM IQ_MACHINE_HIPOT_POWER_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
    UNION ALL SELECT 1 FROM IQ_MACHINE_BURNIN_SMPS_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
    UNION ALL SELECT 1 FROM IQ_MACHINE_ATE_SERVER_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
    UNION ALL SELECT 1 FROM IQ_MACHINE_FT1_SMPS_DATA_RAW r WHERE r.PID = t.SERIAL_NO AND r.QC_CONFIRM_YN = 'Y'
  )
  /* AND t.LINE_CODE IN (:line0, ...) */
GROUP BY t.LINE_CODE, t.DEFECT_ITEM_CODE
HAVING COUNT(*) >= 2
`;
}

/* ============================================================
 * 5. Open/Short — ICT 공정
 * ============================================================ */

/** Open/Short 불량 집계 (BAD_REASON_CODE: B2020/B2030) */
export function sqlCtqOpenShort(): string {
  return `
SELECT t.LINE_CODE,
       t.BAD_REASON_CODE,
       COUNT(*) AS CNT,
       TO_CHAR(MAX(t.QC_DATE), 'YYYY/MM/DD HH24:MI:SS') AS LAST_TIME
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:dayStart, 'YYYY/MM/DD HH24:MI:SS')
  AND t.BAD_REASON_CODE IN ('B2020', 'B2030')
  AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
  AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
  AND t.DEFECT_ITEM_CODE IS NOT NULL AND t.DEFECT_ITEM_CODE <> '*'
  -- Open/Short 대상 소분류만 포함
  AND (t.DEFECT_ITEM_CODE LIKE '2703M01%' OR t.DEFECT_ITEM_CODE LIKE '2005A01%'
    OR t.DEFECT_ITEM_CODE LIKE '2007A01%' OR t.DEFECT_ITEM_CODE LIKE '2007M01%'
    OR t.DEFECT_ITEM_CODE LIKE '2011A01%' OR t.DEFECT_ITEM_CODE LIKE '2203A01%')
  /* AND t.LINE_CODE IN (:line0, ...) */
GROUP BY t.LINE_CODE, t.BAD_REASON_CODE
`;
}
