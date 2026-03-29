/**
 * @file ctq-indicator-queries.ts
 * @description CTQ 지표(Indicator) 및 NG 상세 SQL 쿼리
 *
 * 초보자 가이드:
 * - sqlCtqIndicator: 공정별 월간 PPM MERGE 캐시 (IQ_INDICATOR_MONTHLY)
 * - sqlCtqIndicatorCache: 캐시 테이블 조회
 * - sqlCtqNgDetailsRaw: 공정별 NG 상세 (클릭 모달용)
 * - sqlCtqNgDetailsMaterial: Material NG 상세 (90일 범위)
 */

/* ============================================================
 * 10. NG 상세 (NG Details) — 클릭 모달용
 * ============================================================ */

/** RAW 공정별 NG 상세 (FT 예시) */
export function sqlCtqNgDetailsRaw(): string {
  return `
-- type=FT/ATE/HIPOT/BURNIN 공통 구조 (테이블만 변경)
SELECT t.INSPECT_DATE AS INSPECT_TIME,
       t.PID,
       NVL(F_GET_MODEL_NAME_BY_PID(t.PID), NVL(r.MODEL_NAME, '-')) AS MODEL_NAME,
       NVL(r.RECEIPT_DEFICIT, '-') AS RECEIPT_DEFICIT,
       NVL(r.LOCATION_CODE, '-') AS LOCATION_CODE,
       NVL(r.REPAIR_RESULT_CODE, '-') AS REPAIR_RESULT_CODE,
       NVL(r.QC_INSPECT_HANDLING, '-') AS QC_INSPECT_HANDLING,
       NVL(r.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
       t.INSPECT_RESULT,
       NVL(r.BAD_REASON_CODE, '-') AS BAD_REASON_CODE,
       NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', r.BAD_REASON_CODE, 'C', 1), '-') AS BAD_REASON_NAME,
       NVL(F_GET_WORKSTAGE_NAME(r.WORKSTAGE_CODE), NVL(r.WORKSTAGE_CODE, '-')) AS WORKSTAGE_NAME,
       NVL(r.BAD_PHENOMENON, '-') AS BAD_PHENOMENON
FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
  AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
LEFT JOIN (
  SELECT * FROM (
    SELECT rr.*, ROW_NUMBER() OVER (PARTITION BY rr.SERIAL_NO ORDER BY rr.QC_DATE DESC) AS RN
    FROM IP_PRODUCT_WORK_QC rr WHERE rr.RECEIPT_DEFICIT = '2'
  ) WHERE RN = 1
) r ON r.SERIAL_NO = t.PID
WHERE t.INSPECT_DATE >= :tsStart AND t.INSPECT_DATE < :tsEnd
  AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
  AND t.INSPECT_RESULT NOT IN ('PASS', 'GOOD', 'OK', 'Y')
  AND (t.QC_CONFIRM_YN IS NULL OR t.QC_CONFIRM_YN != 'Y')
  AND t.LAST_FLAG = 'Y'
  AND t.LINE_CODE = :lineCode
ORDER BY t.INSPECT_DATE DESC
FETCH FIRST 200 ROWS ONLY
`;
}

/** Material NG 상세 (90일 범위) */
export function sqlCtqNgDetailsMaterial(): string {
  return `
SELECT TO_CHAR(t.QC_DATE, 'YYYY/MM/DD HH24:MI:SS') AS INSPECT_TIME,
       t.SERIAL_NO AS PID,
       NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
       NVL(t.RECEIPT_DEFICIT, '-') AS RECEIPT_DEFICIT,
       NVL(t.LOCATION_CODE, '-') AS LOCATION_CODE,
       NVL(t.REPAIR_RESULT_CODE, '-') AS REPAIR_RESULT_CODE,
       NVL(t.QC_INSPECT_HANDLING, '-') AS QC_INSPECT_HANDLING,
       NVL(t.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
       NVL(t.BAD_REASON_CODE, '-') AS BAD_REASON_CODE,
       NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1), '-') AS BAD_REASON_NAME,
       NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), NVL(t.WORKSTAGE_CODE, '-')) AS WORKSTAGE_NAME
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
  AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
  AND t.LINE_CODE = :lineCode AND t.LINE_CODE <> '*'
  AND t.DEFECT_ITEM_CODE = :defectItem AND t.DEFECT_ITEM_CODE <> '*'
ORDER BY t.QC_DATE DESC
FETCH FIRST 200 ROWS ONLY
`;
}

/* ============================================================
 * 11. 지표 (Indicator) — 월간 PPM
 * ============================================================ */

/** 공정별 월간 PPM 집계 (MERGE 캐시) */
export function sqlCtqIndicator(): string {
  return `
-- 5개 공정 각각 MERGE INTO 실행, FT 예시
MERGE INTO IQ_INDICATOR_MONTHLY tgt
USING (
  SELECT :tm AS TM,
         b.ITEM_CODE,
         :pc AS PC,
         SUM(CASE WHEN t.INSPECT_RESULT NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) AS NG_CNT,
         COUNT(*) AS TOT_CNT,
         CASE WHEN COUNT(*) > 0
              THEN ROUND(SUM(CASE WHEN t.INSPECT_RESULT NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) / COUNT(*) * 1000000)
              ELSE 0 END AS PPM_VAL
  FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
  JOIN IP_PRODUCT_2D_BARCODE b ON b.SERIAL_NO = t.PID
  WHERE t.INSPECT_DATE >= :startStr AND t.INSPECT_DATE < :endStr
    AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
    AND t.LINE_CODE IS NOT NULL
    AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    AND t.LAST_FLAG = 'Y'
  GROUP BY b.ITEM_CODE
) src
ON (tgt.TARGET_MONTH = src.TM AND tgt.ITEM_CODE = src.ITEM_CODE AND tgt.PROCESS_CODE = src.PC)
WHEN MATCHED THEN
  UPDATE SET tgt.NG_COUNT = src.NG_CNT, tgt.TOTAL_COUNT = src.TOT_CNT,
             tgt.PPM = src.PPM_VAL, tgt.UPDATED_DATE = SYSDATE
WHEN NOT MATCHED THEN
  INSERT (TARGET_MONTH, ITEM_CODE, PROCESS_CODE, NG_COUNT, TOTAL_COUNT, PPM, CREATED_DATE, UPDATED_DATE)
  VALUES (src.TM, src.ITEM_CODE, src.PC, src.NG_CNT, src.TOT_CNT, src.PPM_VAL, SYSDATE, SYSDATE)
`;
}

/** 캐시 데이터 조회 */
export function sqlCtqIndicatorCache(): string {
  return `
SELECT TARGET_MONTH, ITEM_CODE, PROCESS_CODE, NG_COUNT, TOTAL_COUNT, PPM, COUNTERMEASURE_NO
FROM IQ_INDICATOR_MONTHLY
WHERE TARGET_MONTH = :tm
`;
}
