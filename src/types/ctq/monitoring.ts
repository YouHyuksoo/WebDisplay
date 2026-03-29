/**
 * @file src/types/ctq/monitoring.ts
 * @description CTQ 모니터링 공통 타입 정의 — 전체 CTQ 페이지에서 공유
 */

/** 공정 종류 */
export type ProcessType = "ICT" | "HIPOT" | "FT1" | "BURNIN" | "ATE";

/** 감지 등급 */
export type AlertGrade = "A" | "B" | "C" | "OK";

/** 대항목 */
export type CategoryType = "repeatability" | "accident" | "combined";

/** NG 상세 레코드 (툴팁/모달 공용) */
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
export interface ProcessStatus {
  process: ProcessType;
  processLabel: string;
  grade: AlertGrade;
  category: CategoryType | null;
  lastInspectDate: string | null;
  ngCount: number;
  locationCode: string | null;
  detail: string | null;
  /** 수리실 미등록 NG 건수 (판정대기) */
  pendingCount: number;
}

/** 라인 카드 데이터 */
export interface LineCardData {
  lineCode: string;
  lineName: string;
  processes: ProcessStatus[];
  overallGrade: AlertGrade;
}

/** API 응답 */
export interface MonitoringResponse {
  lines: LineCardData[];
  lastUpdated: string;
}
