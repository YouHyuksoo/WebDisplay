/**
 * @file src/types/ctq/equipment.ts
 * @description 설비이상 모니터링 타입 정의
 *
 * 초보자 가이드:
 * 1. EquipmentProcessKey: 5개 공정 코드 (ICT, HIPOT, FT, BURNIN, ATE)
 * 2. EquipmentLineData: 라인별 공정별 정지 시간 데이터
 * 3. C급 기준: 일 정지시간 60분 이상
 */

export type EquipmentProcessKey = "ICT" | "HIPOT" | "FT" | "BURNIN" | "ATE";

export interface ProcessStopData {
  stopMinutes: number;
}

export interface EquipmentLineData {
  lineCode: string;
  lineName: string;
  processes: Partial<Record<EquipmentProcessKey, ProcessStopData>>;
}

export interface EquipmentResponse {
  lines: EquipmentLineData[];
  lastUpdated: string;
}

/** 1주일 공정별 일별 정지시간 (차트용) */
export interface EquipmentWeeklyPoint {
  date: string;
  ICT: number;
  HIPOT: number;
  FT: number;
  BURNIN: number;
  ATE: number;
}

export interface EquipmentWeeklyResponse {
  data: EquipmentWeeklyPoint[];
  lastUpdated: string;
}
