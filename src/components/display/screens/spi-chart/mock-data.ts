/**
 * @file mock-data.ts
 * @description SPI 차트분석 데모용 Mock 데이터.
 * 초보자 가이드: 실제 API 연동 전까지 사용할 더미 데이터를 정의한다.
 * 라인별 불량, 직행율 추이, 불량율, 위치별 TOP5 데이터를 포함.
 */

/** 라인별 불량현황 — Stacked Bar Chart 데이터 */
export const DEFECT_BY_LINE = [
  { line: 'S01', bridge: 12, insufficient: 8, shift: 5, excess: 3, other: 2 },
  { line: 'S02', bridge: 18, insufficient: 14, shift: 9, excess: 6, other: 4 },
  { line: 'S03', bridge: 6, insufficient: 4, shift: 2, excess: 1, other: 1 },
  { line: 'S04', bridge: 22, insufficient: 16, shift: 11, excess: 8, other: 5 },
  { line: 'S05', bridge: 9, insufficient: 7, shift: 4, excess: 2, other: 3 },
  { line: 'S06', bridge: 15, insufficient: 11, shift: 7, excess: 4, other: 2 },
];

/** 불량 유형 키 목록 (라벨은 i18n spiChart 네임스페이스에서 처리) */
export const DEFECT_TYPE_KEYS = ['bridge', 'insufficient', 'shift', 'excess', 'other'] as const;

/** 직행율(FPY) 일별 추이 — Area Chart 데이터 */
export const FPY_TREND = [
  { date: '02/25', fpy: 96.2, target: 98.0 },
  { date: '02/26', fpy: 95.8, target: 98.0 },
  { date: '02/27', fpy: 97.1, target: 98.0 },
  { date: '02/28', fpy: 96.5, target: 98.0 },
  { date: '03/01', fpy: 97.8, target: 98.0 },
  { date: '03/02', fpy: 98.3, target: 98.0 },
  { date: '03/03', fpy: 97.6, target: 98.0 },
];

/** 불량율 요약 KPI */
export const DEFECT_RATE_SUMMARY = {
  totalInspected: 48520,
  totalDefects: 234,
  defectRate: 0.48,
  fpyRate: 97.6,
  previousDefectRate: 0.53,
  target: 0.50,
};

/** 위치별 TOP5 불량 — Horizontal Bar Chart 데이터 */
export const TOP_DEFECT_POSITIONS = [
  { position: 'U3 (IC-QFP)', count: 42, rate: 17.9 },
  { position: 'R12 (0402)', count: 35, rate: 15.0 },
  { position: 'C27 (0603)', count: 28, rate: 12.0 },
  { position: 'U7 (BGA)', count: 23, rate: 9.8 },
  { position: 'R45 (0201)', count: 19, rate: 8.1 },
];
