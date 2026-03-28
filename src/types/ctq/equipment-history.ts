/**
 * @file src/types/ctq/equipment-history.ts
 * @description 설비점검이력 타입 정의
 *
 * 초보자 가이드:
 * 1. EquipmentHistoryRow: IP_LINE_DAILY_OPERATION_HIST 개별 이력 레코드
 * 2. EquipmentHistoryResponse: API 응답 구조
 */

export interface EquipmentHistoryRow {
  lineCode: string;
  lineName: string;
  lineStatusCode: string;
  actualDate: string;
  startDate: string;
  endDate: string;
  stopMinutes: number;
}

export interface EquipmentHistoryResponse {
  rows: EquipmentHistoryRow[];
  lastUpdated: string;
}
