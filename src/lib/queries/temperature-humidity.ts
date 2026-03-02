/**
 * @file temperature-humidity.ts
 * @description 온습도 모니터링 화면(메뉴 37) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_temperature_status_ye_img.srd에서 추출한 SQL.
 * ICOM_TEMPERATURE_DATA + IMCN_MACHINE 조인으로 각 설비의 온도/습도 상태를 조회한다.
 * 상태 코드: OK(정상), WN(경고), NG(이상) — 스펙 범위와 워닝 오프셋으로 계산.
 * 헤더 색상: last_time < 10분 → 파랑(정상), >= 10분 → 빨강(데이터 수신 중단).
 */

import { buildInFilter } from '@/lib/display-helpers';

/**
 * 센서 필터 IN 절 생성. buildLineFilter와 동일 패턴.
 * '%' 또는 빈 배열이면 필터 없음 (전체 조회).
 */
export function buildSensorFilter(machines: string[]): { clause: string; binds: Record<string, string> } {
  return buildInFilter(machines, 'M.MACHINE_CODE', 'mc');
}

/**
 * 온습도 센서 데이터 조회 (d_display_temperature_status_ye_img).
 * PB 원본 SQL 그대로 — MACHINE_TYPE='TEMP', MES_DISPLAY_YN='Y' 필터.
 * @param machineClause - buildSensorFilter()로 생성된 IN 절
 * @returns SQL 문자열
 */
export function sqlTempHumidityStatus(machineClause = ''): string {
  return `
SELECT M.MACHINE_NAME,
       TRUNC(T.ROOM_TEMPERATURE, 1) AS ROOM_TEMPERATURE,
       TRUNC(T.HUMIDITY, 1)         AS HUMIDITY,
       CASE
         WHEN MIN_TEMP_VALUE + NVL(TEMP_WARNING_OFFSET, 0) <= ROOM_TEMPERATURE
          AND MAX_TEMP_VALUE - NVL(TEMP_WARNING_OFFSET, 0) >= ROOM_TEMPERATURE
         THEN 'OK'
         WHEN (MIN_TEMP_VALUE <= ROOM_TEMPERATURE AND MIN_TEMP_VALUE + TEMP_WARNING_OFFSET > ROOM_TEMPERATURE)
           OR (MAX_TEMP_VALUE >= ROOM_TEMPERATURE AND MAX_TEMP_VALUE - TEMP_WARNING_OFFSET < ROOM_TEMPERATURE)
         THEN 'WN'
         ELSE 'NG'
       END AS TEMP_STATUS,
       CASE
         WHEN MIN_HUMIDITY_VALUE + NVL(HUMIDITY_WARNING_OFFSET, 0) <= HUMIDITY
          AND MAX_HUMIDITY_VALUE - NVL(HUMIDITY_WARNING_OFFSET, 0) >= HUMIDITY
         THEN 'OK'
         WHEN (MIN_HUMIDITY_VALUE <= HUMIDITY AND MIN_HUMIDITY_VALUE + NVL(HUMIDITY_WARNING_OFFSET, 0) > HUMIDITY)
           OR (MAX_HUMIDITY_VALUE >= HUMIDITY AND MAX_HUMIDITY_VALUE - NVL(HUMIDITY_WARNING_OFFSET, 0) < HUMIDITY)
         THEN 'WN'
         ELSE 'NG'
       END AS HUMIDITY_STATUS,
       (SYSDATE - T.GATHER_DATE) * (24 * 60) AS LAST_TIME,
       M.MES_DISPLAY_SEQUENCE,
       TO_CHAR(M.MIN_TEMP_VALUE) || ' < Spec(' || TEMP_WARNING_OFFSET || ') < ' || TO_CHAR(M.MAX_TEMP_VALUE) AS TEMP_MINMAX,
       TO_CHAR(MIN_HUMIDITY_VALUE) || ' < Spec(' || M.HUMIDITY_WARNING_OFFSET || ') < ' || TO_CHAR(M.MAX_HUMIDITY_VALUE) AS HUMIDITY_MINMAX,
       M.HUMIDITY_YN,
       M.MACHINE_CODE
  FROM ICOM_TEMPERATURE_DATA T,
       IMCN_MACHINE          M
 WHERE M.MACHINE_CODE       = UPPER(T.NODEID (+))
   AND M.ORGANIZATION_ID    = T.ORGANIZATION_ID (+)
   AND M.MACHINE_TYPE       = 'TEMP'
   AND M.MES_DISPLAY_YN     = 'Y'
   AND M.ORGANIZATION_ID    = :orgId
   AND T.NODETYPE            = 1
   ${machineClause}
 ORDER BY M.MES_DISPLAY_SEQUENCE
`;
}

/**
 * 온습도 NG/WN 건수 조회 (d_display_temperature_ng_count).
 * TEMP_STATUS 또는 HUMIDITY_STATUS가 NG/WN이거나 데이터 수신 중단(10분 초과)인 건수.
 * @returns SQL 문자열
 */
export function sqlTempHumidityNgCount(): string {
  return `
SELECT NVL(SUM(1), 0) AS NG_COUNT
  FROM (
    SELECT IMCN_MACHINE.MACHINE_NAME  AS MACHINE_NAME,
           IMCN_MACHINE.MACHINE_CODE  AS MACHINE_CODE,
           CASE
             WHEN MIN_TEMP_VALUE + NVL(TEMP_WARNING_OFFSET, 0) <= ROOM_TEMPERATURE
              AND MAX_TEMP_VALUE - NVL(TEMP_WARNING_OFFSET, 0) >= ROOM_TEMPERATURE
             THEN 'OK'
             WHEN (MIN_TEMP_VALUE <= ROOM_TEMPERATURE AND MIN_TEMP_VALUE + TEMP_WARNING_OFFSET > ROOM_TEMPERATURE)
               OR (MAX_TEMP_VALUE >= ROOM_TEMPERATURE AND MAX_TEMP_VALUE - TEMP_WARNING_OFFSET < ROOM_TEMPERATURE)
             THEN 'WN'
             ELSE 'NG'
           END AS TEMP_STATUS,
           CASE
             WHEN MIN_HUMIDITY_VALUE + NVL(HUMIDITY_WARNING_OFFSET, 0) <= HUMIDITY
              AND MAX_HUMIDITY_VALUE - NVL(HUMIDITY_WARNING_OFFSET, 0) >= HUMIDITY
             THEN 'OK'
             WHEN (MIN_HUMIDITY_VALUE <= HUMIDITY AND MIN_HUMIDITY_VALUE + NVL(HUMIDITY_WARNING_OFFSET, 0) > HUMIDITY)
               OR (MAX_HUMIDITY_VALUE >= HUMIDITY AND MAX_HUMIDITY_VALUE - NVL(HUMIDITY_WARNING_OFFSET, 0) < HUMIDITY)
             THEN 'WN'
             ELSE 'NG'
           END AS HUMIDITY_STATUS,
           (SYSDATE - ICOM_TEMPERATURE_DATA.GATHER_DATE) * (24 * 60) AS LAST_TIME,
           IMCN_MACHINE.HUMIDITY_YN AS HUMIDITY_YN
      FROM ICOM_TEMPERATURE_DATA, IMCN_MACHINE
     WHERE IMCN_MACHINE.MACHINE_CODE     = UPPER(ICOM_TEMPERATURE_DATA.NODEID (+))
       AND IMCN_MACHINE.ORGANIZATION_ID  = ICOM_TEMPERATURE_DATA.ORGANIZATION_ID (+)
       AND IMCN_MACHINE.MES_DISPLAY_YN   = 'Y'
       AND IMCN_MACHINE.MACHINE_TYPE     = 'TEMP'
       AND IMCN_MACHINE.ORGANIZATION_ID  = :orgId
       AND ICOM_TEMPERATURE_DATA.NODETYPE = 1
  )
 WHERE TEMP_STATUS = 'NG'
    OR TEMP_STATUS = 'WN'
    OR ((HUMIDITY_STATUS = 'NG' OR HUMIDITY_STATUS = 'WN') AND HUMIDITY_YN = 'Y')
    OR (SUBSTR(MACHINE_CODE, 1, 2) <> 'SP' AND LAST_TIME >= 10)
`;
}
