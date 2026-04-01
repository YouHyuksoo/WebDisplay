/**
 * @file product-io-status.ts
 * @description 투입/포장 모니터링 화면(메뉴 22, 23) SQL 쿼리 모듈.
 *
 * 초보자 가이드:
 * 1. 이 파일은 단일 라인의 오늘 계획, 시간대별 실적, 총 실적을 조회하는 SQL을 제공한다.
 * 2. 메뉴 22(투입, W310)와 메뉴 23(포장, W220)은 WORKSTAGE_CODE만 다르고 동일한 쿼리를 사용.
 * 3. `mapTimeZoneToGroup`으로 WORK_TIME_ZONE(AA~BL)을 2시간 묶음 인덱스(0~5)로 변환.
 * 4. `getCurrentShift`로 현재 시간 기준 주간(A)/야간(B) 구분.
 * 5. PB 원본: w_display_product_io_status
 */

/* ------------------------------------------------------------------ */
/*  시간대 레이블                                                      */
/* ------------------------------------------------------------------ */

/**
 * 시프트별 5타임 구간 정보.
 * IO_DATE의 실제 시각(HH24MI)으로 매핑한다.
 *   주간: A(08:00~10:00), B(10:10~12:00), C(13:00~15:00), D(15:10~17:00), E(17:30~19:50)
 *   야간: A(20:00~22:00), B(22:10~00:00), C(01:00~03:00), D(03:10~05:00), E(05:30~07:50)
 */
export const SHIFT_ZONES: Record<string, { zone: string; label: string }[]> = {
  A: [
    { zone: 'A', label: '08:00~10:00' },
    { zone: 'B', label: '10:10~12:00' },
    { zone: 'C', label: '13:00~15:00' },
    { zone: 'D', label: '15:10~17:00' },
    { zone: 'E', label: '17:30~19:50' },
  ],
  B: [
    { zone: 'A', label: '20:00~22:00' },
    { zone: 'B', label: '22:10~00:00' },
    { zone: 'C', label: '01:00~03:00' },
    { zone: 'D', label: '03:10~05:00' },
    { zone: 'E', label: '05:30~07:50' },
  ],
};

/* ------------------------------------------------------------------ */
/*  IO_DATE 시간 보정: MES가 한국시간(KST,UTC+9)으로 저장하므로         */
/*  베트남 로컬(ICT,UTC+7) 기준으로 -2시간 보정하여 그룹핑한다          */
/* ------------------------------------------------------------------ */
const IO_LOCAL = `(IO_DATE - 2/24)`;

/**
 * 현재 shift의 시작 시각 (베트남 로컬 기준).
 * TRUNC(SYSDATE - X/24) + X/24 패턴: X시를 자정처럼 취급.
 * - 주간: 08:00 경계 → TRUNC(SYSDATE - 8/24) + 8/24
 * - 야간: 20:00 경계 → TRUNC(SYSDATE - 20/24) + 20/24
 */
const SHIFT_START = `CASE
  WHEN TO_NUMBER(TO_CHAR(SYSDATE,'HH24')) BETWEEN 8 AND 19
  THEN TRUNC(SYSDATE - 8/24) + 8/24
  ELSE TRUNC(SYSDATE - 20/24) + 20/24
END`;

/* ------------------------------------------------------------------ */
/*  현재 시프트 판별                                                    */
/* ------------------------------------------------------------------ */

/**
 * 현재 시프트를 서버(Oracle)에서 조회하는 SQL.
 * 작업일 기준: 08:00~08:00 (08시 이전이면 전일 야간, 08시 이후면 당일 주간)
 * @returns SQL 문자열
 */
export function sqlCurrentShift(): string {
  return `
SELECT CASE WHEN TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) >= 8
            AND TO_NUMBER(TO_CHAR(SYSDATE, 'HH24')) < 20
       THEN 'A' ELSE 'B' END AS SHIFT_CODE,
       TO_CHAR(F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A'), 'YYYYMMDD') AS WORK_DATE
  FROM DUAL
`;
}

/* ------------------------------------------------------------------ */
/*  SQL 쿼리                                                           */
/* ------------------------------------------------------------------ */

/**
 * 단일 라인 오늘 생산계획 조회.
 * @returns SQL 문자열 (바인드: lineCode, orgId)
 */
export function sqlProductPlan(): string {
  return `
SELECT t.PLAN_DATE, t.LINE_CODE,
       F_GET_LINE_NAME(t.LINE_CODE, 1) AS LINE_NAME,
       t.SHIFT_CODE, t.PLAN_QTY, t.UPH, t.MODEL_NAME, t.ITEM_CODE,
       t.WORKER_QTY, t.COMMENTS, t.LEADER_ID, t.SUB_LEADER_ID,
       NVL(leader.USER_NAME, t.LEADER_ID) AS LEADER_NAME,
       NVL(sub_leader.USER_NAME, t.SUB_LEADER_ID) AS SUB_LEADER_NAME
  FROM IP_PRODUCT_LINE_TARGET t
  LEFT JOIN ISYS_USERS leader ON leader.USER_ID = t.LEADER_ID
  LEFT JOIN ISYS_USERS sub_leader ON sub_leader.USER_ID = t.SUB_LEADER_ID
 WHERE t.LINE_CODE = :lineCode AND t.ORGANIZATION_ID = :orgId
   AND t.PLAN_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
   AND t.SHIFT_CODE = :shift
`;
}

/**
 * 시간대별 실적 조회 — IO_DATE 시각 기반 5타임 CASE 분류.
 * 주간: A(08:00~10:09), B(10:10~12:59), C(13:00~15:09), D(15:10~17:29), E(17:30~19:59)
 * 야간: A(20:00~22:09), B(22:10~00:59), C(01:00~03:09), D(03:10~05:29), E(05:30~07:59)
 * @returns SQL 문자열 (바인드: lineCode, workstageCode, orgId)
 */
export function sqlTimeZoneActual(): string {
  return `
SELECT TIME_SLOT, SUM(IO_QTY) AS QTY FROM (
  SELECT IO_QTY,
    CASE
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '0800' AND '1009' THEN 'A'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '1010' AND '1259' THEN 'B'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '1300' AND '1509' THEN 'C'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '1510' AND '1729' THEN 'D'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '1730' AND '1959' THEN 'E'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '2000' AND '2209' THEN 'A'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '2210' AND '2359' THEN 'B'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '0000' AND '0059' THEN 'B'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '0100' AND '0309' THEN 'C'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '0310' AND '0529' THEN 'D'
      WHEN TO_CHAR(${IO_LOCAL},'HH24MI') BETWEEN '0530' AND '0759' THEN 'E'
      ELSE 'X'
    END AS TIME_SLOT
  FROM IP_PRODUCT_WORKSTAGE_IO
  WHERE LINE_CODE = :lineCode AND WORKSTAGE_CODE = :workstageCode
    AND ORGANIZATION_ID = :orgId AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
    AND ${IO_LOCAL} >= ${SHIFT_START}
    AND ${IO_LOCAL} <= SYSDATE
)
WHERE TIME_SLOT != 'X'
GROUP BY TIME_SLOT ORDER BY TIME_SLOT
`;
}

/**
 * 총 실적 수량 조회 (당일 전체 카운트).
 * @returns SQL 문자열 (바인드: lineCode, workstageCode, orgId)
 */
export function sqlTotalActual(): string {
  return `
SELECT SUM(IO_QTY) AS TOTAL_QTY FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode AND WORKSTAGE_CODE = :workstageCode
   AND ORGANIZATION_ID = :orgId AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
   AND ${IO_LOCAL} >= ${SHIFT_START}
   AND ${IO_LOCAL} <= SYSDATE
`;
}

/**
 * 모델별 실적 집계 — 계획 없어도 실적 발생한 모든 모델을 최초 IO 시간순으로 반환.
 * @returns SQL 문자열 (바인드: lineCode, workstageCode, orgId)
 */
export function sqlModelActuals(): string {
  return `
SELECT MODEL_NAME, ITEM_CODE,
       SUM(IO_QTY) AS QTY,
       MIN(IO_DATE) AS FIRST_IO
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode AND WORKSTAGE_CODE = :workstageCode
   AND ORGANIZATION_ID = :orgId AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
   AND ${IO_LOCAL} >= ${SHIFT_START}
   AND ${IO_LOCAL} <= SYSDATE
 GROUP BY MODEL_NAME, ITEM_CODE
 ORDER BY MIN(IO_DATE)
`;
}
