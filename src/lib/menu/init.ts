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

// ---------------------------------------------------------------------------
// 위젯 인터벌 추적 (cleanup용)
// ---------------------------------------------------------------------------

/** 시계 인터벌 ID */
let clockIntervalId: ReturnType<typeof setInterval> | null = null;
/** 자동 롤링 인터벌 ID */
let autoRollingIntervalId: ReturnType<typeof setInterval> | null = null;

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
  const Space = await import('./space');
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
  const Search = await import('./search');
  const Sections = await import('./sections');
  const Lanes = await import('./lanes');
  const Tooltip = await import('./tooltip');

  // 1. 데이터 로드 (앱 생명주기 중 최초 1회만 수행)
  if (!state.isInitialized) {
    // 1-1. 카테고리 로드
    Categories.load();

    // 1-2. 바로가기 및 설정 로드
    state.shortcutVersion = 1; // 버전 관리 (필요 시)
    state.shortcuts = Storage.loadShortcuts();
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

    state.isInitialized = true;
  }

  // 2. Three.js 공간 초기화 (매 mount 마다 수행 - 캔버스 컨테이너가 새로 생성됨)
  if (state.enable3D) {
    const Space = await import('./space');
    Space.init();
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

  if (state.enable3D) {
    const Space = await import('./space');
    Space.animate();
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
          Search.init();
        },
      });
    } else {
      animateEntrance(isReturning);
      // 검색 초기화
      Search.init();
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
