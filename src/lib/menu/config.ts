/**
 * @file src/lib/menu/config.ts
 * @description MES 디스플레이 메뉴 시스템의 전역 설정 및 상수 정의
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 모든 설정값과 상수를 중앙 집중 관리 (ES 모듈 방식)
 * 2. **사용 방법**: `import { GLOW_THEMES, COLORS } from '@/lib/menu/config'` 로 가져와 사용
 * 3. **수정 방법**: 새 테마 추가 시 GLOW_THEMES에 추가, 새 카테고리는 DEFAULT_CATEGORIES에 추가
 *
 * 원본: mydesktop/js/config.js (App.Config 네임스페이스)
 * 변경점:
 *   - `App.Config.XXX` → named export
 *   - DEFAULT_SHORTCUTS: mydesktop 앱 바로가기 → MES 메뉴 화면 카드로 교체
 *   - DEFAULT_CATEGORIES: 일반 카테고리 → MES 메뉴 그룹(관리/모니터링/품질)으로 교체
 */

import type {
  Shortcut,
  Category,
  MenuSettings,
  GlowTheme,
  TunnelConfig,
  WarpConfig,
  RainbowColor,
} from './types';

// ---------------------------------------------------------------------------
// DEFAULT_MENU_SETTINGS (유일한 기본 설정 — Single Source of Truth)
// ---------------------------------------------------------------------------

/**
 * 메뉴 시스템 기본 설정값
 * storage.ts와 state.ts 모두 이 값을 참조한다.
 */
export const DEFAULT_MENU_SETTINGS: MenuSettings = {
  tunnelShape: 'triangle',
  glowTheme: 'pink',
  iconColorMode: 'brand',
  cardStyle: 'neon',
  spaceType: 'aurora',
  cardLayout: 'grid',
  auroraBrightness: 1.0,
  simpleVirtualization: false,
  enable3D: true,
  autoRolling: true,
};

// ---------------------------------------------------------------------------
// DEFAULT_CATEGORIES (유일한 카테고리 정의 — Single Source of Truth)
// ---------------------------------------------------------------------------

/** 즐겨찾기 카테고리 고정 ID */
export const FAVORITES_CATEGORY_ID = 0;

/**
 * 기본 카테고리 정의 - MES 메뉴 그룹
 * 새 카테고리 추가 시 여기에만 추가하면 됨 (SECTIONS, ScreenConfig.group 등 별도 수정 불필요)
 * 사용자 정의 카테고리는 id가 100 이상
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 0, name: 'FAVORITES', subtitle: '즐겨찾기', icon: '★' },
  { id: 1, name: 'SMD MONITORING', subtitle: 'SMD 모니터링', icon: '❖' },
  { id: 2, name: 'PBA MONITORING', subtitle: 'PBA 모니터링', icon: '▤' },
  { id: 3, name: 'EQUIPMENT', subtitle: '설비 모니터링', icon: '⌂' },
  { id: 4, name: 'SPC MONITORING', subtitle: 'SPC 모니터링', icon: '✔' },
  { id: 5, name: 'ANOMALY', subtitle: '이상점 모니터링', icon: '⚠' },
  { id: 6, name: 'CHARTS', subtitle: '차트 보기', icon: '▦' },
  { id: 7, name: 'U1 MONITORING', subtitle: 'U1전용 모니터링', icon: '◈' },
];

// ---------------------------------------------------------------------------
// COLORS
// ---------------------------------------------------------------------------

/**
 * 색상 팔레트 - 바로가기 카드 색상 선택용
 */
export const COLORS: string[] = [
  '#ffd700',
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ff8c00',
  '#a55eea',
  '#26de81',
];

// ---------------------------------------------------------------------------
// DEFAULT_SHORTCUTS
// ---------------------------------------------------------------------------

/**
 * 기본 바로가기 목록 - MES 메뉴 화면 카드
 *
 * layer 값은 DEFAULT_CATEGORIES의 id와 매핑:
 *   0 = FAVORITES (즐겨찾기)
 *   1 = SMD MONITORING (SMD 모니터링)
 *   2 = PBA MONITORING (PBA 모니터링)
 *   3 = EQUIPMENT (설비 모니터링)
 *   4 = QUALITY (품질 관리)
 */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Favorites (layer: 0) — 모든 메뉴 즐겨찾기 등록
  { id: 'fav-24', title: 'SMD 생산현황', url: '/display/24', color: '#3b82f6', icon: 'svg:chip-smd', layer: 0 },
  { id: 'fav-25', title: '종합F/P현황', url: '/display/25', color: '#a78bfa', icon: 'svg:stencil', layer: 0 },
  { id: 'fav-26', title: '라인별생산현황', url: '/display/26', color: '#22d3ee', icon: 'svg:production', layer: 0 },
  { id: 'fav-27', title: 'SMD 듀얼생산현황', url: '/display/27', color: '#818cf8', icon: 'svg:monitor', layer: 0 },
  { id: 'fav-21', title: '제품생산현황', url: '/display/21', color: '#06b6d4', icon: 'svg:pba-production', layer: 0 },
  { id: 'fav-34', title: '픽업률현황(BASE)', url: '/display/34', color: '#f59e0b', icon: 'svg:chip-smd', layer: 0 },
  { id: 'fav-35', title: '픽업률현황(HEAD)', url: '/display/35', color: '#eab308', icon: 'svg:chip-smd', layer: 0 },
  { id: 'fav-29', title: 'MSL(장착기준)', url: '/display/29', color: '#f87171', icon: 'svg:msl-warning', layer: 0 },
  { id: 'fav-30', title: 'MSL(출고기준)', url: '/display/30', color: '#fb923c', icon: 'svg:material', layer: 0 },
  { id: 'fav-31', title: 'Solder Paste 관리', url: '/display/31', color: '#10b981', icon: 'svg:solder', layer: 0 },
  { id: 'fav-37', title: '온습도', url: '/display/37', color: '#f97316', icon: 'svg:temperature', layer: 0 },
  { id: 'fav-40', title: 'SPI 차트분석', url: '/display/40', color: '#8b5cf6', icon: 'svg:chart', layer: 0 },
  { id: 'fav-41', title: 'AOI 차트분석', url: '/display/41', color: '#06b6d4', icon: 'svg:vision', layer: 0 },
  { id: 'fav-42', title: 'FCT 차트분석', url: '/display/42', color: '#f59e0b', icon: 'svg:operation-rate', layer: 0 },
  { id: 'fav-43', title: 'VISION 차트분석', url: '/display/43', color: '#10b981', icon: 'svg:vision', layer: 0 },
  { id: 'fav-50', title: '설비로그검색', url: '/display/50', color: '#64748b', icon: 'svg:error-log', layer: 0 },
  { id: 'fav-60', title: '관리도보기', url: '/display/60', color: '#8b5cf6', icon: 'svg:chart', layer: 0 },

  // SMD Monitoring (layer: 1)
  { id: 'menu-24', title: 'SMD 생산현황', url: '/display/24', color: '#3b82f6', icon: 'svg:chip-smd', layer: 1 },
  { id: 'menu-25', title: '종합F/P현황', url: '/display/25', color: '#a78bfa', icon: 'svg:stencil', layer: 1 },
  { id: 'menu-26', title: '라인별생산현황', url: '/display/26', color: '#22d3ee', icon: 'svg:production', layer: 1 },
  { id: 'menu-27', title: 'SMD 듀얼생산현황', url: '/display/27', color: '#818cf8', icon: 'svg:monitor', layer: 1 },

  // PBA Monitoring (layer: 2)
  { id: 'menu-21', title: '제품생산현황', url: '/display/21', color: '#06b6d4', icon: 'svg:pba-production', layer: 2 },
  { id: 'menu-22', title: '제품투입현황', url: '/display/22', color: '#14b8a6', icon: 'svg:pba-input', layer: 2 },
  { id: 'menu-23', title: '제품포장현황', url: '/display/23', color: '#8b5cf6', icon: 'svg:pba-package', layer: 2 },
  { id: 'menu-20', title: '생산계획등록', url: '/display/20', color: '#3b82f6', icon: 'svg:plan-register', layer: 2 },

  // Equipment (layer: 3)
  { id: 'menu-34', title: '픽업률현황(BASE)', url: '/display/34', color: '#f59e0b', icon: 'svg:chip-smd', layer: 3 },
  { id: 'menu-35', title: '픽업률현황(HEAD)', url: '/display/35', color: '#eab308', icon: 'svg:chip-smd', layer: 3 },
  { id: 'menu-50', title: '설비로그검색', url: '/display/50', color: '#64748b', icon: 'svg:error-log', layer: 3 },

  // Quality (layer: 4) — 카드를 SMD 모니터링(layer: 1)으로 이동
  { id: 'menu-29', title: 'MSL(장착기준)', url: '/display/29', color: '#f87171', icon: 'svg:msl-warning', layer: 1 },
  { id: 'menu-30', title: 'MSL(출고기준)', url: '/display/30', color: '#fb923c', icon: 'svg:material', layer: 1 },
  { id: 'menu-31', title: 'Solder Paste 관리', url: '/display/31', color: '#10b981', icon: 'svg:solder', layer: 1 },
  { id: 'menu-37', title: '온습도', url: '/display/37', color: '#f97316', icon: 'svg:temperature', layer: 1 },

  // SPC Monitoring (layer: 4)
  { id: 'menu-60', title: '관리도보기', url: '/display/60', color: '#8b5cf6', icon: 'svg:chart', layer: 4 },

  // Anomaly Monitoring (layer: 5) — SOLUMCTQ 이상점 모니터링
  { id: 'ctq-repeat', title: '반복성연속', url: '/ctq/repeatability', color: '#ef4444', icon: 'svg:repeat', layer: 5 },
  { id: 'ctq-non-consec', title: '반복성동일', url: '/ctq/non-consecutive', color: '#f97316', icon: 'svg:repeat', layer: 5 },
  { id: 'ctq-accident', title: '사고성', url: '/ctq/accident', color: '#dc2626', icon: 'svg:accident', layer: 5 },
  { id: 'ctq-material', title: '원자재동일부품', url: '/ctq/material', color: '#8b5cf6', icon: 'svg:layers', layer: 5 },
  { id: 'ctq-open-short', title: '원자재공용부품', url: '/ctq/open-short', color: '#06b6d4', icon: 'svg:layers', layer: 5 },
  { id: 'ctq-fpy', title: '직행율', url: '/ctq/fpy', color: '#22c55e', icon: 'svg:target', layer: 5 },
  { id: 'ctq-equipment', title: '설비이상', url: '/ctq/equipment', color: '#f59e0b', icon: 'svg:settings', layer: 5 },
  { id: 'ctq-repair', title: '수리상태', url: '/ctq/repair-status', color: '#14b8a6', icon: 'svg:wrench', layer: 5 },
  { id: 'ctq-equip-hist', title: '설비점검이력', url: '/ctq/equipment-history', color: '#64748b', icon: 'svg:clipboard', layer: 5 },
  { id: 'ctq-indicator', title: '지표', url: '/ctq/indicator', color: '#a855f7', icon: 'svg:activity', layer: 5 },
  { id: 'ctq-dashboard', title: '품질분석', url: '/ctq/quality-dashboard', color: '#3b82f6', icon: 'svg:bar-chart', layer: 5 },
  { id: 'ctq-analysis', title: '종합분석', url: '/ctq/analysis', color: '#6366f1', icon: 'svg:pie-chart', layer: 5 },

  // Charts (layer: 6)
  // U1 Monitoring (layer: 7)
  { id: 'u1-fpy', title: 'U1 직행율', url: '/u1/fpy', color: '#22c55e', icon: 'svg:target', layer: 7 },
  { id: 'u1-ate', title: 'ATE 분석', url: '/u1/ate-analysis', color: '#f59e0b', icon: 'svg:chart', layer: 7 },
  { id: 'u1-fw', title: 'FW 분석', url: '/u1/fw-analysis', color: '#8b5cf6', icon: 'svg:chart', layer: 7 },
  { id: 'u1-burnin', title: 'BURNIN 분석', url: '/u1/burnin-analysis', color: '#14b8a6', icon: 'svg:chart', layer: 7 },
  { id: 'u1-hipot', title: 'HIPOT 분석', url: '/u1/hipot-analysis', color: '#ec4899', icon: 'svg:chart', layer: 7 },
  { id: 'u1-ict', title: 'ICT 분석', url: '/u1/ict-analysis', color: '#3b82f6', icon: 'svg:chart', layer: 7 },
  { id: 'u1-quality', title: 'U1 품질분석', url: '/u1/quality-dashboard', color: '#6366f1', icon: 'svg:pie-chart', layer: 7 },
  { id: 'u1-slack', title: '알림 설정', url: '/u1/slack-settings', color: '#e11d48', icon: 'svg:settings', layer: 7 },

  // Charts (layer: 6)
  { id: 'menu-40', title: 'SPI 차트분석', url: '/display/40', color: '#8b5cf6', icon: 'svg:chart', layer: 6 },
  { id: 'menu-41', title: 'AOI 차트분석', url: '/display/41', color: '#06b6d4', icon: 'svg:vision', layer: 6 },
  { id: 'menu-42', title: 'FCT 차트분석', url: '/display/42', color: '#f59e0b', icon: 'svg:operation-rate', layer: 6 },
  { id: 'menu-43', title: 'VISION 차트분석', url: '/display/43', color: '#10b981', icon: 'svg:vision', layer: 6 },
];

// ---------------------------------------------------------------------------
// GLOW_THEMES
// ---------------------------------------------------------------------------

/**
 * 글로우 테마 정의 - 색상 테마별 설정
 */
export const GLOW_THEMES: Record<string, GlowTheme> = {
  gold: {
    primary: '#ffd700',
    secondary: '#ff8c00',
    orbs: [
      'rgba(255, 215, 0, 0.4)',
      'rgba(255, 140, 0, 0.3)',
      'rgba(255, 100, 100, 0.25)',
      'rgba(255, 200, 100, 0.2)',
    ],
  },
  purple: {
    primary: '#a855f7',
    secondary: '#6366f1',
    orbs: [
      'rgba(168, 85, 247, 0.4)',
      'rgba(99, 102, 241, 0.3)',
      'rgba(139, 92, 246, 0.25)',
      'rgba(192, 132, 252, 0.2)',
    ],
  },
  cyan: {
    primary: '#22d3ee',
    secondary: '#06b6d4',
    orbs: [
      'rgba(34, 211, 238, 0.4)',
      'rgba(6, 182, 212, 0.3)',
      'rgba(103, 232, 249, 0.25)',
      'rgba(165, 243, 252, 0.2)',
    ],
  },
  pink: {
    primary: '#f472b6',
    secondary: '#ec4899',
    orbs: [
      'rgba(244, 114, 182, 0.4)',
      'rgba(236, 72, 153, 0.3)',
      'rgba(249, 168, 212, 0.25)',
      'rgba(251, 207, 232, 0.2)',
    ],
  },
  green: {
    primary: '#4ade80',
    secondary: '#22c55e',
    orbs: [
      'rgba(74, 222, 128, 0.4)',
      'rgba(34, 197, 94, 0.3)',
      'rgba(134, 239, 172, 0.25)',
      'rgba(187, 247, 208, 0.2)',
    ],
  },
  red: {
    primary: '#f87171',
    secondary: '#ef4444',
    orbs: [
      'rgba(248, 113, 113, 0.4)',
      'rgba(239, 68, 68, 0.3)',
      'rgba(252, 165, 165, 0.25)',
      'rgba(254, 202, 202, 0.2)',
    ],
  },
  blue: {
    primary: '#60a5fa',
    secondary: '#3b82f6',
    orbs: [
      'rgba(96, 165, 250, 0.4)',
      'rgba(59, 130, 246, 0.3)',
      'rgba(147, 197, 253, 0.25)',
      'rgba(191, 219, 254, 0.2)',
    ],
  },
  white: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    orbs: [
      'rgba(248, 250, 252, 0.3)',
      'rgba(226, 232, 240, 0.25)',
      'rgba(203, 213, 225, 0.2)',
      'rgba(241, 245, 249, 0.15)',
    ],
  },
};

// ---------------------------------------------------------------------------
// RAINBOW_COLORS
// ---------------------------------------------------------------------------

/**
 * 무지개 색상 배열 - 카드 무지개 스타일용
 */
export const RAINBOW_COLORS: RainbowColor[] = [
  { r: 255, g: 107, b: 107 }, // red
  { r: 255, g: 159, b: 67 },  // orange
  { r: 255, g: 215, b: 0 },   // yellow
  { r: 78, g: 205, b: 196 },  // teal
  { r: 69, g: 183, b: 209 },  // blue
  { r: 165, g: 94, b: 234 },  // purple
  { r: 255, g: 107, b: 182 }, // pink
  { r: 38, g: 222, b: 129 },  // green
];

// ---------------------------------------------------------------------------
// TUNNEL
// ---------------------------------------------------------------------------

/**
 * Three.js 터널 관련 상수
 */
export const TUNNEL: TunnelConfig = {
  RING_COUNT: 40,
  RING_SPACING: 50,
  get LENGTH() {
    return this.RING_COUNT * this.RING_SPACING;
  },
};

// ---------------------------------------------------------------------------
// WARP
// ---------------------------------------------------------------------------

/**
 * 코스믹 워프 관련 상수
 */
export const WARP: WarpConfig = {
  STAR_COUNT: 3000,
  LIMIT: 2000,
};
