/**
 * @file src/types/u1/burnin-analysis.ts
 * @description BURNIN 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_BURNIN_U1_DATA_RAW 테이블 기반 분석 차트용 타입
 * 2. 3개 API(daily/weekly/monthly) 응답 타입 분리
 * 3. 각 차트 컴포넌트가 필요한 데이터 구조 정의
 */

export interface BurninPassRate {
  total: number;
  pass: number;
  ng: number;
  rate: number;
}

export interface BurninLineStat {
  lineCode: string;
  lineName: string;
  today: BurninPassRate;
  yesterday: BurninPassRate;
}

export interface BurninHourlyPoint {
  hour: string;
  total: number;
  pass: number;
  rate: number;
  shift: "D" | "N";
}

export interface BurninMachineNgItem {
  machineCode: string;
  ngCount: number;
  total: number;
}

export interface BurninDailyResponse {
  lineStats: BurninLineStat[];
  hourlyTrend: BurninHourlyPoint[];
  machineNg: BurninMachineNgItem[];
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}

export interface BurninWeeklyPoint {
  date: string;
  lineCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface BurninWeeklyResponse {
  dailyTrend: BurninWeeklyPoint[];
  dateRange: { from: string; to: string };
}

export interface BurninHeatmapCell {
  date: string;
  zoneCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface BurninMonthlyResponse {
  heatmapData: BurninHeatmapCell[];
  zones: string[];
  dateRange: { from: string; to: string };
}
