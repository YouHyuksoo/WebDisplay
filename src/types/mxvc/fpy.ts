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
  summary: { total: number; pass: number; yield: number };
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
}

/** 13개 테이블 매핑 */
export const TABLE_CONFIG: Record<MxvcFpyTableKey, TableColumnConfig> = {
  LOG_FCT:           { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_VISION_LEGACY: { resultCol: "DEVICE_RESULT",  barcodeCol: "BARCODE" },
  LOG_DOWNLOAD:      { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_LOWCURRENT:    { resultCol: "OVERALL_RESULT", barcodeCol: "BARCODE" },
  LOG_VISION_NATIVE: { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_EOL:           { resultCol: "ARRAY_RESULT",   barcodeCol: "BARCODE" },
  LOG_COATING1:      { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_COATING2:      { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_COATINGREVIEW: { resultCol: "FINAL_RESULT",   barcodeCol: "MAIN_BARCODE" },
  LOG_COATINGVISION: { resultCol: "FINAL_RESULT",   barcodeCol: "MAIN_BARCODE" },
  LOG_ICT:           { resultCol: "RESULT",         barcodeCol: "BARCODE" },
  LOG_AOI:           { resultCol: "RESULT",         barcodeCol: "SERIAL_NO" },
  LOG_SPI:           { resultCol: "PCB_RESULT",     barcodeCol: "MASTER_BARCODE" },
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
  layout: "2x3" | "3x2" | "2x2+1";
  chartHeight: number;
  palette: "blue" | "rainbow" | "warm" | "cool";
  visibleTables: MxvcFpyTableKey[];
  dayOffset: number;
}

/** 기본 설정 */
export const DEFAULT_FPY_SETTINGS: MxvcFpySettings = {
  layout: "2x3",
  chartHeight: 200,
  palette: "blue",
  dayOffset: 0,
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
  coating: {
    visibleTables: ["LOG_COATING1", "LOG_COATING2", "LOG_COATINGREVIEW", "LOG_COATINGVISION"],
  },
  inspection: {
    visibleTables: [
      "LOG_FCT", "LOG_ICT", "LOG_EOL", "LOG_LOWCURRENT",
      "LOG_DOWNLOAD", "LOG_VISION_LEGACY", "LOG_VISION_NATIVE",
    ],
  },
};
