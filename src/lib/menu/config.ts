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
  Section,
  GlowTheme,
  TunnelConfig,
  WarpConfig,
  RainbowColor,
} from './types';

// ---------------------------------------------------------------------------
// SECTIONS (레거시)
// ---------------------------------------------------------------------------

/**
 * 섹션 정의 - 대시보드의 카테고리들 (레거시)
 * @deprecated SECTIONS는 DEFAULT_CATEGORIES 사용 권장
 */
export const SECTIONS: Section[] = [
  { id: 0, name: 'MANAGEMENT', subtitle: '관리 설정' },
  { id: 1, name: 'MONITORING', subtitle: '실시간 모니터링' },
  { id: 2, name: 'QUALITY', subtitle: '품질 관리' },
];

// ---------------------------------------------------------------------------
// DEFAULT_CATEGORIES
// ---------------------------------------------------------------------------

/**
 * 기본 카테고리 정의 - MES 메뉴 그룹
 * 사용자 정의 카테고리는 id가 100 이상
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 0, name: 'MANAGEMENT', subtitle: '관리 설정', icon: '⚙️' },
  { id: 1, name: 'MONITORING', subtitle: '실시간 모니터링', icon: '📊' },
  { id: 2, name: 'QUALITY', subtitle: '품질 관리', icon: '✅' },
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
 *   0 = MANAGEMENT (관리 설정)
 *   1 = MONITORING (실시간 모니터링)
 *   2 = QUALITY (품질 관리)
 */
export const DEFAULT_SHORTCUTS: Shortcut[] = [
  // Management (layer: 0)
  { id: 'menu-12', title: 'ASSY 생산 현황', url: '/display/12', color: '#ffd700', icon: '', layer: 0 },
  { id: 'menu-16', title: '설비 로그 오류', url: '/display/16', color: '#ff6b6b', icon: '', layer: 0 },
  { id: 'menu-18', title: '옵션 설정', url: '/display/18', color: '#94a3b8', icon: '', layer: 0 },
  // Monitoring (layer: 1)
  { id: 'menu-21', title: 'ASSY 기계 상태', url: '/display/21', color: '#06b6d4', icon: '', layer: 1 },
  { id: 'menu-22', title: 'ASSY 생산량', url: '/display/22', color: '#22d3ee', icon: '', layer: 1 },
  { id: 'menu-23', title: 'AOI 수율', url: '/display/23', color: '#2dd4bf', icon: '', layer: 1 },
  { id: 'menu-24', title: 'SMD 기계 상태', url: '/display/24', color: '#3b82f6', icon: '', layer: 1 },
  { id: 'menu-25', title: 'SMD 생산량', url: '/display/25', color: '#818cf8', icon: '', layer: 1 },
  { id: 'menu-26', title: '자재 투입 현황', url: '/display/26', color: '#a78bfa', icon: '', layer: 1 },
  { id: 'menu-27', title: 'MSL 관리', url: '/display/27', color: '#c084fc', icon: '', layer: 1 },
  { id: 'menu-28', title: '설비 가동률', url: '/display/28', color: '#e879f9', icon: '', layer: 1 },
  // Quality (layer: 2)
  { id: 'menu-31', title: 'Solder Paste 관리', url: '/display/31', color: '#10b981', icon: '', layer: 2 },
  { id: 'menu-32', title: 'Stencil 관리', url: '/display/32', color: '#34d399', icon: '', layer: 2 },
  { id: 'menu-34', title: '비전 불량', url: '/display/34', color: '#f43f5e', icon: '', layer: 2 },
  { id: 'menu-37', title: '온도 관리', url: '/display/37', color: '#f97316', icon: '', layer: 2 },
  { id: 'menu-38', title: '습도 관리', url: '/display/38', color: '#0ea5e9', icon: '', layer: 2 },
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
