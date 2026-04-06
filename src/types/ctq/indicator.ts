/**
 * @file src/types/ctq/indicator.ts
 * @description 지표 모니터링 타입 정의 -- 월간 전용, 전전월/전월 2기간
 *
 * 초보자 가이드:
 * - IQ_INDICATOR_MONTHLY 테이블 기반 캐싱 데이터 구조
 * - 모델(ITEM_CODE)별 x 공정별 전전월/전월 NG/PPM + 대책서번호
 * - 주간 모드 제거, 월간 전용
 */

/** 대상 공정 키 */
export type IndicatorProcessKey =
  | "ICT" | "HIPOT" | "FT" | "BURNIN" | "ATE";

export type IndicatorComparisonMode = "last-vs-current" | "before-vs-last";

/** 공정별 월간 데이터 (캐시 테이블 1행에 대응) */
export interface MonthlyProcessData {
  ngCount: number;
  totalCount: number;
  ppm: number;
  countermeasureNo: string | null;
}

/** 모델별 데이터 -- 전전월/전월 각각 공정별 */
export interface IndicatorModelData {
  itemCode: string;
  monthBefore: Partial<Record<IndicatorProcessKey, MonthlyProcessData>>;
  lastMonth: Partial<Record<IndicatorProcessKey, MonthlyProcessData>>;
}

/** 월 범위 표시용 */
export interface MonthRange {
  month: string;
  displayLabel: string;
}

/** API 응답 */
export interface IndicatorResponse {
  models: IndicatorModelData[];
  monthBefore: MonthRange;
  lastMonth: MonthRange;
  comparisonMode: IndicatorComparisonMode;
  lastUpdated: string;
}

/** 불량 상세 이력 레코드 */
export interface NotifyRecord {
  actionDate: string;
  startTime: string;
  endTime: string;
  lineName: string;
  workstageName: string;
  machineCode: string;
  modelName: string;
  itemCode: string;
  detectLocation: string;
  locationInfo: string;
  serialNo: string;
  grade: string;
  badReasonName: string;
  badDescription: string;
  materialMaker: string;
  inspectBadQty: number;
  inspectQty: number;
  runNo: string;
  notifyStatusName: string;
  completeYn: string;
  completeDate: string;
  inspectCharger: string;
  inspectManager: string;
  departmentName: string;
  countermeasure: string;
  comments: string;
  qcComments: string;
  lineStatusNotify: string;
  actionDateRaw: string;
  notifySequence: number;
  organizationId: number;
  inspectImageFileName: string;
  documentImageFileName: string;
  ngImageFileName: string;
}
