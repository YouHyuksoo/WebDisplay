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
    initDialogListeners,
  } = await import('./ui');
  const Widgets = await import('./widgets');
  const Search = await import('./search');
  const Sections = await import('./sections');
  const Lanes = await import('./lanes');
  const Tooltip = await import('./tooltip');

  // 1. 카테고리 로드 (다른 모듈에서 참조하므로 먼저)
  Categories.load();

  // 2. 데이터 로드
  state.shortcuts = Storage.loadShortcuts();
  const settings = Storage.loadSettings();

  // 3. 설정을 state에 적용
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

  // 4. Three.js 공간 초기화 (조건부/지연 로드)
  if (state.enable3D) {
    const Space = await import('./space');
    Space.init();
  }

  // 5. 이전 섹션 위치 복원 (디스플레이 → 메뉴 복귀 시)
  const savedSection = localStorage.getItem(Storage.KEYS.LAST_SECTION);
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

  // 6. UI 초기화
  Sections.createDepthIndicator();
  initColorPicker();
  renderCards();
  // 섹션 깊이 즉시 동기 적용 (renderCards 내부의 비동기 호출에만 의존하면 타이밍 이슈 가능)
  Sections.updateCardsDepth();

  initEventListeners();
  initDialogListeners();

  // 6-1. 캐러셀/썸네일 화살표 가시성 업데이트 (설정 로드 후 필수)
  const Carousel = await import('./carousel');
  Carousel.updateNavArrowsVisibility();
  const { updateThumbnailArrowsVisibility } = await import('./cards');
  updateThumbnailArrowsVisibility();

  // 7. 레인 시스템 초기화
  Lanes.init();

  // 7-2. 툴팁 초기화
  Tooltip.init();

  // 7. 위젯 초기화
  Widgets.updateClock();
  clockIntervalId = setInterval(Widgets.updateClock, 1000);

  // 8. 카테고리 셀렉트 업데이트
  Categories.updateCategorySelect();

  // 9. 메뉴 상태 표시 업데이트
  updateSpaceMenu();
  updateTunnelMenu();
  updateCardStyleMenu();
  updateCardLayoutLabel();

  // 10. 테마 적용
  applyGlowTheme(state.glowTheme);

  // 11. 애니메이션 시작 (조건부)
  if (state.enable3D) {
    const Space = await import('./space');
    Space.animate();
  }

  // 12. 로딩 화면 숨기기 + 진입 애니메이션
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      gsap.to(loadingScreen, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
          loadingScreen.style.display = 'none';

          // 진입 애니메이션
          animateEntrance();

          // 이스터에그는 여기에 초기화 로직을 넣지 않고 필요할 때 lazy import 하도록 변경됨

          // 검색 초기화
          Search.init();
        },
      });
    } else {
      animateEntrance();
      // 검색 초기화
      Search.init();
    }
  }, 500);
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
