/**
 * @file src/lib/menu/handlers/click.ts
 * @description 클릭 이펙트 및 설정 메뉴 관련 핸들러
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 배경 클릭 시 리플/파티클 이펙트, 모달/컨텍스트 메뉴,
 *    설정 메뉴(터널, 카드 스타일, 3D, 가상화 등)의 클릭 핸들러를 관리합니다.
 * 2. **이펙트**: 배경 클릭 시 gsap 애니메이션으로 리플(물결)과 파티클(입자) 효과가 생성됩니다.
 * 3. **설정 메뉴**: 터널 모양, 카드 스타일, 3D 배경, 가상화 등의 토글 버튼들
 * 4. **카테고리 관리**: 카테고리 추가/편집/삭제 다이얼로그
 *
 * 원본: handlers/index.ts initEventListeners() 중 클릭 관련 이벤트에서 분리
 * UI 유틸리티 버튼(이스터에그, 테마, 종료 등)은 ui-buttons.ts로 분리
 */

import gsap from 'gsap';
import { state } from '../state';
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
  updateAutoRollingLabel,
} from '../ui';
import { saveShortcut, deleteShortcut } from './shortcut-crud';
import {
  changeSpaceType,
  changeTunnelShape,
  changeCardStyle,
  toggleIconColor,
} from './settings-handler';
import { initGridScrollControls } from './grid-scroll';
import { addTracked } from './tracker';

/** 클릭 리플 이펙트 활성 상태 */
let clickFxEnabled = false;

/**
 * 클릭 이펙트 활성/비활성 토글
 * ui-buttons.ts의 리플 토글 버튼에서 호출
 */
export function toggleClickFx(): boolean {
  clickFxEnabled = !clickFxEnabled;
  return clickFxEnabled;
}

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

/**
 * 모달, 컨텍스트 메뉴, 설정 메뉴, 카테고리 관련 클릭 핸들러 등록
 */
export function setupClickHandlers(): void {
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

  // ===== 설정 메뉴 =====
  document.getElementById('settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu();
  });

  // ===== 시스템 옵션 설정 =====
  document.getElementById('menu-display-options')?.addEventListener('click', () => {
    hideSettingsMenu();
    try { localStorage.setItem('mes-display-last-section', String(state.currentSection)); } catch {}

    window.dispatchEvent(
      new CustomEvent('mes-navigate', {
        detail: { url: '/display/18', title: '시스템 옵션 설정' },
      }),
    );
  });

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

  // ===== 레이아웃 전환 (그리드 -> 캐러셀 -> 썸네일 -> 그리드) =====
  document.getElementById('layout-toggle-btn')?.addEventListener('click', () => {
    const order = ['grid', 'carousel', 'thumbnail'] as const;
    const currentIdx = order.indexOf(state.cardLayout as typeof order[number]);
    const next = order[(currentIdx + 1) % order.length];
    import('../carousel').then((C) => C.changeCardLayout(next));
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
      const container = document.getElementById('three-container');
      if (container) container.innerHTML = '';
    }
  };

  const updateAutoRollingIcon = () => {
    const on = document.getElementById('rolling-icon-on');
    const off = document.getElementById('rolling-icon-off');
    const btn = document.getElementById('auto-rolling-toggle-btn');
    if (on) on.style.display = state.autoRolling ? '' : 'none';
    if (off) off.style.display = state.autoRolling ? 'none' : '';
    if (btn) btn.classList.toggle('rolling-active', state.autoRolling);
  };

  /** 메뉴 자동 롤링 토글 */
  const toggleAutoRolling = async (e: Event) => {
    e.stopPropagation();
    state.autoRolling = !state.autoRolling;
    updateAutoRollingLabel();
    updateAutoRollingIcon();

    const { startAutoRolling, stopAutoRolling } = await import('../init');
    if (state.autoRolling) {
      startAutoRolling();
    } else {
      stopAutoRolling();
    }

    import('../ui').then((UI) => UI.saveSettings());
  };

  document.getElementById('menu-enable-3d')?.addEventListener('click', toggleBackground3D);
  document.getElementById('menu-auto-rolling')?.addEventListener('click', toggleAutoRolling);
  document.getElementById('auto-rolling-toggle-btn')?.addEventListener('click', toggleAutoRolling);
  document.getElementById('bg-toggle-btn')?.addEventListener('click', toggleBackground3D);

  /** 가상화 토글 공통 핸들러 */
  const toggleVirtualization = (e: Event) => {
    e.stopPropagation();
    state.simpleVirtualization = !state.simpleVirtualization;
    updateVirtualizationLabel();
    const on = document.getElementById('virtualization-icon-on');
    const off = document.getElementById('virtualization-icon-off');
    if (on) on.style.display = state.simpleVirtualization ? '' : 'none';
    if (off) off.style.display = state.simpleVirtualization ? 'none' : '';

    import('../ui').then((UI) => UI.saveSettings());
    import('../sections').then((S) => S.updateCardsDepth());
  };

  document.getElementById('menu-virtualization')?.addEventListener('click', toggleVirtualization);
  document.getElementById('virtualization-toggle-btn')?.addEventListener('click', toggleVirtualization);

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

  // ===== 아이콘 색상 토글 버튼 =====
  document.getElementById('icon-color-toggle-btn')?.addEventListener('click', () => {
    toggleIconColor();
  });

  // ===== 자동 롤링 초기 레이블 & 아이콘 =====
  updateAutoRollingLabel();
  {
    const on = document.getElementById('rolling-icon-on');
    const off = document.getElementById('rolling-icon-off');
    const btn = document.getElementById('auto-rolling-toggle-btn');
    if (on) on.style.display = state.autoRolling ? '' : 'none';
    if (off) off.style.display = state.autoRolling ? 'none' : '';
    if (btn) btn.classList.toggle('rolling-active', state.autoRolling);
  }
}
