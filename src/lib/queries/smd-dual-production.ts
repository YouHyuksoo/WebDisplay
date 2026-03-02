/**
 * @file smd-dual-production.ts
 * @description SMD 듀얼생산현황 화면(메뉴 27) SQL 쿼리.
 * 초보자 가이드: PowerBuilder 원본 d_display_machine_status_single.srd에서 추출한 SQL.
 * IRPT_PRODUCT_LINE_MONITORING 뷰에서 라인별 상세 생산현황(계획/Target/투입/실적/UPH/AOI)을 조회한다.
 * 기존 화면 24(SMD 생산현황)보다 Target, UPH, AOI FPY 등 추가 컬럼을 포함.
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

/** SMD 듀얼 생산현황 상세 조회 (d_display_machine_status_single) */
export function sqlSmdDualProduction(lineClause: string): string {
  return `
SELECT
  organization_id,
  line_code,
  line_name,
  line_status,
  line_status_name,
  nsnp_status,
  nsnp_status_name,
  nsnp_lock_type_name,
  nsnp_reason,
  model_name,
  running_model_name,
  running_run_no,
  running_run_date,
  item_code,
  run_status_name,
  lcr_check_status,
  uph_value,
  use_rate,
  running_lot_plan_qty,
  running_lot_input_qty,
  running_lot_actual_qty,
  running_lot_ng_qty,
  day_plan_qty,
  day_input_qty,
  day_actual_qty,
  day_ng_qty,
  product_run_type_name,
  carrier_size,
  F_GET_AOI_PASS_RATE_BY_RUNNO(running_run_no) AS aoi_pass_rate,
  F_GET_ASSEMBLY_TARGET_BY_LINE(line_code, model_name, pcb_item) AS target_qty
FROM IRPT_PRODUCT_LINE_MONITORING
WHERE organization_id = :orgId
  ${lineClause}
ORDER BY line_code
`;
}

/** SMD 듀얼 NG 건수 조회 (nsnp_status가 'ON'인 라인 수) */
export function sqlSmdDualNgCount(lineClause: string): string {
  return `
SELECT COUNT(*) AS NG_COUNT
FROM IRPT_PRODUCT_LINE_MONITORING
WHERE organization_id = :orgId
  AND nsnp_status = 'ON'
  ${lineClause}
`;
}
