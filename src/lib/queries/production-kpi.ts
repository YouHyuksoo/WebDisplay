/**
 * @file production-kpi.ts
 * @description 라인별 생산현황 SQL 쿼리.
 * 초보자 가이드:
 * - sqlProductionKpiList: display/26용, IRPT_PRODUCT_LINE_MONITORING 기반
 * - sqlMxvcProductionKpiList: 멕시코전장용, IRPT_PRODUCT_LINE_TARGET_MONITORING 기반
 *   (TARGET_PLAN = F_GET_ASSEMBLY_TARGET_BY_FIX, ACTUAL_QTY = F_GET_HW_VW_LTS_BOARD)
 * 달성률 색상: >= 95 시안, 90~95 노랑, < 90 빨강.
 */

import { buildLineFilter } from './smd-production';

export { buildLineFilter };

/**
 * 라인별 생산 KPI 조회 (d_display_line_kpi_status).
 * @param lineClause - buildLineFilter()로 생성한 WHERE 조각
 * @returns SQL 문자열
 */
export function sqlProductionKpiList(lineClause: string): string {
  return `
SELECT line_name,
       NVL(running_model_name, model_name)                 AS model_name,
       line_product_division_name                          AS product_group,
       NVL(day_plan_qty, 0)                                AS plan_qty,
       NVL(target_plan, 0)                                 AS target_qty,
       NVL(day_actual_qty, 0)                              AS output_qty,
       NVL(day_actual_qty, 0) - NVL(day_plan_qty, 0)      AS diff_qty,
       CASE WHEN NVL(day_plan_qty, 0) > 0
            THEN ROUND(NVL(day_actual_qty, 0) / day_plan_qty * 100, 1)
            ELSE 0 END                                     AS achievement_rate
  FROM IRPT_PRODUCT_LINE_MONITORING
 WHERE organization_id = :orgId
   ${lineClause}
 ORDER BY line_name
`;
}

/**
 * 멕시코전장 라인별 생산 KPI 조회 (IRPT_PRODUCT_LINE_TARGET_MONITORING).
 * - TARGET_QTY : F_GET_ASSEMBLY_TARGET_BY_FIX 계산값 (target_plan)
 * - OUTPUT_QTY : F_GET_HW_VW_LTS_BOARD 당일 주간 실적 (한화 DBLINK, actual_qty)
 * - PLAN_QTY   : ip_product_run_card.lot_size (작업지시 계획 수량)
 * @param lineClause - buildLineFilter()로 생성한 WHERE 조각
 */
export function sqlMxvcProductionKpiList(lineClause: string): string {
  return `
SELECT line_name,
       run_no                                             AS run_no,
       NVL(model_name, '-')                               AS model_name,
       model_spec                                         AS product_group,
       NVL(lot_qty, 0)                                    AS plan_qty,
       NVL(target_plan, 0)                                AS target_qty,
       NVL(actual_qty, 0)                                 AS output_qty,
       NVL(actual_qty, 0) - NVL(target_plan, 0)          AS diff_qty,
       CASE WHEN NVL(target_plan, 0) > 0
            THEN ROUND(NVL(actual_qty, 0) / target_plan * 100, 1)
            ELSE 0 END                                    AS achievement_rate,
       model_st                                           AS st_qty
  FROM IRPT_PRODUCT_LINE_TARGET_MONITORING
 WHERE organization_id = :orgId
   ${lineClause}
 ORDER BY line_code
`;
}
