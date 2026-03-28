/**
 * @file src/types/ctq/repeatability.ts
 * @description CTQ 반복성/비연속 모니터링 공통 타입 정의
 *
 * 초보자 가이드:
 * - A급: 동일위치 연속불량 (시간순 연속 NG가 동일 Location)
 * - B급: 동일위치 비연속불량 (같은 Location 2건+이지만 연속은 아님)
 * - OK: 정상
 */

/** 반복성 대상 공정 */
export type RepeatProcessType = "FT" | "ATE";

/** 등급 */
export type RepeatGrade = "A" | "B" | "OK";

/** NG 상세 레코드 (툴팁용) */
export interface NgDetailRecord {
  time: string;
  pid: string;
  model: string;
  receiptDeficit: string;
  locationCode: string;
  repairResult: string;
  qcHandling: string;
  defectItem: string;
}

/** 공정별 상태 */
export interface RepeatProcessStatus {
  process: RepeatProcessType;
  processLabel: string;
  grade: RepeatGrade;
  ngCount: number;
  locationCode: string | null;
  modelName: string | null;
  detail: string | null;
  lastInspectDate: string | null;
  pendingCount: number;
  ngDetails?: NgDetailRecord[];
}

/** 라인 카드 데이터 */
export interface RepeatLineCardData {
  lineCode: string;
  lineName: string;
  processes: RepeatProcessStatus[];
  overallGrade: RepeatGrade;
}

/** API 응답 */
export interface RepeatabilityResponse {
  lines: RepeatLineCardData[];
  lastUpdated: string;
}
