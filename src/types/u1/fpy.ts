/**
 * @file src/types/u1/fpy.ts
 * @description U1전용 직행율(First Pass Yield) 모니터링 타입 정의
 *
 * 초보자 가이드:
 * - U1 라인 전용 5개 공정: HIPOT, ATE, FW(펌웨어), ICT, BURNIN
 * - 테이블: IQ_MACHINE_{공정}_U1_DATA_RAW
 * - 90% 미만이면 A급 (Line Stop)
 */

/** U1 대상 공정 키 */
export type U1FpyProcessKey =
  | "HIPOT" | "ATE" | "FW" | "ICT" | "BURNIN";

/** 공정별 직행율 데이터 */
export interface U1FpyProcessData {
  total: number;
  pass: number;
  ng: number;
  yield: number; // 0~100 퍼센트
}

/** 공정별 전일/당일 직행율 */
export interface U1FpyProcessDayData {
  yesterday?: U1FpyProcessData;
  today?: U1FpyProcessData;
}

/** 라인별 직행율 카드 데이터 */
export interface U1FpyLineData {
  lineCode: string;
  lineName: string;
  overallGrade: "A" | "OK";
  processes: Partial<Record<U1FpyProcessKey, U1FpyProcessDayData>>;
}

/** API 응답 */
export interface U1FpyResponse {
  lines: U1FpyLineData[];
  dateRange: {
    yesterday: string;
    today: string;
  };
  lastUpdated: string;
}
