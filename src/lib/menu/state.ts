/**
 * @file src/lib/menu/state.ts
 * @description MES 디스플레이 메뉴 시스템의 전역 런타임 상태 관리
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 모든 전역 변수를 하나의 state 객체에서 관리 (ES 모듈 방식)
 * 2. **사용 방법**: `import { state } from '@/lib/menu/state'` 후 `state.currentSection` 등으로 접근
 * 3. **주의사항**: state는 mutable 객체 — 직접 프로퍼티를 수정하여 상태를 변경
 *
 * 원본: mydesktop/js/state.js (App.State / App.state)
 * 변경점: `App.State` → named export `state`
 */

import type { MenuState } from './types';

/**
 * 메뉴 시스템 전역 상태 객체
 *
 * Three.js 관련 필드(scene, camera, renderer 등)는 런타임에 초기화되며,
 * 초기값은 null / 빈 배열입니다.
 */
export const state: MenuState = {
  // 데이터
  shortcuts: [],

  // 현재 상태
  currentSection: 0,
  tunnelSpeed: 0,
  targetSpeed: 0,
  cameraZ: 0,
  isTransitioning: false,
  editingId: null,
  selectedColor: '#ffd700',
  contextTargetId: null,

  // 레인 시스템 (X축 좌/우 전환)
  currentLane: 0,              // -1: LEFT(히스토리), 0: CENTER(메인), 1: RIGHT(도구)
  isLaneTransitioning: false,
  laneData: {
    left: [],                  // 히스토리 (최근 사용한 바로가기)
    center: null,              // 메인 카테고리 (기존 섹션들)
    right: [],                 // 도구/설정 카드들
  },

  // 네비게이션 히스토리 (돌아가기 기능)
  sectionHistory: [],

  // 설정
  tunnelShape: 'triangle',
  glowIntensity: 0,
  glowTheme: 'gold',
  iconColorMode: 'brand',
  cardStyle: 'neon',
  spaceType: 'aurora',
  cardLayout: 'grid',
  carouselIndex: 0,
  auroraBrightness: 1.0,
  simpleVirtualization: true,
  enable3D: true,
  lastActivityTime: Date.now(),

  // Three.js (런타임 할당)
  scene: null,
  camera: null,
  renderer: null,
  tunnelRings: [],
  starField: null,

  // 상수
  RING_COUNT: 40,
  RING_SPACING: 50,
  TUNNEL_LENGTH: 40 * 50,
  STAR_COUNT: 3000,
  WARP_LIMIT: 2000,
};
