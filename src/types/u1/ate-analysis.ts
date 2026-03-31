/**
 * @file src/types/u1/ate-analysis.ts
 * @description ATE 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_ATE_U1_DATA_RAW 테이블 기반 분석 차트용 타입
 * 2. 3개 API(daily/weekly/monthly) 응답 타입 분리
 * 3. 각 차트 컴포넌트가 필요한 데이터 구조 정의
 */

export interface AtePassRate {
  total: number;
  pass: number;
  ng: number;
  rate: number;
}

export interface AteLineStat {
  lineCode: string;
  lineName: string;
  today: AtePassRate;
  yesterday: AtePassRate;
}

export interface AteHourlyPoint {
  hour: string;
  total: number;
  pass: number;
  rate: number;
  shift: "D" | "N";
}

export interface AteMachineNgItem {
  machineCode: string;
  ngCount: number;
  total: number;
}

export interface AteDailyResponse {
  lineStats: AteLineStat[];
  hourlyTrend: AteHourlyPoint[];
  machineNg: AteMachineNgItem[];
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}

export interface AteWeeklyPoint {
  date: string;
  lineCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface AteWeeklyResponse {
  dailyTrend: AteWeeklyPoint[];
  dateRange: { from: string; to: string };
}

export interface AteHeatmapCell {
  date: string;
  zoneCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface AteMonthlyResponse {
  heatmapData: AteHeatmapCell[];
  zones: string[];
  dateRange: { from: string; to: string };
}
