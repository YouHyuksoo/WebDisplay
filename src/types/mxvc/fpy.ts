/**
 * @file src/types/mxvc/fpy.ts
 * @description 멕시코전장 직행율(FPY) 대시보드 타입 정의
 *
 * 초보자 가이드:
 * 1. MxvcFpyResponse: API 응답 전체 (13개 테이블별 시간대 직행율)
 * 2. MxvcFpySettings: 사이드바 설정 (레이아웃/팔레트/차트토글/설비필터)
 * 3. TABLE_CONFIG: 13개 테이블의 결과/바코드 컬럼 매핑
 */

/** 시간대별 직행율 데이터 (1시간 단위) */
export interface HourlyFpy {
  hour: string;
  total: number;
  pass: number;
  yield: number;
}

/** 테이블별 직행율 요약 + 시간대 상세 */
export interface TableFpyData {
  hourly: HourlyFpy[];
  summary: {
    total: number;
    pass: number;
    yield: number;
    /** AOI/SPI 등 세분화된 판정값별 집계 */
    breakdown?: ResultBreakdown[];
  };
}

/** API 응답 */
export interface MxvcFpyResponse {
  tables: Record<string, TableFpyData>;
  workDay: { start: string; end: string };
  lastUpdated: string;
}

/** 13개 대상 테이블 키 */
export type MxvcFpyTableKey =
  | "LOG_FCT"
  | "LOG_VISION_LEGACY"
  | "LOG_DOWNLOAD"
  | "LOG_LOWCURRENT"
  | "LOG_VISION_NATIVE"
  | "LOG_EOL"
  | "LOG_COATING1"
  | "LOG_COATING2"
  | "LOG_COATINGREVIEW"
  | "LOG_COATINGVISION"
  | "LOG_ICT"
  | "LOG_AOI"
  | "LOG_SPI";

/** 테이블별 DB 컬럼 매핑 설정 */
export interface TableColumnConfig {
  resultCol: string;
  barcodeCol: string;
  /**
   * 스텝 기반 테이블 여부 — true면 BARCODE(+stepCol) 그룹으로 1건 카운트.
   * 판정은 그룹의 resultCol 대표값(MAX) 사용.
   */
  groupedFpy?: boolean;
  /**
   * 그룹 단위에 추가되는 스텝 컬럼 (예: FILE_NAME).
   * groupedFpy=true일 때 (barcodeCol, stepCol) 조합당 1건으로 카운트.
   * 지정하지 않으면 barcodeCol 만으로 그룹핑.
   */
  stepCol?: string;
  /**
   * 판정값별 세부 집계 반환 여부 (AOI/SPI 등).
   * summary.breakdown에 각 판정값 건수/비율 포함.
   */
  breakdown?: boolean;
  /**
   * IS_SAMPLE='Y' 샘플 레코드 제외 여부.
   * 해당 컬럼이 실제 존재하는 테이블에만 true 설정 (미존재 시 ORA-00904).
   * 필터 형태: NVL(IS_SAMPLE,'N') <> 'Y'  (NULL 포함)
   */
  hasIsSample?: boolean;
  /**
   * 동일 스키마(필요 컬럼 호환)인 추가 테이블과 UNION ALL로 합쳐 조회.
   * 예) LOG_SPI 와 LOG_SPI_VD 가 다른 라인의 SPI 검사 결과를 분리 저장 → 통합 집계 필요.
   * 코드는 두 테이블 모두에서 (LOG_TIMESTAMP, resultCol, barcodeCol[, stepCol][, IS_SAMPLE])
   * 컬럼만 SELECT 하여 UNION ALL — 컬럼 누락/타입 불일치 시 ORA 에러 가능.
   */
  unionWith?: string[];
}

/** 판정값별 세부 집계 (breakdown) */
export interface ResultBreakdown {
  value: string;
  count: number;
  ratio: number; // %
}

/** 13개 테이블 매핑 — 모든 카드에 판정값별 breakdown 표시 */
export const TABLE_CONFIG: Record<MxvcFpyTableKey, TableColumnConfig> = {
  LOG_FCT:           { resultCol: "RESULT",         barcodeCol: "BARCODE",        groupedFpy: true,  breakdown: true },
  LOG_VISION_LEGACY: { resultCol: "DEVICE_RESULT",  barcodeCol: "BARCODE",        breakdown: true },
  LOG_DOWNLOAD:      { resultCol: "RESULT",         barcodeCol: "BARCODE",        breakdown: true },
  LOG_LOWCURRENT:    { resultCol: "OVERALL_RESULT", barcodeCol: "BARCODE",        breakdown: true },
  LOG_VISION_NATIVE: { resultCol: "RESULT",         barcodeCol: "BARCODE",        breakdown: true },
  LOG_EOL:           { resultCol: "ARRAY_RESULT",   barcodeCol: "BARCODE",        groupedFpy: true,  breakdown: true, hasIsSample: true },
  LOG_COATING1:      { resultCol: "RESULT",         barcodeCol: "BARCODE",        breakdown: true, hasIsSample: true },
  LOG_COATING2:      { resultCol: "RESULT",         barcodeCol: "BARCODE",        breakdown: true, hasIsSample: true },
  LOG_COATINGREVIEW: { resultCol: "AREA_RESULT",    barcodeCol: "MAIN_BARCODE",   breakdown: true, hasIsSample: true },
  LOG_COATINGVISION: { resultCol: "FINAL_RESULT",   barcodeCol: "MAIN_BARCODE",   groupedFpy: true, stepCol: "FILE_NAME", breakdown: true, hasIsSample: true },
  LOG_ICT:           { resultCol: "RESULT",         barcodeCol: "BARCODE",        groupedFpy: true,  breakdown: true, hasIsSample: true },
  LOG_AOI:           { resultCol: "RESULT",         barcodeCol: "SERIAL_NO",      breakdown: true, hasIsSample: true },
  LOG_SPI:           { resultCol: "PCB_RESULT",     barcodeCol: "ARRAY_BARCODE",  breakdown: true, hasIsSample: true, unionWith: ["LOG_SPI_VD"] },
};

export const TABLE_KEYS: MxvcFpyTableKey[] = Object.keys(TABLE_CONFIG) as MxvcFpyTableKey[];

/** 테이블 표시명 (LOG_ 접두사 제거 + 공백) */
export const TABLE_LABELS: Record<MxvcFpyTableKey, string> = {
  LOG_FCT: "FCT",
  LOG_VISION_LEGACY: "VISION LEGACY",
  LOG_DOWNLOAD: "DOWNLOAD",
  LOG_LOWCURRENT: "LOWCURRENT",
  LOG_VISION_NATIVE: "VISION NATIVE",
  LOG_EOL: "EOL",
  LOG_COATING1: "COATING 1",
  LOG_COATING2: "COATING 2",
  LOG_COATINGREVIEW: "COATING REVIEW",
  LOG_COATINGVISION: "COATING VISION",
  LOG_ICT: "ICT",
  LOG_AOI: "AOI",
  LOG_SPI: "SPI",
};

/** 사이드바 설정 */
export interface MxvcFpySettings {
  layout: "2x3" | "3x2" | "4x2" | "2x2+1";
  chartType: "bar" | "area" | "line";
  chartHeight: number;
  palette: "blue" | "rainbow" | "warm" | "cool";
  visibleTables: MxvcFpyTableKey[];
  dateFrom: string;
  dateTo: string;
}

/** 기본 설정 */
export const DEFAULT_FPY_SETTINGS: MxvcFpySettings = {
  layout: "2x3",
  chartType: "bar",
  chartHeight: 200,
  palette: "blue",
  dateFrom: "",
  dateTo: "",
  visibleTables: [
    "LOG_FCT", "LOG_VISION_LEGACY", "LOG_EOL", "LOG_ICT",
    "LOG_LOWCURRENT", "LOG_SPI", "LOG_AOI",
  ],
};

/** 프리셋 정의 */
export const FPY_PRESETS: Record<string, Partial<MxvcFpySettings>> = {
  default: {
    visibleTables: [
      "LOG_FCT", "LOG_VISION_LEGACY", "LOG_EOL", "LOG_ICT",
      "LOG_LOWCURRENT", "LOG_SPI", "LOG_AOI",
    ],
  },
  all: {
    visibleTables: [...TABLE_KEYS],
  },
  smt: {
    visibleTables: ["LOG_SPI", "LOG_AOI"],
  },
  inspection: {
    visibleTables: [
      "LOG_FCT", "LOG_ICT", "LOG_EOL", "LOG_LOWCURRENT",
      "LOG_DOWNLOAD", "LOG_VISION_LEGACY", "LOG_VISION_NATIVE",
    ],
  },
};
