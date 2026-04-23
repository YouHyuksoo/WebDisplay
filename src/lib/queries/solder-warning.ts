/**
 * @file solder-warning.ts
 * @description Solder Paste Warning List 화면(메뉴 31) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_solder_waring_list_duckil3.srd 에서 추출한 SQL.
 * IM_ITEM_SOLDER_MASTER 테이블에서 경고 상태인 솔더 페이스트만 필터하여 조회한다.
 *
 * 경고 조건 (d_display_solder_waring_list2 주석 + d_display_solder_waring_ng_count2 활성):
 *   - gap3(개봉후경과) 5자리 && > '10:00'
 *   - aftr_unfreezing_time(해동후경과) > '22:00'
 *   - valid_date_check(유효기간잔여) ≤ 2일
 *
 * 색상 로직:
 *   valid_date_check ≤ 0 → RED, ≤ 2 → ORANGE
 *   gap3 > '11:30' (5자리) → RED, > '10:00' → ORANGE
 *   aftr_unfreezing_time > '23:30' → RED, > '22:00' → ORANGE
 */

/**
 * Solder Paste Warning 메인 리스트 조회.
 * 1) 내부 서브쿼리: 기본 컬럼 + 경과시간 함수 계산 (F_GET_SOLDER_INPUT_LIST 제외)
 * 2) 중간 서브쿼리: 경고 조건 필터 적용 → 대폭 행 감소
 * 3) 외부: F_GET_SOLDER_INPUT_LIST는 필터 통과한 행에만 실행 (성능 최적화)
 */
export function sqlSolderWarningList(): string {
  return `
SELECT w.LOT_NO,
       w.ITEM_CODE,
       w.ISSUE_DATE,
       w.UNFREEZING_END_DATE,
       w.GAP1,
       w.VISCOSITY_FILE_NAME,
       F_GET_SOLDER_INPUT_LIST(w.LOT_NO)  AS LINE_CODE,
       w.INPUT_DATE,
       w.GAP2,
       w.GAP3,
       w.VALID_DATE,
       w.MIX_TIME,
       w.AFTR_UNFREEZING_TIME,
       w.VALID_DATE_CHECK,
       w.VISCOSITY_DATE
  FROM (
    SELECT ITEM_BARCODE                                                                              AS LOT_NO,
           ITEM_CODE,
           ISSUE_DATE,
           UNFREEZING_END_DATE,
           F_GET_TIME_TERM_HMI(NVL(ISSUE_DATE, SYSDATE), NVL(UNFREEZING_END_DATE, SYSDATE))         AS GAP1,
           SUBSTR(VISCOSITY_FILE_NAME, 1, 10)                                                        AS VISCOSITY_FILE_NAME,
           VISCOSITY_START_DATE                                                                       AS VISCOSITY_DATE,
           INPUT_DATE,
           F_GET_TIME_TERM_HMI(NVL(NVL(FIRST_LINE_INPUT_DATE, INPUT_DATE), SYSDATE), SYSDATE)       AS GAP2,
           F_GET_TIME_TERM_HHMISS(NVL(INPUT_DATE, SYSDATE), SYSDATE)                                     AS GAP3,
           VALID_DATE,
           F_GET_TIME_TERM_HHMISS(
             NVL(MIX_START_DATE, SYSDATE),
             NVL(MIX_END_DATE, SYSDATE)
           )                                                                                          AS MIX_TIME,
           F_GET_TIME_TERM_HHMISS(
             NVL(UNFREEZING_START_DATE, SYSDATE),
             NVL(DESTROY_DATE, SYSDATE)
           )                                                                                          AS AFTR_UNFREEZING_TIME,
           TRUNC(VALID_DATE) - TRUNC(SYSDATE)                                                        AS VALID_DATE_CHECK
      FROM IM_ITEM_SOLDER_MASTER
     WHERE ISSUE_DATE IS NOT NULL
       AND DESTROY_DATE IS NULL
       AND ORGANIZATION_ID = 1
  ) w
 WHERE (LENGTH(w.GAP3) = 5 AND w.GAP3 > '10:00')
    OR w.AFTR_UNFREEZING_TIME > '22:00'
    OR w.VALID_DATE_CHECK <= 2
 ORDER BY CASE WHEN F_GET_SOLDER_INPUT_LIST(w.LOT_NO) IS NULL THEN 1 ELSE 0 END,
          LINE_CODE,
          w.LOT_NO
 FETCH FIRST 500 ROWS ONLY
`;
}

/**
 * Solder Paste NG 건수 조회 (d_display_solder_waring_ng_count2).
 * gap3 > '11:30' (5자리) OR aftr_unfreezing_time > '23:30' OR 유효기간 만료 시 NG.
 * NG > 0이면 경고 사운드 대신 화면 상단에 경고 배너를 표시한다.
 */
export function sqlSolderNgCount(): string {
  return `
SELECT COUNT(*) AS NG_COUNT
  FROM IM_ITEM_SOLDER_MASTER
 WHERE ISSUE_DATE IS NOT NULL
   AND DESTROY_DATE IS NULL
   AND ORGANIZATION_ID = 1
   AND (
     (
       LENGTH(
         F_GET_TIME_TERM_HMI(
           NVL(NVL(NVL(VISCOSITY_START_DATE, FIRST_LINE_INPUT_DATE), INPUT_DATE), SYSDATE),
           SYSDATE
         )
       ) = 5
       AND F_GET_TIME_TERM_HMI(
             NVL(NVL(NVL(VISCOSITY_START_DATE, FIRST_LINE_INPUT_DATE), INPUT_DATE), SYSDATE),
             SYSDATE
           ) > '11:30'
     )
     OR F_GET_TIME_STR(
          DECODE(
            SIGN((NVL(DESTROY_DATE, SYSDATE) - NVL(UNFREEZING_START_DATE, SYSDATE)) * 24),
            -1, 0,
            (NVL(DESTROY_DATE, SYSDATE) - NVL(UNFREEZING_START_DATE, SYSDATE)) * 24
          )
        ) > '23:30'
     OR (TRUNC(VALID_DATE) - TRUNC(SYSDATE)) <= 0
   )
`;
}
