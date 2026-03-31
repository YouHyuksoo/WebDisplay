/**
 * @file src/types/u1/ict-analysis.ts
 * @description ICT 분석 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. IQ_MACHINE_ICT_U1_DATA_RAW 테이블 기반 분석 차트용 타입
 * 2. 3개 API(daily/weekly/monthly) 응답 타입 분리
 * 3. 각 차트 컴포넌트가 필요한 데이터 구조 정의
 */

export interface IctPassRate {
  total: number;
  pass: number;
  ng: number;
  rate: number;
}

export interface IctLineStat {
  lineCode: string;
  lineName: string;
  today: IctPassRate;
  yesterday: IctPassRate;
}

export interface IctHourlyPoint {
  hour: string;
  total: number;
  pass: number;
  rate: number;
  shift: "D" | "N";
}

export interface IctMachineNgItem {
  machineCode: string;
  ngCount: number;
  total: number;
}

/** C5 불량종류별 NG 분포 */
export interface IctDefectTypeItem {
  defectType: string;  // C5 컬럼값 (불량종류)
  ngCount: number;
  total: number;
}

export interface IctDailyResponse {
  lineStats: IctLineStat[];
  hourlyTrend: IctHourlyPoint[];
  machineNg: IctMachineNgItem[];
  defectTypes: IctDefectTypeItem[];  // C5 불량종류별 분포
  dateRange: { yesterday: string; today: string };
  lastUpdated: string;
}

export interface IctWeeklyPoint {
  date: string;
  lineCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface IctWeeklyResponse {
  dailyTrend: IctWeeklyPoint[];
  dateRange: { from: string; to: string };
}

export interface IctHeatmapCell {
  date: string;
  zoneCode: string;
  total: number;
  pass: number;
  rate: number;
}

export interface IctMonthlyResponse {
  heatmapData: IctHeatmapCell[];
  zones: string[];
  dateRange: { from: string; to: string };
}
