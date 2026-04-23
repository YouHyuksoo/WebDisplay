/**
 * @file status-styles.ts
 * @description 디스플레이 그리드/카드에서 공통으로 사용하는 상태 기반 스타일 유틸.
 *
 * 초보자 가이드:
 * 1. MSL 경고(장착/출고) 두 그리드가 동일한 색상 로직을 공유한다.
 * 2. Foolproof 카드와 SMD 점검 항목이 동일한 뱃지 스타일을 공유한다.
 * 3. 임계값을 상수로 관리하여 일괄 변경이 가능하다.
 */

import type { SolderThresholdConfig } from '@/types/option';

/* ─────────────── MSL Rate 기반 스타일 ─────────────── */

/** MSL 경고 임계값 — PB 원본 기준 */
const MSL_DANGER_THRESHOLD = 90;
const MSL_WARNING_THRESHOLD = 70;

/**
 * MSL 사용/경과 비율에 따른 행 배경 색상.
 * >= 90 → 빨강, 70~90 → 노랑, < 70 → 기본
 */
export function getMslRateRowStyle(rate: number): string {
  if (rate >= MSL_DANGER_THRESHOLD) return 'bg-red-600/20 dark:bg-red-900/30';
  if (rate >= MSL_WARNING_THRESHOLD) return 'bg-yellow-500/10 dark:bg-yellow-900/20';
  return '';
}

/**
 * MSL 경과시간(Passed) 셀 전용 강조 색상.
 * >= 90 → 빨강 + 깜빡임, 70~90 → 노랑
 */
export function getMslRatePassedStyle(rate: number): string {
  if (rate >= MSL_DANGER_THRESHOLD) return 'bg-red-600 text-white animate-pulse';
  if (rate >= MSL_WARNING_THRESHOLD) return 'bg-yellow-500 text-black dark:bg-yellow-600 dark:text-black';
  return '';
}

/** MSL 잔여시간 텍스트 색상 */
export function getMslRemainTextStyle(rate: number): string {
  return rate >= MSL_DANGER_THRESHOLD ? 'text-red-400' : 'text-zinc-300';
}

/* ─────────────── KPI 달성률 스타일 ─────────────── */

/** KPI 달성률 임계값 — PB 원본 기준: >= 95 양호, >= 90 주의, < 90 위험 */
const KPI_GOOD_THRESHOLD = 95;
const KPI_WARNING_THRESHOLD = 90;

/** KPI 달성률별 색상 세트 */
export interface KpiRateStyle {
  border: string;
  text: string;
  bg: string;
  headerBg: string;
  emoji: string;
}

/** KPI 달성률에 따른 색상 세트 반환 */
export function getKpiRateStyle(rate: number): KpiRateStyle {
  if (rate >= KPI_GOOD_THRESHOLD) {
    return { border: 'border-cyan-500', text: 'text-cyan-400', bg: 'bg-cyan-500/10', headerBg: 'bg-cyan-900/40', emoji: '😄' };
  }
  if (rate >= KPI_WARNING_THRESHOLD) {
    return { border: 'border-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10', headerBg: 'bg-yellow-900/40', emoji: '😐' };
  }
  return { border: 'border-red-500', text: 'text-red-500', bg: 'bg-red-500/10', headerBg: 'bg-red-900/40', emoji: '😡' };
}

/* ─────────────── Assy 달성률 텍스트 색상 ─────────────── */

/** Assy 달성률 임계값 — PB 원본 기준: >= 100 양호, >= 80 주의, < 80 위험 */
const ASSY_GOOD_THRESHOLD = 100;
const ASSY_WARNING_THRESHOLD = 80;

/** Assy 달성률에 따른 텍스트 색상 반환 */
export function getAssyRateColor(rate: number | null): string {
  if (rate == null) return 'text-zinc-400';
  if (rate >= ASSY_GOOD_THRESHOLD) return 'text-emerald-400';
  if (rate >= ASSY_WARNING_THRESHOLD) return 'text-amber-400';
  return 'text-red-400';
}

/* ─────────────── Solder 시간 경과 스타일 ─────────────── */

/** Solder Paste 경고 임계값 — PB 원본 기준 (기본 폴백) */
const SOLDER_GAP3_DANGER = '11:30';
const SOLDER_GAP3_WARNING = '10:00';
const SOLDER_UNFREEZING_DANGER = '23:30';
const SOLDER_UNFREEZING_WARNING = '22:00';
const SOLDER_VALID_EXPIRED = 0;
export const SOLDER_VALID_WARNING_DAYS = 2;

/** 개봉후경과(gap3) 조건부 배경색: >danger → RED, >warning → ORANGE */
export function getSolderGap3Style(gap3?: string, thresholds?: SolderThresholdConfig): string {
  const danger = thresholds?.gap3Danger ?? SOLDER_GAP3_DANGER;
  const warning = thresholds?.gap3Warning ?? SOLDER_GAP3_WARNING;
  if (!gap3 || gap3.length !== 5) return '';
  if (gap3 > danger) return 'bg-pink-600 text-white';
  if (gap3 > warning) return 'bg-amber-500 text-black';
  return '';
}

/** 해동후경과시간 조건부 배경색: >danger → RED, >warning → ORANGE */
export function getSolderUnfreezingStyle(time?: string, thresholds?: SolderThresholdConfig): string {
  const danger = thresholds?.unfreezingDanger ?? SOLDER_UNFREEZING_DANGER;
  const warning = thresholds?.unfreezingWarning ?? SOLDER_UNFREEZING_WARNING;
  if (!time) return '';
  if (time > danger) return 'bg-pink-600 text-white';
  if (time > warning) return 'bg-amber-500 text-black';
  return '';
}

/** 유효기간 체크 조건부 배경색: ≤expired → RED, ≤warning일(ORANGE) */
export function getSolderValidDateStyle(check?: number, thresholds?: SolderThresholdConfig): string {
  const expired = thresholds?.validExpired ?? SOLDER_VALID_EXPIRED;
  const warning = thresholds?.validWarning ?? SOLDER_VALID_WARNING_DAYS;
  if (check == null) return '';
  if (check <= expired) return 'bg-pink-600 text-white';
  if (check <= warning) return 'bg-amber-500 text-black';
  return '';
}

/* ─────────────── 점검 상태 뱃지 ─────────────── */

/**
 * 점검 항목 상태값에 따른 뱃지 색상 클래스.
 * OK/Y/PASS → 초록, NG → 빨강 + 깜빡임, 기타 → 회색.
 * FoolproofCard와 SmdCheckItems에서 공유.
 * @param status - 점검 상태값 (OK, NG, Y, PASS 등)
 * @param darkFallback - 비활성 상태의 다크모드 클래스 (기본: 'bg-zinc-600 text-zinc-400')
 */
export function getCheckBadgeClass(status: string, darkFallback = 'bg-zinc-600 text-zinc-400'): string {
  if (status === 'OK' || status === 'Y' || status === 'PASS') {
    return 'bg-emerald-600 text-white';
  }
  if (status === 'NG') {
    return 'bg-red-600 text-yellow-200 animate-pulse';
  }
  return darkFallback;
}
