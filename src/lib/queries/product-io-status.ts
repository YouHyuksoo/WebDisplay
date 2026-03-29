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

/** 시간대별 레이블 (A: 주간, B: 야간) — 2시간 묶음 6구간 */
export const TIME_LABELS: Record<string, string[]> = {
  A: ['08-10', '10-12', '12-14', '14-16', '16-18', '18-20'],
  B: ['20-22', '22-00', '00-02', '02-04', '04-06', '06-08'],
};

/* ------------------------------------------------------------------ */
/*  시간대 매핑                                                        */
/* ------------------------------------------------------------------ */

/** WORK_TIME_ZONE → 2시간 묶음 인덱스 매핑 테이블 */
const ZONE_MAP: Record<string, number> = {
  AA: 0, AB: 0, AC: 1, AD: 1, AE: 2, AF: 2,
  AG: 3, AH: 3, AI: 4, AJ: 4, AK: 5, AL: 5,
  BA: 0, BB: 0, BC: 1, BD: 1, BE: 2, BF: 2,
  BG: 3, BH: 3, BI: 4, BJ: 4, BK: 5, BL: 5,
};

/**
 * WORK_TIME_ZONE(AA~BL)을 2시간 묶음 인덱스(0~5)로 변환한다.
 * @param zone - 시간대 코드 (예: 'AA', 'BC')
 * @returns 0~5 인덱스, 매칭 안 되면 -1
 */
export function mapTimeZoneToGroup(zone: string): number {
  return ZONE_MAP[zone] ?? -1;
}

/* ------------------------------------------------------------------ */
/*  현재 시프트 판별                                                    */
/* ------------------------------------------------------------------ */

/**
 * 현재 시간 기준으로 주간(A)/야간(B) 시프트를 반환한다.
 * A(주간): 08:00 ~ 19:59, B(야간): 20:00 ~ 07:59
 * @returns 'A' | 'B'
 */
export function getCurrentShift(): string {
  const hour = new Date().getHours();
  return hour >= 8 && hour < 20 ? 'A' : 'B';
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
   AND t.PLAN_DATE = TRUNC(SYSDATE)
`;
}

/**
 * 시간대별 실적 조회 (WORK_TIME_ZONE 별 합계).
 * @returns SQL 문자열 (바인드: lineCode, workstageCode, orgId)
 */
export function sqlTimeZoneActual(): string {
  return `
SELECT WORK_TIME_ZONE, SUM(IO_QTY) AS QTY
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode AND WORKSTAGE_CODE = :workstageCode
   AND ORGANIZATION_ID = :orgId AND ACTUAL_YYYMMDD = TO_CHAR(SYSDATE, 'YYYYMMDD')
 GROUP BY WORK_TIME_ZONE ORDER BY WORK_TIME_ZONE
`;
}

/**
 * 총 실적 수량 조회 (당일 전체 카운트).
 * @returns SQL 문자열 (바인드: lineCode, workstageCode, orgId)
 */
export function sqlTotalActual(): string {
  return `
SELECT COUNT(*) AS TOTAL_QTY FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE LINE_CODE = :lineCode AND WORKSTAGE_CODE = :workstageCode
   AND ORGANIZATION_ID = :orgId AND ACTUAL_YYYMMDD = TO_CHAR(SYSDATE, 'YYYYMMDD')
`;
}
