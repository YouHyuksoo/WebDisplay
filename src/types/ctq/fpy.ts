/**
 * @file src/types/ctq/fpy.ts
 * @description 직행율(First Pass Yield) 모니터링 타입 정의
 *
 * 초보자 가이드:
 * - 라인별 x 공정별 직행율 데이터 (전일/당일)
 * - 90% 미만이면 A급 (Line Stop)
 */

/** 대상 공정 키 */
export type FpyProcessKey =
  | "ICT" | "HIPOT" | "FT" | "BURNIN" | "ATE";

/** 공정별 직행율 데이터 */
export interface FpyProcessData {
  total: number;
  pass: number;
  ng: number;
  yield: number; // 0~100 퍼센트
}

/** 공정별 전일/당일 직행율 */
export interface FpyProcessDayData {
  yesterday?: FpyProcessData;
  today?: FpyProcessData;
}

/** 라인별 직행율 카드 데이터 */
export interface FpyLineData {
  lineCode: string;
  lineName: string;
  overallGrade: "A" | "OK";
  processes: Partial<Record<FpyProcessKey, FpyProcessDayData>>;
}

/** API 응답 */
export interface FpyResponse {
  lines: FpyLineData[];
  dateRange: {
    yesterday: string;
    today: string;
  };
  lastUpdated: string;
}
