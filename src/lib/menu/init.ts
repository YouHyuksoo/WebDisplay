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
  const { state } = await import('./state');
  const { COLORS } = await import('./config');
  const Storage = await import('./storage');
  const Categories = await import('./categories');
  const Space = await import('./space');
  const { renderCards } = await import('./cards');
  const { initEventListeners, initColorPicker } = await import('./handlers');
  const { init: initEffects } = await import('./effects');
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
  state.selectedColor = COLORS[0];

  // 4. Three.js 공간 초기화
  Space.init();

  // 5. UI 초기화
  Sections.createDepthIndicator();
  initColorPicker();
  renderCards();
  initEventListeners();
  initDialogListeners();

  // 6. 레인 시스템 초기화
  Lanes.init();

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

  // 11. 애니메이션 시작
  Space.animate();

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

          // 이스터에그 이펙트 (지연 초기화)
          setTimeout(() => initEffects(), 2000);

          // 검색 초기화
          Search.init();
        },
      });
    } else {
      animateEntrance();
      setTimeout(() => initEffects(), 2000);
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
  // 시계 인터벌 정리
  if (clockIntervalId !== null) {
    clearInterval(clockIntervalId);
    clockIntervalId = null;
  }

  // Three.js 리소스 정리
  const Space = await import('./space');
  Space.stopAnimate();
  Space.dispose();

  // 이벤트 리스너 해제
  const { cleanup } = await import('./handlers');
  cleanup();
}
