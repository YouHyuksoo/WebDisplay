/**
 * @file src/types/u1/fw-analysis.ts
 * @description FW 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_FW_U1_DATA_RAW 테이블 기반 분석 차트용 타입
 * 2. 3개 API(daily/weekly/monthly) 응답 타입 분리
 * 3. 각 차트 컴포넌트가 필요한 데이터 구조 정의
 * 4. ATE 분석 타입과 동일 구조, 접두사 Fw로 구분
 */

export interface FwPassRate {
  total: number;
  pass: number;
  ng: number;
  rate: number;
}

export interface FwLineStat {
  lineCode: string;
  lineName: string;
  today: FwPassRate;
  yesterday: FwPassRate;
}

export interface FwHourlyPoint {
  hour: string;
  total: number;
  pass: number;
  rate: number;
  shift: "D" | "N";
}

export interface FwMachineNgItem {
  machineCode: string;
  ngCount: number;
  total: number;
}

export interface FwDailyResponse {
  lineStats: FwLineStat[];
  hourlyTrend: FwHourlyPoint[];
  machineNg: FwMachineNgItem[];
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}

export interface FwWeeklyPoint {
  date: string;
  lineCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface FwWeeklyResponse {
  dailyTrend: FwWeeklyPoint[];
  dateRange: { from: string; to: string };
}

export interface FwHeatmapCell {
  date: string;
  zoneCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface FwMonthlyResponse {
  heatmapData: FwHeatmapCell[];
  zones: string[];
  dateRange: { from: string; to: string };
}
