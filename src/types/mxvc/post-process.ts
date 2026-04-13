/**
 * @file src/types/mxvc/post-process.ts
 * @description 멕시코전장 후공정생산현황 타입 정의
 * 초보자 가이드: API 응답 구조와 컴포넌트 props 타입을 정의한다.
 */

/** KPI 요약 지표 */
export interface PostProcessKpi {
  planQty: number;          // 생산 계획 수량 (lot_qty 합계)
  targetQty: number;        // 목표 수량 (target_plan 합계)
  actualQty: number;        // 생산 실적 (actual_qty 합계)
  achievementRate: number;  // 달성율 % (actualQty / targetQty × 100)
  defectRate: number;       // 불량율 % (불량바코드 / 전체바코드 × 100)
  retestRate: number;       // 재검사율 % (2회이상 바코드 / 전체바코드 × 100)
  repairWaiting: number;    // 수리대기 건수 (QC_INSPECT_HANDLING = 'W')
  repairDone: number;       // 수리완료 건수 (QC_INSPECT_HANDLING = 'U')
}

/** 시간대별 직행율 행 */
export interface PostProcessFpyRow {
  hour: string;    // '08', '09', ...
  total: number;   // 해당 시간대 전체 바코드 수
  pass: number;    // 합격 바코드 수
  yield: number;   // 직행율 % (pass/total × 100)
}

/** 매거진 대기재공 행 */
export interface PostProcessMagazineRow {
  lineCode: string;
  workstageCode: string;
  magazineNo: string;
  inQty: number;
}

/** API 응답 */
export interface PostProcessResponse {
  kpi: PostProcessKpi;
  /** 검사공정 5개 테이블별 시간대 직행율 */
  fpyChart: Record<string, PostProcessFpyRow[]>;
  /** 매거진 대기재공 목록 */
  magazine: PostProcessMagazineRow[];
  lastUpdated: string;
}

/** 필터/설정 상태 */
export interface PostProcessSettings {
  dateFrom: string;  // 'YYYY-MM-DDTHH:MM'
  dateTo: string;
}
