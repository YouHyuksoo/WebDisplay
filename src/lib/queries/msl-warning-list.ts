/**
 * @file msl-warning-list.ts
 * @description MSL Warning List 화면(메뉴 29) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_msl_waring_list.srd에서 추출한 SQL.
 * IM_ITEM_MSL_CHECK_VIEW 뷰에서 MSL Level 2A 이상 아이템의 경과/잔여 시간을 조회한다.
 * 원본 PB 컬럼 순서: Line Name → Location Code → MSL Level → Item Code → Lot No
 *                    → MSL Max Time → MSL Passed Time → MSL Remain Time
 * 색상 로직: msl_used_rate >= 90 → RED, 70~90 → YELLOW, < 70 → 기본
 */

/**
 * MSL Warning 메인 리스트 조회 (d_display_msl_waring_list).
 * PB 원본 SQL 그대로 — 라인 필터 없음 (원본에서도 주석 처리).
 * @returns SQL 문자열
 */
export function sqlMslWarningList(): string {
  return `
SELECT line_name,
       location_code,
       item_code,
       lot_no,
       trunc(passed_time, 2)                          AS msl_passed_hour,
       msl_level,
       msl_max_time                                   AS msl_max_hour,
       trunc(msl_max_time - passed_time, 2)           AS msl_remain_hour,
       (
         SELECT nvl(sum(1), 0)
           FROM isys_sound_ment
          WHERE organization_id = 1
            AND sound_group    = 'MSL'
            AND sound_status   = 'O'
            AND line_code      = A.line_code
            AND machine_code   = A.lot_no
            AND rownum = 1
       ) AS ng_count,
       (nvl(passed_time, 0) / nvl(msl_max_time, 0)) * 100 AS msl_used_rate
  FROM (
         SELECT line_code,
                f_get_line_name(line_code, 1)          AS line_name,
                location_code,
                item_code,
                lot_no,
                msl_pre_passed_time,
                passed_time,
                msl_level,
                msl_max_time,
                (SELECT min(check_date)
                   FROM ib_smt_checkhist
                  WHERE lot_no = a.lot_no)             AS check_min_time,
                (SELECT max(check_date)
                   FROM ib_smt_checkhist
                  WHERE lot_no = a.lot_no)             AS check_max_time,
                round(
                  (SELECT (max(check_date) - min(check_date)) * 24
                     FROM ib_smt_checkhist
                    WHERE lot_no = a.lot_no)
                )                                      AS check_pass_time,
                (SELECT sum(1)
                   FROM ib_smt_checkhist
                  WHERE lot_no = a.lot_no
                    AND check_status = 'P')            AS check_count,
                (
                  SELECT nvl(sum(1), 0)
                    FROM IM_ITEM_BAKING_MASTER
                   WHERE lot_no = a.lot_no
                     AND rownum = 1
                )                                      AS baking_count
           FROM IM_ITEM_MSL_CHECK_VIEW a
          WHERE MSL_LEVEL >= '2A'
       ) a
 ORDER BY msl_max_time - round(
            decode(msl_pre_passed_time, 0,
              decode(baking_count, 0, check_pass_time + passed_time, passed_time),
              passed_time
            )
          )
`;
}

/**
 * MSL NG 건수 조회 (d_display_msl_waring_ng_count).
 * PB 원본에서 msl_passed_hour/msl_max_hour > 0.99 AND ng_count >= 1인 건수를 센다.
 * NG > 0이면 경고 사운드 대신 화면 상단에 경고 배너를 표시한다.
 * @returns SQL 문자열
 */
export function sqlMslNgCount(): string {
  return `
SELECT nvl(sum(1), 0) AS ng_count
  FROM (
    SELECT line_name,
           location_code,
           item_code,
           lot_no,
           trunc(passed_time, 2)                          AS msl_passed_hour,
           msl_level,
           msl_max_time                                   AS msl_max_hour,
           trunc(msl_max_time - passed_time, 2)           AS msl_remain_hour,
           (
             SELECT nvl(sum(1), 0)
               FROM isys_sound_ment
              WHERE organization_id = 1
                AND sound_group    = 'MSL'
                AND sound_status   = 'O'
                AND line_code      = A.line_code
                AND machine_code   = A.lot_no
                AND rownum = 1
           ) AS ng_count
      FROM (
             SELECT line_code,
                    f_get_line_name(line_code, 1)          AS line_name,
                    location_code,
                    item_code,
                    lot_no,
                    msl_pre_passed_time,
                    passed_time,
                    msl_level,
                    msl_max_time,
                    (SELECT min(check_date)
                       FROM ib_smt_checkhist
                      WHERE lot_no = a.lot_no)             AS check_min_time,
                    (SELECT max(check_date)
                       FROM ib_smt_checkhist
                      WHERE lot_no = a.lot_no)             AS check_max_time,
                    round(
                      (SELECT (max(check_date) - min(check_date)) * 24
                         FROM ib_smt_checkhist
                        WHERE lot_no = a.lot_no)
                    )                                      AS check_pass_time,
                    (SELECT sum(1)
                       FROM ib_smt_checkhist
                      WHERE lot_no = a.lot_no
                        AND check_status = 'P')            AS check_count,
                    (
                      SELECT nvl(sum(1), 0)
                        FROM IM_ITEM_BAKING_MASTER
                       WHERE lot_no = a.lot_no
                         AND rownum = 1
                    )                                      AS baking_count
               FROM IM_ITEM_MSL_CHECK_VIEW a
              WHERE MSL_LEVEL >= '2A'
           ) a
     WHERE decode(msl_pre_passed_time, 0,
             decode(baking_count, 0, check_pass_time + passed_time, passed_time),
             passed_time
           ) >= (msl_max_time * 0.7)
     ORDER BY line_name, location_code
  )
 WHERE msl_passed_hour / msl_max_hour > 0.99
   AND ng_count >= 1
`;
}
