/**
 * @file assy-production-status.ts
 * @description 제품생산현황 화면(메뉴 21) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_assy_product_status_lst2.srd에서 추출한 SQL.
 * ip_product_run_card(목표수량)와 ip_product_fg_receipt(시간대별 실적)을
 * UNION ALL로 합쳐 라인/모델별 생산현황을 조회한다.
 */

import { buildLineFilter } from './smd-production';

export { buildLineFilter };

/**
 * 제품생산현황 메인 리스트 조회 (d_display_assy_product_status_lst2).
 * @param lineClause - buildLineFilter()로 생성한 WHERE 조각
 * @returns SQL 문자열
 */
export function sqlAssyProductionList(lineClause: string): string {
  return `
SELECT line_code,
       F_GET_LINE_NAME(line_code, 1) AS LINE_NAME,
       run_date,
       model_name,
       MAX(lot_size)    AS LOT_SIZE,
       MAX(a_time_zone) AS A_TIME_ZONE,
       MAX(b_time_zone) AS B_TIME_ZONE,
       MAX(c_time_zone) AS C_TIME_ZONE,
       MAX(d_time_zone) AS D_TIME_ZONE,
       MAX(e_time_zone) AS E_TIME_ZONE,
       MAX(f_time_zone) AS F_TIME_ZONE,
       MAX(g_time_zone) AS G_TIME_ZONE,
       MAX(h_time_zone) AS H_TIME_ZONE,
       MAX(i_time_zone) AS I_TIME_ZONE,
       MAX(j_time_zone) AS J_TIME_ZONE,
       MAX(result_qty)  AS RESULT_QTY,
       DECODE(MAX(lot_size), 0, 0,
              ROUND(MAX(result_qty) / MAX(lot_size) * 100, 1)) AS PROGRESS_RATE
  FROM (
         SELECT line_code, run_date, model_name, lot_size,
                0 a_time_zone, 0 b_time_zone, 0 c_time_zone,
                0 d_time_zone, 0 e_time_zone, 0 f_time_zone,
                0 g_time_zone, 0 h_time_zone, 0 i_time_zone,
                0 j_time_zone, 0 result_qty
           FROM ip_product_run_card
          WHERE organization_id = :orgId
            ${lineClause}
            AND run_date = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
         UNION ALL
         SELECT line_code, actual_date, model_name,
                0 lot_size,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'A', qty, 0)) a_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'B', qty, 0)) b_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'C', qty, 0)) c_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'D', qty, 0)) d_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'E', qty, 0)) e_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'F', qty, 0)) f_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'G', qty, 0)) g_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'H', qty, 0)) h_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'I', qty, 0)) i_time_zone,
                SUM(DECODE(F_GET_WORKTIME_ZONE(TO_CHAR(receipt_date,'YYYYMMDD'), TO_CHAR(receipt_date,'HH24MI')), 'J', qty, 0)) j_time_zone,
                SUM(qty) result_qty
           FROM ip_product_fg_receipt
          WHERE actual_date = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
            AND organization_id = :orgId
            ${lineClause}
          GROUP BY line_code, actual_date, model_name
       )
 GROUP BY line_code, run_date, model_name
 ORDER BY line_code, run_date, model_name
`;
}
