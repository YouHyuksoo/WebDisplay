/**
 * @file src/types/ctq/repair-status.ts
 * @description 수리상태 타입 정의
 *
 * 초보자 가이드:
 * 1. RepairStatusRow: IP_PRODUCT_WORK_QC 개별 불량 레코드
 * 2. 코드값은 F_GET_BASECODE로 변환된 명칭으로 제공
 */

export interface RepairStatusRow {
  qcDate: string;
  pid: string;
  lineCode: string;
  lineName: string;
  modelName: string;
  workstageName: string;
  repairWorkstageName: string;
  qcResultName: string;
  repairResultName: string;
  receiptName: string;
  locationCode: string;
  handlingName: string;
  defectItemCode: string;
  badReasonCode: string;
  badReasonName: string;
}

export interface RepairStatusResponse {
  rows: RepairStatusRow[];
  total: number;
  lastUpdated: string;
}
