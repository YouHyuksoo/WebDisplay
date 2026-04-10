/**
 * @file smd-production.ts
 * @description SMD 생산현황 화면(메뉴 24) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 .srd 파일에서 추출한 SQL.
 * 원본: d_display_machine_status_check_items_smd.srd, d_display_machine_status_es.srd
 */

import { buildInFilter } from '@/lib/display-helpers';

/**
 * 라인 코드 배열을 Oracle IN 절 바인드 변수로 변환한다.
 * @param lines - 라인 코드 배열 (['S01','S02'] 등). '%' 또는 빈 배열이면 전체.
 * @returns { clause: SQL WHERE 조각, binds: 바인드 객체 }
 */
export function buildLineFilter(lines: string[]): { clause: string; binds: Record<string, string> } {
  return buildInFilter(lines, 'line_code', 'line');
}

/** SMD 점검 항목 조회 (d_display_machine_status_check_items_smd) */
export function sqlCheckItems(lineClause: string): string {
  return `
SELECT
  v.organization_id,
  v.line_code,
  v.line_name,
  v.running_run_no,
  v.model_name,
  v.model_spec,
  v.line_status_name,
  v.line_status_code_name,
  v.running_lot_plan_qty,
  v.nsnp_reason,
  v.nsnp_status_name,
  v.mask_check,
  v.squeeze_check,
  v.mask_check_date,
  v.squeeze_check_date,
  v.mask_hit_rate1,
  v.mask_hit_rate2,
  v.squeeze_hit_rate1,
  v.squeeze_hit_rate2,
  v.solder_check,
  v.solder_check_val,
  v.solder_check_hour,
  v.lcr_check_status,
  v.lcr_check_date,
  v.master_check_aoi,
  v.master_check_aoi_lot,
  TO_CHAR(v.running_run_date, 'YYYY-MM-DD HH24:MI:SS') AS running_run_date,
  v.pcb_item,
  pl.squeeze_lot_no,
  pl.squeeze_lot_no2
FROM IRPT_PRODUCT_LINE_MONITORING v
JOIN IP_PRODUCT_LINE pl
  ON pl.organization_id = v.organization_id
  AND pl.line_code = v.line_code
WHERE v.organization_id = :orgId
  ${lineClause.replace(/line_code/g, 'v.line_code')}
ORDER BY v.line_code
`;
}

/** SMD 생산현황 전체 조회 (d_display_machine_status_es) */
export function sqlSmdProduction(lineClause: string): string {
  return `
SELECT
  organization_id,
  organization_name,
  actual_date,
  work_shift_code,
  line_code,
  line_name,
  line_division_name,
  line_product_division_name,
  capacity,
  capacity_uom,
  uph_value,
  use_rate,
  mes_display_group,
  mes_display_yn,
  mes_display_sequence,
  line_name_num,
  line_status,
  line_status_name,
  status_change_date,
  line_status_code,
  line_status_code_name,
  nsnp_lock_type,
  nsnp_lock_type_name,
  nsnp_reason,
  nsnp_start_date,
  nsnp_status,
  nsnp_status_name,
  running_run_no,
  running_model_name,
  running_run_date,
  running_lot_plan_qty,
  running_lot_input_qty,
  running_lot_actual_qty,
  running_lot_ng_qty,
  item_code,
  model_name,
  run_status_name,
  day_plan_qty,
  day_input_qty,
  day_actual_qty,
  day_ng_qty,
  lcr_check_status,
  F_GET_AOI_PASS_RATE_BY_RUNNO(running_run_no) AS aoi_pass_rate
FROM IRPT_PRODUCT_LINE_MONITORING
WHERE organization_id = :orgId
  AND mes_display_yn = 'Y'
  ${lineClause}
ORDER BY mes_display_sequence, line_code
`;
}
