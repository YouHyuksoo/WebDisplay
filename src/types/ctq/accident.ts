/**
 * @file src/types/ctq/accident.ts
 * @description CTQ 사고성 모니터링 타입 정의
 *
 * 초보자 가이드:
 * - HIPOT: 1건 이상 NG → A급 (즉시 대상)
 * - BURNIN: 2건+ → A급, 1건 → B급
 * - ATE: 2건+ → A급, 1건 → B급
 */

/** 사고성 대상 공정 */
export type AccidentProcessType = "HIPOT" | "BURNIN" | "ATE";

/** 등급 */
export type AccidentGrade = "A" | "B" | "OK";

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
export interface AccidentProcessStatus {
  process: AccidentProcessType;
  processLabel: string;
  grade: AccidentGrade;
  ngCount: number;
  /** 수리 판정 완료 건수 (등급 산정 기준) */
  judgedCount: number;
  /** 수리 판정 대기 건수 (등록됐지만 미판정) */
  pendingCount: number;
  detail: string | null;
  lastInspectDate: string | null;
  ngDetails: NgDetailRecord[];
}

/** 라인 카드 데이터 */
export interface AccidentLineCardData {
  lineCode: string;
  lineName: string;
  processes: AccidentProcessStatus[];
  overallGrade: AccidentGrade;
}

/** API 응답 */
export interface AccidentResponse {
  lines: AccidentLineCardData[];
  lastUpdated: string;
}
