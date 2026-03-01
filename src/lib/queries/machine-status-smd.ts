/**
 * @file machine-status-smd.ts
 * @description SMD 기계 상태 화면(메뉴 24) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 .srd 파일에서 추출한 SQL.
 * 원본: d_display_machine_status_check_items_smd.srd, d_display_machine_status_es.srd
 */

/**
 * 라인 코드 배열을 Oracle IN 절 바인드 변수로 변환한다.
 * @param lines - 라인 코드 배열 (['S01','S02'] 등). '%' 또는 빈 배열이면 전체.
 * @returns { clause: SQL WHERE 조각, binds: 바인드 객체 }
 */
export function buildLineFilter(lines: string[]): { clause: string; binds: Record<string, string> } {
  if (!lines.length || lines.includes('%')) {
    return { clause: '', binds: {} };
  }
  const placeholders = lines.map((_, i) => `:line${i}`);
  const binds: Record<string, string> = {};
  lines.forEach((code, i) => { binds[`line${i}`] = code; });
  return { clause: `AND line_code IN (${placeholders.join(', ')})`, binds };
}

/** SMD 점검 항목 조회 (d_display_machine_status_check_items_smd) */
export function sqlCheckItems(lineClause: string): string {
  return `
SELECT
  organization_id,
  actual_date,
  work_shift_code,
  line_code,
  line_name,
  mask_check,
  squeeze_check,
  ccs_check,
  xray_check,
  mask_check_date,
  squeeze_check_date,
  ccs_check_date,
  xray_check_date,
  solder_check,
  solder_check_val,
  solder_check_hour,
  aoi_sample_check,
  aoi_sample_check_date,
  lv_sample_check,
  lv_sample_check_date,
  tilt_sample_check,
  tilt_sample_check_date,
  full_check,
  full_check_date,
  spec_check,
  spec_check_date
FROM IRPT_PRODUCT_LINE_MONITORING
WHERE organization_id = :orgId
  ${lineClause}
ORDER BY line_code
`;
}

/** 기계 상태 전체 조회 (d_display_machine_status_es) */
export function sqlMachineStatus(lineClause: string): string {
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
