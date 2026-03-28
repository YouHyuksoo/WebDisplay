/**
 * @file src/types/ctq/analysis.ts
 * @description 종합분석 대시보드에서 사용하는 타입 정의
 *
 * 초보자 가이드:
 * 1. MonitorKey - 8개 모니터링 페이지를 식별하는 유니온 타입
 * 2. MonitorSummary - 각 모니터의 요약 정보 (등급, 이상 라인 수 등)
 * 3. AbnormalLine - 이상이 감지된 라인 정보
 * 4. ProcessDetail - 공정별 상세 (NG건수, 등급 등)
 * 5. OverallStatus - 전체 현황 요약 (A/B/C/OK 건수)
 * 6. AnalysisData - 종합분석 전체 데이터 구조
 */

/** 8개 모니터링 페이지 키 */
export type MonitorKey =
  | "repeatability"
  | "nonConsecutive"
  | "accident"
  | "material"
  | "openShort"
  | "indicator"
  | "fpy"
  | "equipment";

/** 공정별 상세 */
export interface ProcessDetail {
  process: string;
  grade: string;
  ngCount: number;
  detail: string;
}

/** 이상 라인 */
export interface AbnormalLine {
  lineName: string;
  lineCode: string;
  grade: string;
  details: ProcessDetail[];
}

/** 각 모니터 요약 */
export interface MonitorSummary {
  key: MonitorKey;
  highestGrade: "A" | "B" | "C" | "OK";
  abnormalCount: number;
  abnormalLines: AbnormalLine[];
  error?: string;
}

/** 전체 현황 */
export interface OverallStatus {
  gradeA: number;
  gradeB: number;
  gradeC: number;
  ok: number;
}

/** 종합분석 전체 데이터 */
export interface AnalysisData {
  summaries: MonitorSummary[];
  overall: OverallStatus;
  lastUpdated: string;
}
