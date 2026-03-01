/**
 * @file src/lib/menu/types.ts
 * @description MES 디스플레이 메뉴 시스템의 TypeScript 타입/인터페이스 정의
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 메뉴 시스템에서 사용하는 모든 데이터 구조의 타입을 정의
 * 2. **사용 방법**: 다른 모듈에서 `import type { Shortcut } from './types'` 로 가져와 사용
 * 3. **수정 방법**: 새 데이터 구조가 필요하면 여기에 인터페이스를 추가
 */

// ---------------------------------------------------------------------------
// Shortcut (바로가기 카드)
// ---------------------------------------------------------------------------

/**
 * 메뉴 바로가기(카드) 항목
 *
 * @property id    - 고유 식별자 (예: 'menu-12')
 * @property title - 카드에 표시되는 제목
 * @property url   - 클릭 시 이동할 경로 또는 URL
 * @property color - 카드 테마 색상 (hex)
 * @property icon  - 아이콘 식별자 (비어 있으면 기본 아이콘 사용)
 * @property layer - 소속 카테고리(레이어) ID
 */
export interface Shortcut {
  id: string;
  title: string;
  url: string;
  color: string;
  icon: string;
  layer: number;
}

// ---------------------------------------------------------------------------
// Category (카테고리 / 섹션)
// ---------------------------------------------------------------------------

/**
 * 메뉴 카테고리(그룹) 정의
 *
 * @property id       - 카테고리 고유 ID (0부터 시작, 사용자 정의는 100 이상)
 * @property name     - 카테고리 영문 이름 (대문자)
 * @property subtitle - 카테고리 설명 (한국어)
 * @property icon     - 이모지 아이콘
 */
export interface Category {
  id: number;
  name: string;
  subtitle: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Section (레거시 섹션 — SECTIONS 상수용)
// ---------------------------------------------------------------------------

/**
 * 레거시 섹션 정의 (아이콘 없는 버전)
 * @deprecated SECTIONS 대신 Category + DEFAULT_CATEGORIES 사용 권장
 */
export interface Section {
  id: number;
  name: string;
  subtitle: string;
}

// ---------------------------------------------------------------------------
// GlowTheme (글로우 테마)
// ---------------------------------------------------------------------------

/**
 * 글로우 효과 테마 색상 정의
 *
 * @property primary   - 주 색상 (hex)
 * @property secondary - 보조 색상 (hex)
 * @property orbs      - 오브(발광체) rgba 색상 배열
 */
export interface GlowTheme {
  primary: string;
  secondary: string;
  orbs: string[];
}

// ---------------------------------------------------------------------------
// TunnelConfig (Three.js 터널 상수)
// ---------------------------------------------------------------------------

/**
 * Three.js 터널 렌더링 관련 상수
 *
 * @property RING_COUNT   - 터널을 구성하는 링 개수
 * @property RING_SPACING - 링 사이 간격
 * @property LENGTH       - 터널 총 길이 (RING_COUNT * RING_SPACING, getter)
 */
export interface TunnelConfig {
  RING_COUNT: number;
  RING_SPACING: number;
  readonly LENGTH: number;
}

// ---------------------------------------------------------------------------
// WarpConfig (코스믹 워프 상수)
// ---------------------------------------------------------------------------

/**
 * 코스믹 워프 효과 관련 상수
 *
 * @property STAR_COUNT - 별 파티클 개수
 * @property LIMIT      - 워프 효과 한계 거리
 */
export interface WarpConfig {
  STAR_COUNT: number;
  LIMIT: number;
}

// ---------------------------------------------------------------------------
// RainbowColor (무지개 색상)
// ---------------------------------------------------------------------------

/**
 * RGB 색상 값 (무지개 효과용)
 */
export interface RainbowColor {
  r: number;
  g: number;
  b: number;
}

// ---------------------------------------------------------------------------
// MenuSettings (사용자 설정)
// ---------------------------------------------------------------------------

/**
 * 메뉴 시스템 사용자 설정
 *
 * @property tunnelShape   - 터널 모양 (triangle, circle, square, hexagon, star, infinity)
 * @property glowTheme     - 글로우 테마 키 (gold, purple, cyan 등)
 * @property iconColorMode - 아이콘 색상 모드 (brand, white)
 * @property cardStyle     - 카드 스타일 (glass, rainbow, gradient, dark, neon 등)
 * @property spaceType     - 공간 타입 (tunnel, warp, aurora 등)
 * @property cardLayout    - 카드 레이아웃 (grid, carousel)
 */
export interface MenuSettings {
  tunnelShape: string;
  glowTheme: string;
  iconColorMode: string;
  cardStyle: string;
  spaceType: string;
  cardLayout: string;
  auroraBrightness: number;
}

// ---------------------------------------------------------------------------
// LaneData (레인 시스템)
// ---------------------------------------------------------------------------

/**
 * 레인(X축 전환) 시스템 데이터
 *
 * @property left   - 히스토리 (최근 사용한 바로가기)
 * @property center - 메인 카테고리 (null이면 미초기화)
 * @property right  - 도구/설정 카드들
 */
export interface LaneData {
  left: Shortcut[];
  center: Shortcut[] | null;
  right: Shortcut[];
}

// ---------------------------------------------------------------------------
// MenuState (전역 상태)
// ---------------------------------------------------------------------------

/**
 * 메뉴 시스템 전체 런타임 상태
 *
 * 초보자 가이드:
 * - shortcuts, currentSection 등 UI 상태를 한 곳에서 관리
 * - Three.js 관련 필드(scene, camera 등)는 런타임에 할당되므로 any 타입
 */
export interface MenuState {
  // 데이터
  shortcuts: Shortcut[];

  // 현재 상태
  currentSection: number;
  tunnelSpeed: number;
  targetSpeed: number;
  cameraZ: number;
  isTransitioning: boolean;
  editingId: string | null;
  selectedColor: string;
  contextTargetId: string | null;

  // 레인 시스템 (X축 좌/우 전환)
  currentLane: number;
  isLaneTransitioning: boolean;
  laneData: LaneData;

  // 네비게이션 히스토리 (돌아가기 기능)
  sectionHistory: number[];

  // 설정
  tunnelShape: string;
  glowIntensity: number;
  glowTheme: string;
  iconColorMode: string;
  cardStyle: string;
  spaceType: string;
  cardLayout: string;
  carouselIndex: number;
  auroraBrightness: number;

  // Three.js (런타임 할당)
  scene: any;
  camera: any;
  renderer: any;
  tunnelRings: any[];
  starField: any;

  // 상수
  RING_COUNT: number;
  RING_SPACING: number;
  TUNNEL_LENGTH: number;
  STAR_COUNT: number;
  WARP_LIMIT: number;
}
