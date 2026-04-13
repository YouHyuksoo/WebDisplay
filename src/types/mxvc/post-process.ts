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
  defectRate: number;        // 불량율 % (불량바코드 / 전체바코드 × 100)
  retestRate: number;        // 재검사율 % (재검바코드 / 전체바코드 × 100)
  retestCount: number;       // 재검 건수 (IS_LAST='Y' 기준 2회이상 바코드 수)
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

/** 매거진 재공 재고 행 (IP_PRODUCT_MAGAZINE_INVENTORY) */
export interface PostProcessMagazineRow {
  magazineNo: string;
  modelName: string;        // MODEL_NAME (없으면 MAGAZINE_NO)
  workstageCode: string;    // WORKSTAGE_CODE
  currentQty: number;       // CURRENT_QTY = RECEIPT_QTY - ISSUE_QTY
  lastModifyTime: string;   // LAST_MODIFY_DATE → 'MM-DD HH24:MI'
  lastModifyDate: string;   // LAST_MODIFY_DATE ISO 문자열 (경과시간 계산용)
}

/** 공정별 불량/재검사율 */
export interface PostProcessDefectByTable {
  tableKey: string;   // 'LOG_ICT' 등
  label: string;      // 'ICT' 등 표시명
  total: number;      // 전체 바코드 수
  fail: number;       // 불량 바코드 수
  retest: number;     // 재검사 바코드 수
  defectRate: number; // 불량율 %
  retestRate: number; // 재검사율 %
}

/** EOL 스텝별 불량 분포 (파이차트용) */
export interface PostProcessEolStepDefect {
  nameDetail: string;  // EOL NAME_DETAIL (스텝 상세명)
  failCount: number;   // 해당 스텝 불량 건수
}

/** API 응답 */
export interface PostProcessResponse {
  kpi: PostProcessKpi;
  /** 검사공정 5개 테이블별 시간대 직행율 */
  fpyChart: Record<string, PostProcessFpyRow[]>;
  /** 공정별 불량율/재검사율 */
  defectByTable: PostProcessDefectByTable[];
  /** EOL 스텝별 불량 분포 */
  eolStepDefects: PostProcessEolStepDefect[];
  /** 매거진 대기재공 목록 */
  magazine: PostProcessMagazineRow[];
  lastUpdated: string;
}
