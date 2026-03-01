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
 * PB 원본 SQL 기반 — issue_compare_yn='Y' 조건으로 출고 아이템만 필터.
 * 최적화: F_GET_MSL_PASSED_TIME을 서브쿼리에서 1회만 호출 (원본은 5회/행).
 * @returns SQL 문자열
 */
export function sqlMslWarningIssueList(): string {
  return `
SELECT line_name,
       item_code                                        AS ITEM_CODE,
       item_name                                        AS ITEM_NAME,
       lot_no                                           AS LOT_NO,
       feeding_date                                     AS FEEDING_DATE,
       msl_level                                        AS MSL_LEVEL,
       msl_max_hour                                     AS MSL_MAX_HOUR,
       trunc(passed_raw, 2)                             AS MSL_PASSED_HOUR,
       (msl_max_hour - trunc(passed_raw, 2))            AS MSL_REMAIN_HOUR,
       trunc(passed_raw / msl_max_hour * 100, 2)        AS MSL_PASSED_RATE
  FROM (
    SELECT /*+ index (b INDXIM_ITEM_RECEIPT_BARCODE4) */
           f_get_line_name(b.LINE_CODE, 1)                    AS line_name,
           b.item_code,
           m.item_name,
           regexp_substr(b.item_barcode, '[^-]+', 1, 2)       AS lot_no,
           b.feeding_date,
           m.MSL_level                                        AS msl_level,
           m.MSL_MAX_TIME                                     AS msl_max_hour,
           nvl(F_GET_MSL_PASSED_TIME(b.item_barcode), 0)      AS passed_raw,
           b.issue_compare_date
      FROM im_item_receipt_barcode b,
           id_item                 m
     WHERE b.item_code          = m.item_code
       AND b.organization_id    = m.organization_id
       AND b.issue_compare_yn   = 'Y'
       AND b.organization_id    = 1
       AND NVL(b.reel_destroy_yn, 'N') <> 'Y'
       AND m.msl_level          >= '2A'
  )
 WHERE trunc(passed_raw, 2) > 0
 ORDER BY trunc(passed_raw / msl_max_hour * 100, 2) DESC,
          issue_compare_date DESC
`;
}

/**
 * MSL NG 건수 조회 — 출고기준 (d_display_msl_waring_ng_count_issue_item).
 * msl_passed_rate > 90 인 건수를 센다.
 * 인덱스 힌트는 PB 원본 그대로 적용.
 * @returns SQL 문자열
 */
export function sqlMslWarningIssueNgCount(): string {
  return `
SELECT /*+ index (b INDXIM_ITEM_RECEIPT_BARCODE4) */
       nvl(sum(1), 0) AS NG_COUNT
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
