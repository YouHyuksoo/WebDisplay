/**
 * @file ctq-quality-queries.ts
 * @description CTQ 품질 관련 SQL 쿼리 (직행율, 설비이상, 설비점검이력, 수리상태)
 *
 * 초보자 가이드:
 * - sqlCtqFpy: 공정별 전일/당일 직행율 (First Pass Yield)
 * - sqlCtqEquipment: 라인별 x 공정별 정지시간 합산
 * - sqlCtqEquipmentWeekly: 공정별 1주일 일별 정지시간 차트용
 * - sqlCtqEquipmentHistory: 설비 가동/정지 이력 개별 레코드
 * - sqlCtqRepairStatus: 당일 불량 PID 수리 현황
 */

/* ============================================================
 * 6. 직행율 (FPY — First Pass Yield)
 * ============================================================ */

/** 공정별 전일/당일 직행율 (FT 예시) */
export function sqlCtqFpy(): string {
  return `
-- 5개 공정(ICT/HIPOT/FT/BURNIN/ATE) 각각 실행, FT 예시
SELECT sub.LINE_CODE, sub.DAY_TYPE,
       COUNT(*) AS TOTAL_CNT,
       SUM(CASE WHEN sub.FIRST_RESULT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) AS PASS_CNT
FROM (
  SELECT t.LINE_CODE,
         CASE WHEN t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
              THEN 'Y' ELSE 'T' END AS DAY_TYPE,
         MIN(t.INSPECT_RESULT) KEEP (DENSE_RANK FIRST ORDER BY t.INSPECT_DATE) AS FIRST_RESULT
  FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
  WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24)-1, 'YYYY/MM/DD') || ' 10:00:00'
    AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    AND t.LINE_CODE IS NOT NULL
    /* AND t.LINE_CODE IN (:line0, ...) */
    AND (t.PID LIKE 'VN07%' OR t.PID LIKE 'VNL1%' OR t.PID LIKE 'VNA2%')
    AND EXISTS (
      SELECT 1 FROM IP_PRODUCT_2D_BARCODE b
      WHERE b.SERIAL_NO = t.PID AND b.ITEM_CODE IS NOT NULL AND b.ITEM_CODE <> '*'
    )
  GROUP BY t.LINE_CODE, t.PID,
           CASE WHEN t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
                THEN 'Y' ELSE 'T' END
) sub
GROUP BY sub.LINE_CODE, sub.DAY_TYPE
`;
}

/* ============================================================
 * 7. 설비이상 (Equipment) — 일일 정지시간
 * ============================================================ */

/** 라인별 x 공정별 정지시간 합산 */
export function sqlCtqEquipment(): string {
  return `
SELECT B.LINE_CODE,
       F_GET_LINE_NAME(B.LINE_CODE, 1) AS LINE_NAME,
       B.LINE_STATUS_CODE,
       SUM((B.END_DATE - B.START_DATE) * 24 * 60) AS STOP_MINUTES
FROM IP_LINE_DAILY_OPERATION_HIST B
WHERE B.ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
  AND B.LINE_STATUS_CODE IN ('ICT', 'HIPOT', 'FT', 'BURNIN', 'ATE')
  /* AND B.LINE_CODE IN (:line0, ...) */
GROUP BY B.LINE_CODE, F_GET_LINE_NAME(B.LINE_CODE, 1), B.LINE_STATUS_CODE
`;
}

/** 공정별 1주일 일별 정지시간 집계 (차트용) */
export function sqlCtqEquipmentWeekly(): string {
  return `
SELECT TO_CHAR(B.ACTUAL_DATE, 'MM/DD') AS ACTUAL_DATE,
       B.LINE_STATUS_CODE,
       ROUND(SUM((B.END_DATE - B.START_DATE) * 24 * 60)) AS STOP_MINUTES
FROM IP_LINE_DAILY_OPERATION_HIST B
WHERE B.ACTUAL_DATE >= TO_DATE(:fromDate, 'YYYY-MM-DD')
  AND B.ACTUAL_DATE <= TO_DATE(:toDate, 'YYYY-MM-DD')
  AND B.LINE_STATUS_CODE IN ('ICT', 'HIPOT', 'FT', 'BURNIN', 'ATE')
  /* AND B.LINE_CODE IN (:line0, ...) */
GROUP BY TO_CHAR(B.ACTUAL_DATE, 'MM/DD'), B.LINE_STATUS_CODE
ORDER BY MIN(B.ACTUAL_DATE)
`;
}

/* ============================================================
 * 8. 설비점검이력 (Equipment History)
 * ============================================================ */

/** 설비 가동/정지 이력 개별 레코드 */
export function sqlCtqEquipmentHistory(): string {
  return `
SELECT B.LINE_CODE,
       F_GET_LINE_NAME(B.LINE_CODE, 1) AS LINE_NAME,
       B.LINE_STATUS_CODE,
       TO_CHAR(B.ACTUAL_DATE, 'YYYY-MM-DD') AS ACTUAL_DATE,
       TO_CHAR(B.START_DATE, 'YYYY-MM-DD HH24:MI:SS') AS START_DATE,
       TO_CHAR(B.END_DATE, 'YYYY-MM-DD HH24:MI:SS') AS END_DATE,
       ROUND((B.END_DATE - B.START_DATE) * 24 * 60, 1) AS STOP_MINUTES
FROM IP_LINE_DAILY_OPERATION_HIST B
WHERE B.ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
  /* AND B.LINE_CODE IN (:line0, ...) */
ORDER BY B.START_DATE DESC
`;
}

/* ============================================================
 * 9. 수리상태 (Repair Status)
 * ============================================================ */

/** 당일 불량 PID 수리 현황 */
export function sqlCtqRepairStatus(): string {
  return `
SELECT TO_CHAR(t.QC_DATE, 'YYYY-MM-DD HH24:MI:SS') AS QC_DATE,
       t.SERIAL_NO,
       t.LINE_CODE,
       F_GET_LINE_NAME(t.LINE_CODE, 1) AS LINE_NAME,
       NVL(t.MODEL_NAME, '-') AS MODEL_NAME,
       NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), NVL(t.WORKSTAGE_CODE, '-')) AS WORKSTAGE_NAME,
       NVL(F_GET_WORKSTAGE_NAME(t.REPAIR_WORKSTAGE_CODE), NVL(t.REPAIR_WORKSTAGE_CODE, '-')) AS REPAIR_WORKSTAGE_NAME,
       NVL(F_GET_BASECODE('QC RESULT', t.QC_RESULT, 'C', 1), NVL(t.QC_RESULT, '-')) AS QC_RESULT_NAME,
       NVL(F_GET_BASECODE('REPAIR RESULT CODE', t.REPAIR_RESULT_CODE, 'C', 1), NVL(t.REPAIR_RESULT_CODE, '-')) AS REPAIR_RESULT_NAME,
       NVL(F_GET_BASECODE('RECEIPT DEFICIT', t.RECEIPT_DEFICIT, 'C', 1), NVL(t.RECEIPT_DEFICIT, '-')) AS RECEIPT_NAME,
       NVL(t.LOCATION_CODE, '-') AS LOCATION_CODE,
       NVL(F_GET_BASECODE('QC INSPECT HANDLING', t.QC_INSPECT_HANDLING, 'C', 1), NVL(t.QC_INSPECT_HANDLING, '-')) AS HANDLING_NAME,
       NVL(t.DEFECT_ITEM_CODE, '-') AS DEFECT_ITEM_CODE,
       NVL(t.BAD_REASON_CODE, '-') AS BAD_REASON_CODE,
       NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1), NVL(t.BAD_REASON_CODE, '-')) AS BAD_REASON_NAME
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
  AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
  AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
  AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
  /* AND t.LINE_CODE IN (:line0, ...) */
ORDER BY t.WORKSTAGE_CODE, t.RECEIPT_DEFICIT, t.QC_DATE DESC
FETCH FIRST 500 ROWS ONLY
`;
}
