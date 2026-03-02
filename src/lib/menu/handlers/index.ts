/**
 * @file src/lib/menu/handlers/index.ts
 * @description 이벤트 핸들러 통합 - 모든 입력 이벤트 초기화 및 정리
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 모든 핸들러 모듈을 통합하여 이벤트 리스너 설정/해제
 * 2. **사용 방법**:
 *    ```ts
 *    import { initEventListeners, cleanup } from './handlers';
 *    // React useEffect에서:
 *    useEffect(() => { initEventListeners(); return cleanup; }, []);
 *    ```
 * 3. **모듈 목록**:
 *    - shortcut-crud.ts    : 바로가기 CRUD
 *    - settings-handler.ts : 설정 변경
 *    - data-io.ts          : 데이터 내보내기/가져오기
 *    - grid-scroll.ts      : 그리드 스크롤
 *
 * 원본: mydesktop/js/handlers/index.js (App.Events.initEventListeners)
 * 변경점: `App.Events.xxx` -> named export, cleanup() 함수 추가
 */

import gsap from 'gsap';
import { state } from '../state';
import { COLORS } from '../config';
import { KEYS } from '../storage';
import {
  openModal,
  closeModal,
  hideContextMenu,
  toggleSettingsMenu,
  hideSettingsMenu,
  hideTunnelSubmenu,
  hideCardStyleSubmenu,
  toggleTunnelSubmenu,
  toggleCardStyleSubmenu,
  applyGlowTheme,
  updateVirtualizationLabel,
  update3DLabel,
} from '../ui';
import { saveShortcut, deleteShortcut } from './shortcut-crud';
import {
  changeSpaceType,
  changeTunnelShape,
  changeCardStyle,
  toggleIconColor,
} from './settings-handler';
import { exportData, importData } from './data-io';
import { initGridScrollControls, updateGridScrollButtons } from './grid-scroll';

// Re-export
export { saveShortcut, deleteShortcut } from './shortcut-crud';
export { changeSpaceType, changeTunnelShape, changeCardStyle, toggleIconColor } from './settings-handler';
export { exportData, importData } from './data-io';
export { initGridScrollControls, updateGridScrollButtons } from './grid-scroll';

// ---------------------------------------------------------------------------
// 이벤트 핸들러 참조 저장 (cleanup용)
// ---------------------------------------------------------------------------

/** 등록된 이벤트 핸들러 참조 저장소 */
const handlers: Array<{
  target: EventTarget;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}> = [];

/** 클릭 리플 이펙트 활성 상태 */
let clickFxEnabled = false;

/**
 * 이벤트 리스너를 등록하고 추적
 */
function addTracked(
  target: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  target.addEventListener(event, handler, options);
  handlers.push({ target, event, handler, options });
}

// ---------------------------------------------------------------------------
// Color Picker
// ---------------------------------------------------------------------------

/**
 * 컬러 피커 초기화
 */
export function initColorPicker(): void {
  const picker = document.getElementById('color-picker');
  if (!picker) return;

  COLORS.forEach((color) => {
    const opt = document.createElement('div');
    opt.className = 'color-option' + (color === state.selectedColor ? ' selected' : '');
    opt.style.background = color;
    opt.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach((el) => el.classList.remove('selected'));
      opt.classList.add('selected');
      state.selectedColor = color;
    });
    picker.appendChild(opt);
  });
}

// ---------------------------------------------------------------------------
// Click Effect (배경 클릭)
// ---------------------------------------------------------------------------

/**
 * 클릭 이펙트 생성 (배경 클릭 시)
 * @param x - 클릭 X 좌표
 * @param y - 클릭 Y 좌표
 */
function createClickEffect(x: number, y: number): void {
  state.glowIntensity = 1.5;

  const ripple = document.createElement('div');
  ripple.className = 'click-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.width = '600px';
  ripple.style.height = '600px';
  document.body.appendChild(ripple);

  const burst = document.createElement('div');
  burst.className = 'click-burst';
  burst.style.left = x + 'px';
  burst.style.top = y + 'px';
  document.body.appendChild(burst);

  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'burst-particle';
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 80 + Math.random() * 60;
    const duration = 0.6 + Math.random() * 0.4;

    particle.style.left = '0px';
    particle.style.top = '0px';

    burst.appendChild(particle);

    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      opacity: 0,
      scale: 0,
      duration,
      ease: 'power2.out',
    });
  }

  // 터널 링에 펄스 효과
  import('../space/index').then((Space) => {
    if (Space.pulseRings) {
      Space.pulseRings();
    }
  }).catch(() => { /* space module may not be loaded */ });

  setTimeout(() => {
    ripple.remove();
    burst.remove();
  }, 1000);
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------

/**
 * 모든 이벤트 리스너 초기화
 */
export function initEventListeners(): void {
  // ===== 휠 이벤트 =====
  let wheelAccumulator = 0;
  let wheelTimeout: ReturnType<typeof setTimeout>;
  let lastWheelTime = 0;
  const WHEEL_THRESHOLD = 150;
  const WHEEL_DECAY = 0.92;

  function decayWheelAccumulator(): void {
    if (Math.abs(wheelAccumulator) > 1) {
      wheelAccumulator *= WHEEL_DECAY;
      requestAnimationFrame(decayWheelAccumulator);
    } else {
      wheelAccumulator = 0;
    }
  }

  let laneWheelAccumulator = 0;
  const LANE_WHEEL_THRESHOLD = 100;

  const wheelHandler = (e: WheelEvent) => {
    state.lastActivityTime = Date.now();
    const now = Date.now();
    const timeDelta = now - lastWheelTime;
    lastWheelTime = now;

    // Shift+휠: 레인 전환
    if (e.shiftKey) {
      if (!state.isLaneTransitioning) {
        laneWheelAccumulator += e.deltaY * 0.8;

        if (laneWheelAccumulator > LANE_WHEEL_THRESHOLD) {
          import('../lanes').then((Lanes) => Lanes.goToLane(state.currentLane + 1));
          laneWheelAccumulator = 0;
        } else if (laneWheelAccumulator < -LANE_WHEEL_THRESHOLD) {
          import('../lanes').then((Lanes) => Lanes.goToLane(state.currentLane - 1));
          laneWheelAccumulator = 0;
        }
      }

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => { laneWheelAccumulator = 0; }, 150);
      return;
    }

    if (state.currentLane !== 0) return;

    const speedMultiplier = Math.min(Math.abs(e.deltaY) / 50, 1);
    state.targetSpeed = (e.deltaY > 0 ? 8 : -8) * speedMultiplier;
    state.glowIntensity = Math.min(1, state.glowIntensity + Math.abs(e.deltaY) * 0.005);

    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      state.targetSpeed = 0;
      decayWheelAccumulator();
    }, 150);

    if (!state.isTransitioning) {
      if (timeDelta < 200) {
        wheelAccumulator += e.deltaY * 0.5;
      } else {
        wheelAccumulator = e.deltaY * 0.8;
      }

      if (wheelAccumulator > WHEEL_THRESHOLD) {
        import('../sections').then((Sections) => Sections.goToSection(state.currentSection + 1));
        wheelAccumulator = 0;
      } else if (wheelAccumulator < -WHEEL_THRESHOLD) {
        import('../sections').then((Sections) => Sections.goToSection(state.currentSection - 1));
        wheelAccumulator = 0;
      }
    }
  };
  addTracked(window, 'wheel', wheelHandler as EventListener, { passive: true });

  // ===== 리사이즈 이벤트 =====
  const resizeHandler = () => {
    if (state.camera && state.renderer) {
      (state.camera as { aspect: number; updateProjectionMatrix: () => void }).aspect =
        window.innerWidth / window.innerHeight;
      (state.camera as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
      (state.renderer as { setSize: (w: number, h: number) => void }).setSize(
        window.innerWidth, window.innerHeight,
      );
    }
  };
  addTracked(window, 'resize', resizeHandler);

  // ===== 터치 이벤트 =====
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartTime = 0;
  let touchOnCard = false;

  const touchStartHandler = (e: TouchEvent) => {
    state.lastActivityTime = Date.now();
    const target = e.target as HTMLElement;
    if (target.closest('.floating-btn') ||
        target.closest('#settings-menu') ||
        target.closest('#tunnel-submenu') ||
        target.closest('.modal-overlay') ||
        target.closest('.carousel-dots')) return;

    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    touchOnCard = !!target.closest('.shortcut-card');
  };
  addTracked(document, 'touchstart', touchStartHandler as EventListener, { passive: true });

  const touchMoveHandler = (e: TouchEvent) => {
    if (touchStartY === 0 || touchOnCard) return;
    const deltaY = touchStartY - e.touches[0].clientY;
    state.targetSpeed = deltaY * 0.1;
    state.glowIntensity = Math.min(1, state.glowIntensity + Math.abs(deltaY) * 0.002);
  };
  addTracked(document, 'touchmove', touchMoveHandler as EventListener, { passive: true });

  const touchEndHandler = (e: TouchEvent) => {
    if (touchStartY === 0) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;
    const deltaTime = Date.now() - touchStartTime;
    const isMobile = window.innerWidth <= 768;

    if (state.cardLayout === 'carousel' && isMobile) {
      if (touchOnCard && Math.abs(deltaY) > 50) {
        import('../carousel').then((C) => {
          if (deltaY > 0) C.carouselNext(); else C.carouselPrev();
        });
      } else if (!touchOnCard && Math.abs(deltaY) > 50) {
        const velocity = Math.abs(deltaY) / deltaTime;
        if (velocity > 0.3 || Math.abs(deltaY) > 100) {
          import('../sections').then((S) => {
            if (deltaY > 0) S.goToSection(state.currentSection + 1);
            else S.goToSection(state.currentSection - 1);
          });
        }
      }
    } else if (state.cardLayout === 'carousel' && !isMobile) {
      if (Math.abs(deltaX) > 50) {
        import('../carousel').then((C) => {
          if (deltaX > 0) C.carouselNext(); else C.carouselPrev();
        });
      }
    } else if (state.cardLayout === 'grid') {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        const velocity = Math.abs(deltaY) / deltaTime;
        if (velocity > 0.3 || Math.abs(deltaY) > 100) {
          import('../sections').then((S) => {
            if (deltaY > 0) S.goToSection(state.currentSection + 1);
            else S.goToSection(state.currentSection - 1);
          });
        }
      }
    }

    touchStartY = 0;
    touchStartX = 0;
    touchOnCard = false;
    state.targetSpeed = 0;
  };
  addTracked(document, 'touchend', touchEndHandler as EventListener, { passive: true });

  // ===== 추가 버튼 =====
  document.getElementById('add-btn')?.addEventListener('click', () => openModal());

  // ===== 모달 이벤트 =====
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-save')?.addEventListener('click', () => saveShortcut());
  document.getElementById('modal-delete')?.addEventListener('click', () => {
    if (state.editingId) deleteShortcut(state.editingId);
  });

  // ===== 컨텍스트 메뉴 =====
  document.getElementById('ctx-fav')?.addEventListener('click', async () => {
    if (state.contextTargetId) {
      const { toggleFavoriteById } = await import('../cards');
      toggleFavoriteById(state.contextTargetId);
    }
    hideContextMenu();
  });
  document.getElementById('ctx-edit')?.addEventListener('click', () => {
    if (state.contextTargetId) openModal(state.contextTargetId);
    hideContextMenu();
  });
  document.getElementById('ctx-delete')?.addEventListener('click', () => {
    if (state.contextTargetId) deleteShortcut(state.contextTargetId);
    hideContextMenu();
  });
  addTracked(document, 'click', hideContextMenu as EventListener);

  // ===== 키보드 이벤트 =====
  const keydownHandler = (e: KeyboardEvent) => {
    state.lastActivityTime = Date.now();
    if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return;

    if (state.cardLayout === 'carousel' && state.currentLane === 0) {
      if (e.key === 'ArrowLeft') import('../carousel').then((C) => C.carouselPrev());
      if (e.key === 'ArrowRight') import('../carousel').then((C) => C.carouselNext());
      if (e.key === 'ArrowUp') import('../sections').then((S) => S.goToSection(state.currentSection - 1));
      if (e.key === 'ArrowDown') import('../sections').then((S) => S.goToSection(state.currentSection + 1));
    } else if (state.cardLayout === 'grid') {
      if (state.currentLane === 0) {
        if (e.key === 'ArrowLeft') import('../lanes').then((L) => L.goToLane(-1));
        if (e.key === 'ArrowRight') import('../lanes').then((L) => L.goToLane(1));
        if (e.key === 'ArrowUp') import('../sections').then((S) => S.goToSection(state.currentSection - 1));
        if (e.key === 'ArrowDown') import('../sections').then((S) => S.goToSection(state.currentSection + 1));
      } else {
        if (e.key === 'ArrowLeft' && state.currentLane === 1) import('../lanes').then((L) => L.goToLane(0));
        if (e.key === 'ArrowRight' && state.currentLane === -1) import('../lanes').then((L) => L.goToLane(0));
      }
    }

    if (e.key === 'Escape') {
      if (state.currentLane !== 0) {
        import('../lanes').then((L) => L.goToLane(0));
        return;
      }
      closeModal();
      hideContextMenu();
      hideSettingsMenu();
    }
  };
  addTracked(document, 'keydown', keydownHandler as EventListener);

  // ===== 설정 메뉴 =====
  document.getElementById('settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu();
  });
  document.getElementById('menu-export')?.addEventListener('click', () => exportData());
  document.getElementById('menu-restore')?.addEventListener('click', () => importData());

  // ===== 카테고리 관리 =====
  const menuCategories = document.getElementById('menu-categories');
  if (menuCategories) {
    addTracked(menuCategories, 'click', () => {
      hideSettingsMenu();
      import('../categories').then((C) => C.openManager());
    });
  }

  const categoryModalClose = document.getElementById('category-modal-close');
  if (categoryModalClose) {
    addTracked(categoryModalClose, 'click', () => {
      import('../categories').then((C) => C.closeManager());
    });
  }

  const addCategoryBtn = document.getElementById('add-category-btn');
  if (addCategoryBtn) {
    addTracked(addCategoryBtn, 'click', () => {
      import('../categories').then((C) => C.openEditDialog());
    });
  }

  const categoryEditCancel = document.getElementById('category-edit-cancel');
  if (categoryEditCancel) {
    addTracked(categoryEditCancel, 'click', () => {
      import('../categories').then((C) => C.closeEditDialog());
    });
  }

  const categoryEditSave = document.getElementById('category-edit-save');
  if (categoryEditSave) {
    addTracked(categoryEditSave, 'click', () => {
      import('../categories').then((C) => C.saveFromDialog());
    });
  }

  // ===== 레이아웃 전환 (그리드 → 캐러셀 → 썸네일 → 그리드) =====
  document.getElementById('layout-toggle-btn')?.addEventListener('click', () => {
    const order = ['grid', 'carousel', 'thumbnail'] as const;
    const currentIdx = order.indexOf(state.cardLayout as typeof order[number]);
    const next = order[(currentIdx + 1) % order.length];
    import('../carousel').then((C) => C.changeCardLayout(next));
    // 아이콘 토글
    const gridIcon = document.getElementById('layout-icon-grid');
    const carouselIcon = document.getElementById('layout-icon-carousel');
    const thumbnailIcon = document.getElementById('layout-icon-thumbnail');
    if (gridIcon) gridIcon.style.display = next === 'grid' ? '' : 'none';
    if (carouselIcon) carouselIcon.style.display = next === 'carousel' ? '' : 'none';
    if (thumbnailIcon) thumbnailIcon.style.display = next === 'thumbnail' ? '' : 'none';
  });

  // ===== 공간 타입 토글 버튼 =====
  document.getElementById('space-toggle-btn')?.addEventListener('click', () => {
    changeSpaceType();
  });

  // ===== 터널 서브메뉴 =====
  document.getElementById('menu-tunnel')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTunnelSubmenu();
  });
  const toggleBackground3D = async (e?: Event) => {
    e?.stopPropagation();
    state.enable3D = !state.enable3D;
    update3DLabel();
    
    import('../ui').then((UI) => UI.saveSettings());
    
    if (state.enable3D) {
      const Space = await import('../space');
      Space.init();
      Space.animate();
    } else {
      const Space = await import('../space');
      Space.stopAnimate();
      Space.dispose();
      // Three.js 캔버스 영역 정리 (필요 시)
      const container = document.getElementById('three-container');
      if (container) container.innerHTML = '';
    }
  };

  document.getElementById('menu-enable-3d')?.addEventListener('click', toggleBackground3D);
  document.getElementById('bg-toggle-btn')?.addEventListener('click', toggleBackground3D);
  document.getElementById('menu-virtualization')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.simpleVirtualization = !state.simpleVirtualization;
    updateVirtualizationLabel();
    // 아이콘 업데이트
    const on = document.getElementById('virtualization-icon-on');
    const off = document.getElementById('virtualization-icon-off');
    if (on) on.style.display = state.simpleVirtualization ? '' : 'none';
    if (off) off.style.display = state.simpleVirtualization ? 'none' : '';
    
    import('../ui').then((UI) => UI.saveSettings());
    import('../sections').then((S) => S.updateCardsDepth());
  });
  document.getElementById('virtualization-toggle-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.simpleVirtualization = !state.simpleVirtualization;
    updateVirtualizationLabel();
    const on = document.getElementById('virtualization-icon-on');
    const off = document.getElementById('virtualization-icon-off');
    if (on) on.style.display = state.simpleVirtualization ? '' : 'none';
    if (off) off.style.display = state.simpleVirtualization ? 'none' : '';

    import('../ui').then((UI) => UI.saveSettings());
    import('../sections').then((S) => S.updateCardsDepth());
  });
  document.querySelectorAll('.tunnel-option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      changeTunnelShape((opt as HTMLElement).dataset.shape || '');
    });
  });

  // ===== 카드 스타일 서브메뉴 =====
  document.getElementById('menu-card-style')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideTunnelSubmenu();
    toggleCardStyleSubmenu();
  });
  document.querySelectorAll('.card-style-option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      changeCardStyle((opt as HTMLElement).dataset.style || '');
    });
  });

  // ===== 바깥 클릭 시 메뉴 닫기 =====
  const outsideClickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('#settings-menu') &&
        !target.closest('#settings-btn') &&
        !target.closest('#tunnel-submenu') &&
        !target.closest('#card-style-submenu')) {
      hideSettingsMenu();
      hideTunnelSubmenu();
      hideCardStyleSubmenu();
    }
    // 이스터에그 패널 바깥 클릭 시 닫기
    if (!target.closest('#easter-egg-container')) {
      document.getElementById('easter-egg-panel')?.classList.remove('open');
      document.getElementById('easter-egg-indicator')?.classList.remove('active');
    }
  };
  addTracked(document, 'click', outsideClickHandler as EventListener);

  // ===== 아바타 클릭 시 =====
  const creditsAvatar = document.querySelector('.credits-avatar') as HTMLElement | null;
  if (creditsAvatar) {
    creditsAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      import('../effects').then((Effects) => Effects.createStarFlyby());
      window.open('https://music.youtube.com/watch?v=304DNFmHN5U', '_blank');
    });
    creditsAvatar.style.cursor = 'pointer';
  }

  // ===== 컬러 바 =====
  document.querySelectorAll('.color-bar-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyGlowTheme((btn as HTMLElement).dataset.theme || '');
      state.glowIntensity = 1;
    });
  });

  // ===== 배경 클릭 이펙트 =====
  const bgClickHandler = (e: MouseEvent) => {
    if (!clickFxEnabled) return;
    const target = e.target as HTMLElement;
    if (!target.closest('.shortcut-card') &&
        !target.closest('.floating-btn') &&
        !target.closest('#settings-menu') &&
        !target.closest('#tunnel-submenu') &&
        !target.closest('#color-bar') &&
        !target.closest('.modal-overlay') &&
        !target.closest('#context-menu') &&
        !target.closest('.depth-dot') &&
        !target.closest('#grid-scroll-controls') &&
        !target.closest('#easter-egg-container') &&
        !target.closest('#util-icons')) {
      createClickEffect(e.clientX, e.clientY);
    }
  };
  addTracked(document, 'click', bgClickHandler as EventListener);

  // ===== 그리드 스크롤 버튼 =====
  initGridScrollControls();

  // ===== 이스터에그 버튼 (1회 실행) =====
  document.getElementById('dragon-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createDragonAttack());
  });
  document.getElementById('wolf-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createWolfAppear());
  });
  document.getElementById('meteor-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createMeteor());
  });
  document.getElementById('meteor-impact-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createMeteorImpact());
  });
  document.getElementById('crow-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createCrowAttack());
  });
  document.getElementById('cat-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createCatPawEvent());
  });
  document.getElementById('ufo-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createUfoEvent());
  });
  document.getElementById('star-test-btn')?.addEventListener('click', () => {
    import('../effects').then((E) => E.createStarFlyby());
  });

  // ===== 클릭 리플 토글 =====
  const clickFxBtn = document.getElementById('click-fx-btn');
  if (clickFxBtn) {
    clickFxBtn.addEventListener('click', () => {
      clickFxEnabled = !clickFxEnabled;
      clickFxBtn.classList.toggle('active', clickFxEnabled);
    });
  }

  // ===== 카드 수면 토글 =====
  const cardSleepBtn = document.getElementById('card-sleep-btn');
  if (cardSleepBtn) {
    cardSleepBtn.addEventListener('click', () => {
      const isActive = cardSleepBtn.classList.toggle('active');
      if (isActive) {
        import('../effects').then((E) => E.startCardSleepSystem());
      }
      // When deactivating, the sleep system will stop on its own when no longer needed
    });
  }

  // ===== 아이콘 색상 토글 버튼 =====
  document.getElementById('icon-color-toggle-btn')?.addEventListener('click', () => {
    toggleIconColor();
  });

  // ===== 모바일 인디케이터 =====
  const leftSidebarIndicator = document.getElementById('left-sidebar-indicator');
  const leftSidebarContainer = document.getElementById('left-sidebar-container');
  if (leftSidebarIndicator && leftSidebarContainer) {
    leftSidebarIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      leftSidebarContainer.classList.toggle('menu-open');
    });
  }

  // ===== 이스터에그 패널 토글 =====
  const easterIndicator = document.getElementById('easter-egg-indicator');
  const easterPanel = document.getElementById('easter-egg-panel');
  if (easterIndicator && easterPanel) {
    easterIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      easterPanel.classList.toggle('open');
      easterIndicator.classList.toggle('active');
    });
  }

  // ===== 다국어 드롭다운 =====
  const localeDropdown = document.getElementById('locale-dropdown');
  const localeBtn = document.getElementById('locale-btn');

  // 현재 언어 활성 표시
  const currentLocale = localStorage.getItem(KEYS.LOCALE) ?? 'ko';
  localeDropdown
    ?.querySelector(`.locale-option[data-locale="${currentLocale}"]`)
    ?.classList.add('active');

  // 드롭다운 토글
  localeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    localeDropdown?.classList.toggle('open');
  });

  // 언어 선택
  localeDropdown?.querySelectorAll('.locale-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const locale = (btn as HTMLElement).dataset.locale ?? 'ko';
      localStorage.setItem(KEYS.LOCALE, locale);
      import('../ui').then((UI) => UI.showToast(`🌐 Language: ${locale.toUpperCase()}`));
      localeDropdown.classList.remove('open');
      setTimeout(() => location.reload(), 800);
    });
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', () => {
    localeDropdown?.classList.remove('open');
  });

  // ===== 테마 전환 (display 페이지용) =====
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const current = localStorage.getItem(KEYS.THEME) ?? 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEYS.THEME, next);
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) themeBtn.innerHTML = next === 'dark' ? '&#127769;' : '&#9728;&#65039;';
    import('../ui').then((UI) => UI.showToast(`🎨 Theme: ${next === 'dark' ? 'Dark' : 'Light'}`));
  });

  // ===== 종료 =====
  document.getElementById('exit-btn')?.addEventListener('click', () => {
    const exitModal = document.getElementById('exit-modal');
    if (exitModal) exitModal.classList.add('active');
  });
  document.getElementById('exit-cancel')?.addEventListener('click', () => {
    const exitModal = document.getElementById('exit-modal');
    if (exitModal) exitModal.classList.remove('active');
  });
  document.getElementById('exit-confirm')?.addEventListener('click', () => {
    window.close();
    // If window.close() doesn't work (not opened by script), show toast
    import('../ui').then((UI) => UI.showToast('⚠️ 브라우저에서 직접 닫아주세요'));
  });

  // ===== 테마 버튼 초기 상태 =====
  const savedTheme = localStorage.getItem(KEYS.THEME) ?? 'dark';
  const themeBtnEl = document.getElementById('theme-btn');
  if (themeBtnEl) themeBtnEl.innerHTML = savedTheme === 'dark' ? '&#127769;' : '&#9728;&#65039;';

  // ===== 레이아웃 아이콘 초기 상태 =====
  const gridIcon = document.getElementById('layout-icon-grid');
  const carouselIcon = document.getElementById('layout-icon-carousel');
  if (gridIcon && carouselIcon) {
    gridIcon.style.display = state.cardLayout === 'grid' ? '' : 'none';
    carouselIcon.style.display = state.cardLayout === 'carousel' ? '' : 'none';
  }

  // ===== 최근 사용 바로가기 =====
  document.getElementById('recent-btn')?.addEventListener('click', () => {
    import('../lanes').then((Lanes) => Lanes.goToLane(-1));
  });

  // ===== 돌아가기 버튼 =====
  document.getElementById('back-btn')?.addEventListener('click', () => {
    // 사이드 레인에 있으면 먼저 센터로 복귀
    if (state.currentLane !== 0) {
      import('../lanes').then((Lanes) => Lanes.goToLane(0));
      return;
    }
    // 히스토리에서 이전 섹션으로 이동
    const prev = state.sectionHistory.pop();
    if (prev !== undefined) {
      import('../sections').then((S) => S.goToSection(prev));
      // goToSection이 현재 섹션을 다시 push하므로 중복 제거
      state.sectionHistory.pop();
    } else {
      import('../ui').then((UI) => UI.showToast('이전 메뉴가 없습니다'));
    }
  });

  // ===== 배경 밝기 조절 =====
  const brightnessValueEl = document.getElementById('brightness-value');
  const updateBrightnessLabel = () => {
    if (brightnessValueEl) {
      brightnessValueEl.textContent = `${Math.round(state.auroraBrightness * 100)}%`;
    }
  };
  updateBrightnessLabel();

  // 밝기 항목 전체 클릭 시 메뉴 닫힘 방지
  document.getElementById('menu-brightness')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.getElementById('brightness-up')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.auroraBrightness = Math.min(3.0, +(state.auroraBrightness + 0.25).toFixed(2));
    updateBrightnessLabel();
    import('../ui').then((UI) => UI.saveSettings());
  });

  document.getElementById('brightness-down')?.addEventListener('click', (e) => {
    e.stopPropagation();
    state.auroraBrightness = Math.max(0.25, +(state.auroraBrightness - 0.25).toFixed(2));
    updateBrightnessLabel();
    import('../ui').then((UI) => UI.saveSettings());
  });

  // ===== 레이아웃 아이콘 초기 상태 =====
  {
    const g = document.getElementById('layout-icon-grid');
    const c = document.getElementById('layout-icon-carousel');
    const t = document.getElementById('layout-icon-thumbnail');
    if (g) g.style.display = state.cardLayout === 'grid' ? '' : 'none';
    if (c) c.style.display = state.cardLayout === 'carousel' ? '' : 'none';
    if (t) t.style.display = state.cardLayout === 'thumbnail' ? '' : 'none';
  }

  // ===== 가상화 아이콘/레이블 초기 상태 =====
  {
    const on = document.getElementById('virtualization-icon-on');
    const off = document.getElementById('virtualization-icon-off');
    if (on) on.style.display = state.simpleVirtualization ? '' : 'none';
    if (off) off.style.display = state.simpleVirtualization ? 'none' : '';
    updateVirtualizationLabel();
  }
  
  // ===== 3D 배경 초기 레이블 =====
  {
    update3DLabel();
  }
}

/**
 * 모든 추적된 이벤트 리스너 해제
 * React useEffect cleanup에서 호출
 */
export function cleanup(): void {
  handlers.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  handlers.length = 0;
}
