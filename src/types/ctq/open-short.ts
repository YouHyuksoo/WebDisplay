/**
 * @file src/types/ctq/open-short.ts
 * @description 공용부품 Open/Short 모니터링 타입 정의
 *
 * 초보자 가이드:
 * - OPEN: B2020 불량코드 (부품 미접속)
 * - SHORT: B2030 불량코드 (부품 합선)
 * - B급: 동일 BAD_REASON_CODE 1일 누적 2건+ -> 출하중지
 */

export type OpenShortDefectType = "OPEN" | "SHORT";
export type OpenShortGrade = "B" | "OK";

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

export interface OpenShortDefectItem {
  defectItem: string;
  defectType: OpenShortDefectType;
  badReasonCode: string;
  count: number;
  lastInspectTime: string;
  ngDetails: NgDetailRecord[];
}

export interface OpenShortLineCardData {
  lineCode: string;
  lineName: string;
  defects: OpenShortDefectItem[];
  overallGrade: OpenShortGrade;
}

export interface OpenShortResponse {
  lines: OpenShortLineCardData[];
  lastUpdated: string;
}
