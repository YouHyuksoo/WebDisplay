/**
 * @file ctq-dashboard-queries.ts
 * @description CTQ 품질 대시보드 SQL 쿼리 (공정별 불량, 불량코드, 수리율, RAW 집계)
 *
 * 초보자 가이드:
 * - sqlCtqDashboardProcess: 공정별 불량 건수
 * - sqlCtqDashboardBadCode: 불량코드 TOP10
 * - sqlCtqDashboardRepair: 수리완료율
 * - sqlCtqDashboardRawUnion: 5개 공정 RAW UNION ALL 집계
 * - sqlCtqDashboardRawNgMatrix: 라인x공정 NG 매트릭스
 * - sqlCtqDashboardRawWeeklyTrend: 주간 직행율 추이
 */

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
