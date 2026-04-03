/**
 * @file src/types/mxvc/interlock.ts
 * @description 멕시코전장 인터락호출이력 타입 정의 (공정별 카드형 UI)
 * 초보자 가이드:
 * 1. InterlockLog: 개별 호출 로그 1행
 * 2. WorkstageCard: 공정 1개 = 카드 1장 (공정 요약 + 최근 이력 리스트)
 * 3. InterlockResponse: 전체 카드 목록 API 응답
 * 4. InterlockDetailResponse: 특정 공정 이력 페이징 API 응답
 */

/** 개별 호출 로그 행 */
export interface InterlockLog {
  addr: string;
  req: string;
  callDate: string;
  lineCode: string;
  workstageCode: string;
  result: "OK" | "NG";
  returnMsg: string;
}

/** 공정별 카드 — 카드 1장 = 공정 1개 */
export interface WorkstageCard {
  workstageCode: string;
  workstageName: string;
  totalCount: number;
  okCount: number;
  ngCount: number;
  logs: InterlockLog[];
}

/** 페이지네이션 정보 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

/** 메인 API 응답 — 전체 공정 카드 목록 */
export interface InterlockResponse {
  cards: WorkstageCard[];
  lastUpdated: string;
}

/** 특정 공정 상세 이력 API 응답 */
export interface InterlockDetailResponse {
  logs: InterlockLog[];
  pagination: PaginationInfo;
  lastUpdated: string;
}
