/**
 * @file msl-warning-issue.ts
 * @description MSL Warning List 출고기준 화면(메뉴 30) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_msl_waring_list_issue_item.srd에서 추출한 SQL.
 * im_item_receipt_barcode + id_item 조인으로 출고 기준 MSL 경과/잔여 시간을 조회한다.
 * 장착기준(메뉴 29)과 다른 점: IM_ITEM_MSL_CHECK_VIEW 대신 im_item_receipt_barcode 사용,
 * F_GET_MSL_PASSED_TIME 함수로 경과 시간 계산, item_name/feeding_date 컬럼 포함.
 * 색상 로직: msl_passed_rate >= 90 → RED, 70~90 → YELLOW, < 70 → 기본
 */

/**
 * MSL Warning 출고기준 메인 리스트 조회 (d_display_msl_waring_list_issue_item).
 * PB 원본 SQL 그대로 — issue_compare_yn='Y' 조건으로 출고 아이템만 필터.
 * @returns SQL 문자열
 */
export function sqlMslWarningIssueList(): string {
  return `
SELECT f_get_line_name(b.LINE_CODE, 1)                                          AS LINE_NAME,
       b.item_code                                                               AS ITEM_CODE,
       m.item_name                                                               AS ITEM_NAME,
       regexp_substr(b.item_barcode, '[^-]+', 1, 2)                             AS LOT_NO,
       b.feeding_date                                                            AS FEEDING_DATE,
       m.MSL_level                                                               AS MSL_LEVEL,
       m.MSL_MAX_TIME                                                            AS MSL_MAX_HOUR,
       trunc(nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0), 2)                  AS MSL_PASSED_HOUR,
       (m.MSL_MAX_TIME - trunc(nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0), 2)) AS MSL_REMAIN_HOUR,
       trunc(nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0) / m.msl_max_time * 100, 2) AS MSL_PASSED_RATE
  FROM im_item_receipt_barcode b,
       id_item                 m
 WHERE b.item_code          = m.item_code
   AND b.organization_id    = m.organization_id
   AND b.issue_compare_yn   = 'Y'
   AND b.organization_id    = 1
   AND NVL(b.reel_destroy_yn, 'N') <> 'Y'
   AND m.msl_level          >= '2A'
   AND nvl(trunc(nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0), 2), 0) > 0
 ORDER BY trunc(nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0) / m.msl_max_time * 100, 2) DESC,
          b.issue_compare_date DESC
`;
}

/**
 * MSL NG 건수 조회 — 출고기준 (d_display_msl_waring_ng_count_issue_item).
 * msl_passed_rate > 90 인 건수를 센다.
 * @returns SQL 문자열
 */
export function sqlMslWarningIssueNgCount(): string {
  return `
SELECT nvl(sum(1), 0) AS NG_COUNT
  FROM im_item_receipt_barcode b,
       id_item                 m
 WHERE b.item_code          = m.item_code
   AND b.organization_id    = m.organization_id
   AND b.issue_compare_yn   = 'Y'
   AND b.organization_id    = 1
   AND NVL(b.reel_destroy_yn, 'N') <> 'Y'
   AND m.msl_level          >= '2A'
   AND trunc(nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0) / m.msl_max_time * 100, 2) > 90
`;
}
