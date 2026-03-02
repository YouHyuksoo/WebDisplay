/**
 * @file production-kpi.ts
 * @description 라인별 생산현황(메뉴 26) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_line_kpi_status.srd에서 추출한 SQL.
 * IRPT_PRODUCT_LINE_MONITORING 테이블에서 라인별 계획/목표/실적/달성률을 조회한다.
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
