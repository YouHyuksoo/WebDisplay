/**
 * @file src/types/mxvc/reverse-trace-wizard.ts
 * @description 역추적 위자드 — 모드/후보/위자드 상태 타입 정의
 *
 * 초보자 가이드:
 * - TraceMode: 5가지 추적 경로 리터럴 유니온
 * - ReelCandidate: 모드별 추가 필드를 가진 후보 행
 * - WizardState: 메인 페이지에서 관리하는 위자드 상태
 */

export type TraceMode = 'immediate' | 'issue' | 'run' | 'feeder' | 'excel' | 'refid';

export interface ReelCandidateBase {
  reelCd: string;
}

export interface IssueCandidate extends ReelCandidateBase {
  itemCode:  string;
  modelName: string | null;
  issueDate: string;
  issueQty:  number;
  lotNo:     string;
}

export interface RunCandidate extends ReelCandidateBase {
  itemCode:  string;
  modelName: string | null;
  issueDate: string;
  issueQty:  number;
}

export interface FeederCandidate extends ReelCandidateBase {
  partNo:    string;
  slotNo:    string;
  eqpNm:     string;
  startDt:   string;
}

export interface ExcelCandidate extends ReelCandidateBase {
  rowIndex: number;
}

export interface RefIdCandidate extends ReelCandidateBase {
  referenceId: string;
  startDt:     string;
  partNo:      string;
  eqpNm:       string;
  lineNm:      string;
}

export type ReelCandidate = IssueCandidate | RunCandidate | FeederCandidate | ExcelCandidate | RefIdCandidate;

export interface CandidatesResponse {
  mode:       Exclude<TraceMode, 'immediate' | 'excel'>;
  candidates: ReelCandidate[];
  total:      number;
}

export interface IssueModeInput  { dateFrom: string; dateTo: string; itemCode: string; }
export interface RunModeInput    { runNo: string; }
export interface FeederModeInput { startDtFrom: string; startDtTo: string; eqpNm: string; feederSlot: string; }
export interface RefIdModeInput  { referenceId: string; startDtFrom: string; startDtTo: string; }

/** 메인 페이지 위자드 상태 */
export interface WizardState {
  mode:            TraceMode;
  candidates:      ReelCandidate[];  // mode=immediate면 빈 배열
  selectedReelCd:  string;           // 사이드바에서 선택된 릴 (조회 전)
  tracedReelCd:    string;           // 실제 추적 쿼리된 릴 (결과 표시용)
}

export const MODE_LABELS: Record<TraceMode, string> = {
  immediate: '즉시입력',
  issue:     '출고기준',
  run:       '런번호로 추적',
  feeder:    '슬롯번호로 추적',
  excel:     '엑셀 업로드',
  refid:     'ReferenceID로 추적',
};
