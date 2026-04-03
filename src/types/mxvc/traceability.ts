/**
 * @file src/types/mxvc/traceability.ts
 * @description 멕시코전장 추적성분석 타입 정의
 * 초보자 가이드:
 * 1. TraceabilityResponse: API 전체 응답 (마스터 + 타임라인)
 * 2. TimelineEvent: 타임라인 개별 이벤트 (LOG, 공정이동, 수리)
 * 3. TimelineEventType: 이벤트 유형 구분자
 */

/** 타임라인 이벤트 유형 */
export type TimelineEventType = 'log' | 'stage_move' | 'repair';

/** 타임라인 이벤트 1건 */
export interface TimelineEvent {
  /** 소스 테이블명 (e.g. LOG_SMD_PLACE, IP_PRODUCT_WORK_QC) */
  source: string;
  /** 이벤트 유형: log=설비로그, stage_move=공정이동, repair=수리이력 */
  type: TimelineEventType;
  /** ISO 8601 타임스탬프 (정렬 기준) */
  timestamp: string;
  /** 해당 row의 전체 데이터 */
  data: Record<string, unknown>;
}

/** API 응답 전체 구조 */
export interface TraceabilityResponse {
  /** IP_PRODUCT_2D_BARCODE 마스터 정보 */
  master: Record<string, unknown> | null;
  /** IP_PRODUCT_RUN_CARD 작업지시 정보 */
  runCard: Record<string, unknown> | null;
  /** IP_PRODUCT_MODEL_MASTER 모델 마스터 정보 */
  modelMaster: Record<string, unknown> | null;
  /** 시간순 정렬된 타임라인 이벤트 배열 */
  timeline: TimelineEvent[];
  /** 조회 시도한 테이블 목록 (데이터 없는 테이블 포함) */
  queriedTables: string[];
}
