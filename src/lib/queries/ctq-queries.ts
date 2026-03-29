/**
 * @file ctq-queries.ts
 * @description CTQ 이상점 모니터링 SQL 쿼리 (SqlViewerModal 등록용)
 *
 * 초보자 가이드:
 * - 각 함수는 CTQ API route에서 사용하는 주요 SQL을 반환합니다.
 * - 공정(FT/ATE 등) 파라미터화된 SQL은 FT 테이블 기준으로 대표 예시를 제공합니다.
 * - 라인 필터 위치에 주석 플레이스홀더 포함: /* AND LINE_CODE IN (:line0, ...) * /
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

/* ============================================================
 * 12. 품질 대시보드 (Quality Dashboard)
 * ============================================================ */

/** 공정별 불량 건수 */
export function sqlCtqDashboardProcess(): string {
  return `
SELECT NVL(F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE), t.WORKSTAGE_CODE) AS NAME,
       COUNT(*) AS CNT
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
  AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
  AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
  AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
  /* AND t.LINE_CODE IN (:line0, ...) */
GROUP BY t.WORKSTAGE_CODE, F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE)
ORDER BY CNT DESC
`;
}

/** 불량코드 TOP10 */
export function sqlCtqDashboardBadCode(): string {
  return `
SELECT t.BAD_REASON_CODE || ' ' || NVL(F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1), '') AS NAME,
       COUNT(*) AS CNT
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
  AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
  AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
  AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
  AND t.BAD_REASON_CODE IS NOT NULL
  /* AND t.LINE_CODE IN (:line0, ...) */
GROUP BY t.BAD_REASON_CODE, F_GET_CODE_MASTER('WQC BAD REASON CODE', t.BAD_REASON_CODE, 'C', 1)
ORDER BY CNT DESC FETCH FIRST 10 ROWS ONLY
`;
}

/** 수리완료율 */
export function sqlCtqDashboardRepair(): string {
  return `
SELECT COUNT(*) AS TOTAL_CNT,
       SUM(CASE WHEN t.REPAIR_RESULT_CODE IS NOT NULL AND t.REPAIR_RESULT_CODE <> '-' THEN 1 ELSE 0 END) AS REPAIRED_CNT
FROM IP_PRODUCT_WORK_QC t
WHERE t.QC_DATE >= TO_DATE(:tsStart, 'YYYY/MM/DD HH24:MI:SS')
  AND t.QC_DATE < TO_DATE(:tsEnd, 'YYYY/MM/DD HH24:MI:SS')
  AND (t.SERIAL_NO LIKE 'VN07%' OR t.SERIAL_NO LIKE 'VNL1%' OR t.SERIAL_NO LIKE 'VNA2%')
  AND t.LINE_CODE IS NOT NULL AND t.LINE_CODE <> '*'
  /* AND t.LINE_CODE IN (:line0, ...) */
`;
}

/* ============================================================
 * 13. 품질 대시보드 RAW (Quality Dashboard RAW)
 * ============================================================ */

/** 5개 공정 RAW UNION ALL — 공정별 검사량/시간당 검사량 등 */
export function sqlCtqDashboardRawUnion(): string {
  return `
-- 5개 공정 RAW 테이블 UNION ALL 기반 집계
SELECT PROC AS NAME, COUNT(*) AS CNT
FROM (
  SELECT 'ICT' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_ICT_SERVER_DATA_RAW t
  WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
    AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    /* AND t.LINE_CODE IN (:line0, ...) */
  UNION ALL
  SELECT 'HIPOT' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_HIPOT_POWER_DATA_RAW t
  WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
    AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    /* AND t.LINE_CODE IN (:line0, ...) */
  UNION ALL
  SELECT 'FT' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_FT1_SMPS_DATA_RAW t
  WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
    AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    /* AND t.LINE_CODE IN (:line0, ...) */
  UNION ALL
  SELECT 'BURNIN' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_BURNIN_SMPS_DATA_RAW t
  WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
    AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    /* AND t.LINE_CODE IN (:line0, ...) */
  UNION ALL
  SELECT 'ATE' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_ATE_SERVER_DATA_RAW t
  WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24), 'YYYY/MM/DD') || ' 10:00:00'
    AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    /* AND t.LINE_CODE IN (:line0, ...) */
)
GROUP BY PROC ORDER BY PROC
`;
}

/** 라인x공정 NG 매트릭스 */
export function sqlCtqDashboardRawNgMatrix(): string {
  return `
SELECT F_GET_LINE_NAME(LINE_CODE, 1) AS LINE_NAME, PROC,
       SUM(CASE WHEN INSPECT_RESULT NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) AS NG_CNT
FROM (
  -- 5개 공정 UNION ALL (당일 10:00~익일 10:00)
  SELECT 'ICT' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_ICT_SERVER_DATA_RAW t WHERE /* 날짜조건 */ 1=1
  UNION ALL /* ... HIPOT, FT, BURNIN, ATE ... */
  SELECT 'ATE' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
  FROM IQ_MACHINE_ATE_SERVER_DATA_RAW t WHERE /* 날짜조건 */ 1=1
)
GROUP BY LINE_CODE, F_GET_LINE_NAME(LINE_CODE, 1), PROC
HAVING SUM(CASE WHEN INSPECT_RESULT NOT IN ('PASS','GOOD','OK','Y') THEN 1 ELSE 0 END) > 0
ORDER BY LINE_NAME, PROC
`;
}

/** 주간 직행율 추이 (최근 7일) */
export function sqlCtqDashboardRawWeeklyTrend(): string {
  return `
SELECT DT, PROC,
       CASE WHEN COUNT(DISTINCT PID) > 0
         THEN ROUND(COUNT(DISTINCT CASE WHEN INSPECT_RESULT IN ('PASS','GOOD','OK','Y') THEN PID END)
                     / COUNT(DISTINCT PID) * 100, 1)
         ELSE 0 END AS FPY
FROM (
  SELECT PROC, PID, INSPECT_RESULT,
         TO_CHAR(TO_DATE(SUBSTR(INSPECT_DATE,1,10),'YYYY/MM/DD'), 'MM/DD') AS DT
  FROM (
    -- 5개 공정 UNION ALL (최근 7일)
    SELECT 'ICT' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
    FROM IQ_MACHINE_ICT_SERVER_DATA_RAW t
    WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24)-6, 'YYYY/MM/DD') || ' 10:00:00'
      AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
    UNION ALL /* ... HIPOT, FT, BURNIN, ATE ... */
    SELECT 'ATE' AS PROC, t.PID, t.INSPECT_DATE, t.INSPECT_RESULT, t.LINE_CODE
    FROM IQ_MACHINE_ATE_SERVER_DATA_RAW t
    WHERE t.INSPECT_DATE >= TO_CHAR(TRUNC(SYSDATE-10/24)-6, 'YYYY/MM/DD') || ' 10:00:00'
      AND t.INSPECT_DATE < TO_CHAR(TRUNC(SYSDATE-10/24)+1, 'YYYY/MM/DD') || ' 10:00:00'
  )
)
GROUP BY DT, PROC ORDER BY DT, PROC
`;
}
