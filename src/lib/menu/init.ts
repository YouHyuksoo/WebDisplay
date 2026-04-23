/**
 * @file src/lib/menu/init.ts
 * @description mydesktop 메뉴 시스템 초기화 및 정리 모듈
 *
 * 초보자 가이드:
 * 1. **주요 개념**: React useEffect에서 호출하여 메뉴 시스템 전체를 초기화/해제
 * 2. **사용 방법**:
 *    ```ts
 *    import { initMenuSystem, destroyMenuSystem } from '@/lib/menu/init';
 *    useEffect(() => {
 *      initMenuSystem();
 *      return () => { destroyMenuSystem(); };
 *    }, []);
 *    ```
 * 3. **초기화 순서**:
 *    - 카테고리/바로가기/설정 로드 (localStorage)
 *    - Three.js 공간 초기화 + 렌더링
 *    - 카드 렌더링, 이벤트 바인딩
 *    - 위젯(시계) 초기화
 *    - 진입 애니메이션 + 이스터에그 이펙트
 *
 * 원본: mydesktop/js/main.js (init 함수)
 * 변경점:
 *   - 동적 import로 SSR 회피
 *   - gsap.to('#loading-screen') 대신 DOM 직접 조작 (gsap는 별도 임포트)
 *   - App.Bookmarks 제거 (MES에서는 미사용)
 *   - initMenuSystem / destroyMenuSystem 으로 라이프사이클 관리
 */

import gsap from 'gsap';
import { state } from './state';
import type { Shortcut } from './types';

// ---------------------------------------------------------------------------
// 위젯 인터벌 추적 (cleanup용)
// ---------------------------------------------------------------------------

/** 시계 인터벌 ID */
let clockIntervalId: ReturnType<typeof setInterval> | null = null;
/** 자동 롤링 인터벌 ID */
let autoRollingIntervalId: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// 즉시 정지 (동기) — 페이지 전환 직전 호출
// ---------------------------------------------------------------------------

/**
 * 메뉴 시스템을 동기적으로 즉시 정지
 *
 * router.push() 호출 전에 반드시 실행하여
 * Three.js 렌더 루프, GSAP 트윈, 인터벌을 한번에 멈춘다.
 * async destroyMenuSystem()과 달리 동적 import 없이 동기 실행되므로
 * 페이지 전환 중 깜빡임을 방지한다.
 */
export function haltMenuSystem(): void {
  // 1. Three.js 애니메이션 루프 정지 (이미 로드된 모듈만 사용)
  // space/index.ts의 _animFrameId를 직접 import할 수 없으므로
  // stopAnimate를 동기 호출할 수 있도록 캐시된 모듈 사용
  if (_spaceModule) {
    _spaceModule.stopAnimate();
  }

  // 2. 모든 GSAP 트윈 즉시 정지
  gsap.globalTimeline.kill();

  // 3. 인터벌 정리
  if (clockIntervalId) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }
  if (autoRollingIntervalId) {
    clearInterval(autoRollingIntervalId);
    autoRollingIntervalId = null;
  }

  // 4. 상태 초기화 (잔류 휠/전환 상태 제거)
  state.targetSpeed = 0;
  state.isTransitioning = false;
  state.isLaneTransitioning = false;
  state.glowIntensity = 0;
}

/** Space 모듈 캐시 (init 시 저장, halt에서 동기 접근) */
let _spaceModule: typeof import('./space') | null = null;

function areShortcutsEqual(a: Shortcut[], b: Shortcut[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.url !== right.url ||
      left.layer !== right.layer ||
      left.title !== right.title ||
      left.icon !== right.icon ||
      left.color !== right.color
    ) {
      return false;
    }
  }
  return true;
}

function runWhenIdle(task: () => void): void {
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof win.requestIdleCallback === 'function') {
    win.requestIdleCallback(task, { timeout: 1200 });
    return;
  }
  setTimeout(task, 120);
}

function initSearchDeferred(): void {
  runWhenIdle(() => {
    import('./search').then((Search) => Search.init());
  });
}

// ---------------------------------------------------------------------------
// 자동 롤링 관리
// ---------------------------------------------------------------------------

/**
 * 자동 롤링 시작
 */
export async function startAutoRolling(): Promise<void> {
  if (autoRollingIntervalId) return;
  const { goToNextSection } = await import('./sections');
  const { LANE_IDS } = await import('./lanes');

  autoRollingIntervalId = setInterval(() => {
    // 중앙 레인(메인)에 있고, 다른 전환 중이 아닐 때만 수행
    if (state.currentLane === LANE_IDS.CENTER && !state.isTransitioning && !state.isLaneTransitioning) {
      goToNextSection();
    }
  }, 5000); // 5초 간격
}

/**
 * 자동 롤링 중지
 */
export function stopAutoRolling(): void {
  if (autoRollingIntervalId) {
    clearInterval(autoRollingIntervalId);
    autoRollingIntervalId = null;
  }
}

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

/**
 * 메뉴 시스템 전체 초기화
 *
 * 모든 모듈을 동적 import하여 SSR 환경에서 안전하게 로드한 뒤,
 * main.js의 init() 로직을 재현한다.
 */
export async function initMenuSystem(): Promise<void> {

  // 동적 import (SSR 회피)
  const { COLORS } = await import('./config');
  const Storage = await import('./storage');
  const Categories = await import('./categories');
  const { renderCards } = await import('./cards');
  const { initEventListeners, initColorPicker } = await import('./handlers');
  // Effects removed from early load
  const {
    applyGlowTheme,
    animateEntrance,
    updateSpaceMenu,
    updateTunnelMenu,
    updateCardStyleMenu,
    updateCardLayoutLabel,
    updateAutoRollingLabel,
    initDialogListeners,
  } = await import('./ui');
  const Widgets = await import('./widgets');
  const Sections = await import('./sections');
  const Lanes = await import('./lanes');
  const Tooltip = await import('./tooltip');

  // 1. 데이터 로드 (앱 생명주기 중 최초 1회만 수행)
  if (!state.isInitialized) {
    // 1-1. 카테고리 로드
    Categories.load();

    // 1-2. 바로가기 및 설정 로드 (cards.json 서버 동기화)
    state.shortcutVersion = 2; // [업데이트] 아이콘 변경 반영을 위해 버전 업
    state.shortcuts = Storage.loadShortcuts();
    Storage.syncCardsFromServer().then(({ cards }) => {
      const favorites = state.shortcuts.filter((s) => s.layer === 0);
      const mergedShortcuts = [...favorites, ...cards];
      if (areShortcutsEqual(state.shortcuts, mergedShortcuts)) return;
      state.shortcuts = mergedShortcuts;
      import('./cards').then((Cards) => Cards.renderCards());
      // 서버 동기화 후 도트 인디케이터 재생성 (카테고리가 변경되었을 수 있음)
      Sections.createDepthIndicator();
    });
    const settings = Storage.loadSettings();

    // 1-3. 설정을 state에 적용
    state.tunnelShape = settings.tunnelShape;
    state.glowTheme = settings.glowTheme;
    state.iconColorMode = settings.iconColorMode;
    state.cardStyle = settings.cardStyle;
    state.spaceType = settings.spaceType;
    state.cardLayout = settings.cardLayout;
    state.auroraBrightness = settings.auroraBrightness ?? 1.0;
    state.simpleVirtualization = settings.simpleVirtualization ?? true;
    state.selectedColor = COLORS[0];
    state.enable3D = settings.enable3D ?? true;
    state.autoRolling = settings.autoRolling ?? false;
    document.body.setAttribute('data-lite-mode', state.simpleVirtualization ? 'on' : 'off');

    state.isInitialized = true;
  }

  // 2. Three.js 공간 초기화 (매 mount 마다 수행 - 캔버스 컨테이너가 새로 생성됨)
  if (state.enable3D) {
    _spaceModule = await import('./space');
    _spaceModule.init();
  }

  // 3. 이전 섹션 위치 복원 (디스플레이 → 메뉴 복귀 시)
  const savedSection = localStorage.getItem(Storage.KEYS.LAST_SECTION);
  const isReturning = savedSection !== null;
  try {
    if (savedSection !== null) {
      const idx = Number(savedSection);
      const sections = Sections.getSections();
      if (idx >= 0 && idx < sections.length) {
        state.currentSection = idx;
        Sections.updateSectionInfo();
        Sections.updateDepthIndicator();
      }
      localStorage.removeItem(Storage.KEYS.LAST_SECTION);
    }
  } catch { /* ignored */ }

  // 4. UI 및 DOM 렌더링 (매 mount 마다 수행)
  Sections.createDepthIndicator();
  initColorPicker();
  renderCards();
  // renderCards(renderAllCards) 내부에서 이미 updateCardsDepth를 비동기로 호출하므로 여기서 중복 호출 제거 검토 가능
  // 다만 즉각적인 배치를 위해 동기 호출 유지 (필요 시)

  initEventListeners();
  initDialogListeners();

  // 5. 컴포넌트 상태 업데이트
  const Carousel = await import('./carousel');
  Carousel.updateNavArrowsVisibility();
  const { updateThumbnailArrowsVisibility } = await import('./cards');
  updateThumbnailArrowsVisibility();

  // 6. 시스템 초기화
  Lanes.init();
  Tooltip.init();

  // 7. 위젯 초기화 (인터벌 정리 후 재설정)
  Widgets.updateClock();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(Widgets.updateClock, 1000);

  // 8. 기타 UI 요소 업데이트
  Categories.updateCategorySelect();
  updateSpaceMenu();
  updateTunnelMenu();
  updateCardStyleMenu();
  updateCardLayoutLabel();
  updateAutoRollingLabel();

  // 9. 테마 및 애니메이션 적용
  applyGlowTheme(state.glowTheme);

  if (state.enable3D && _spaceModule) {
    _spaceModule.animate();
  }

  // 10. 자동 롤링 시작 (설정된 경우)
  if (state.autoRolling) {
    startAutoRolling();
  }

  // 12. 로딩 화면 숨기기 + 진입 애니메이션
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      gsap.to(loadingScreen, {
        opacity: 0,
        duration: isReturning ? 0.3 : 0.5,
        onComplete: () => {
          loadingScreen.style.display = 'none';

          // 진입 애니메이션 (복귀 여부 전달)
          animateEntrance(isReturning);

          // 검색 초기화
          initSearchDeferred();
        },
      });
    } else {
      animateEntrance(isReturning);
      // 검색 초기화
      initSearchDeferred();
    }
  }, isReturning ? 100 : 500);
}

// ---------------------------------------------------------------------------
// 해제
// ---------------------------------------------------------------------------

/**
 * 메뉴 시스템 전체 해제
 *
 * Three.js 리소스 정리, 이벤트 리스너 해제, 인터벌 정리 등
 * React useEffect cleanup에서 호출한다.
 */
export async function destroyMenuSystem(): Promise<void> {
  // 툴팁 해제
  try {
    const Tooltip = await import('./tooltip');
    Tooltip.cleanup();
  } catch { /* ignored */ }

  // 시계 인터벌 정리
  if (clockIntervalId !== null) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }

  // 자동 롤링 인터벌 정리
  stopAutoRolling();

  // Three.js 리소스 정리 (초기화된 경우만)
  if (state.enable3D) {
    try {
      const Space = await import('./space');
      Space.stopAnimate();
      Space.dispose();
    } catch { /* ignored */ }
  }

  // 이벤트 리스너 해제
  const { cleanup } = await import('./handlers');
  cleanup();
}
