/**
 * @file src/types/u1/hipot-analysis.ts
 * @description HIPOT 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_HIPOT_U1_DATA_RAW 테이블 기반 분석 차트용 타입
 * 2. 3개 API(daily/weekly/monthly) 응답 타입 분리
 * 3. 각 차트 컴포넌트가 필요한 데이터 구조 정의
 */

export interface HipotPassRate {
  total: number;
  pass: number;
  ng: number;
  rate: number;
}

export interface HipotLineStat {
  lineCode: string;
  lineName: string;
  today: HipotPassRate;
  yesterday: HipotPassRate;
}

export interface HipotHourlyPoint {
  hour: string;
  total: number;
  pass: number;
  rate: number;
  shift: "D" | "N";
}

export interface HipotMachineNgItem {
  machineCode: string;
  ngCount: number;
  total: number;
}

export interface HipotDailyResponse {
  lineStats: HipotLineStat[];
  hourlyTrend: HipotHourlyPoint[];
  machineNg: HipotMachineNgItem[];
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}

export interface HipotWeeklyPoint {
  date: string;
  lineCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface HipotWeeklyResponse {
  dailyTrend: HipotWeeklyPoint[];
  dateRange: { from: string; to: string };
}

export interface HipotHeatmapCell {
  date: string;
  zoneCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface HipotMonthlyResponse {
  heatmapData: HipotHeatmapCell[];
  zones: string[];
  dateRange: { from: string; to: string };
}
