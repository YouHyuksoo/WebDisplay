/**
 * @file src/types/mxvc/interlock.ts
 * @description 멕시코전장 인터락호출이력 타입 정의
 * 초보자 가이드:
 * 1. InterlockLog: 개별 로그 행 (ICOM_WEB_SERVICE_LOG 1행)
 * 2. InterlockChartData: 4개 차트용 집계 데이터
 * 3. InterlockResponse: API 응답 전체
 */

/** 개별 로그 행 */
export interface InterlockLog {
  addr: string;
  req: string;
  callDate: string;
  lineCode: string;
  workstageCode: string;
  result: "OK" | "NG";
  returnMsg: string;
}

/** 시간별 호출 건수 */
export interface HourlyCount {
  hour: string;
  count: number;
}

/** 공정별 NG 집계 */
export interface WorkstageNg {
  workstageCode: string;
  total: number;
  ng: number;
}

/** ADDR별 호출 집계 */
export interface AddrCount {
  addr: string;
  total: number;
  ok: number;
  ng: number;
}

/** 차트 데이터 묶음 */
export interface InterlockChartData {
  hourly: HourlyCount[];
  okNgRatio: { ok: number; ng: number };
  byWorkstage: WorkstageNg[];
  byAddr: AddrCount[];
}

/** 페이지네이션 정보 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** API 응답 */
export interface InterlockResponse {
  logs: InterlockLog[];
  charts: InterlockChartData;
  pagination: PaginationInfo;
  lastUpdated: string;
}
