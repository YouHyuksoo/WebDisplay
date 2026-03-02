/**
 * @file src/lib/menu/ui.ts
 * @description UI 관련 함수들 - 모달, 토스트, 컨텍스트 메뉴, 설정 메뉴, 다이얼로그 등
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 사용자 인터페이스 조작 함수들
 * 2. **사용 방법**: `import { openModal, showToast } from './ui'` 로 가져와 사용
 * 3. **의존성**: state, config, gsap 필요
 *
 * 원본: mydesktop/js/ui.js (App.UI 네임스페이스)
 * 변경점:
 *   - `App.UI.xxx` -> named export 함수
 *   - `App.State` -> state (state.ts import)
 *   - `App.Config` -> config.ts import
 *   - `App.saveSettings` -> Storage.saveSettings (storage.ts import)
 *   - `gsap` -> import gsap from 'gsap'
 *   - 다이얼로그(showConfirm, showPrompt, showAlert) 포함
 *   - ui-stub.ts를 대체하는 최종 모듈
 */

import gsap from 'gsap';
import { state } from './state';
import { COLORS, GLOW_THEMES } from './config';
import * as Storage from './storage';

// ---------------------------------------------------------------------------
// Modal (바로가기 추가/수정)
// ---------------------------------------------------------------------------

import type { Shortcut } from './types';

/**
 * 모달 열기
 * @param target - 수정할 바로가기 ID 또는 미리 채울 데이터 (null이면 새로 추가)
 */
export function openModal(target: string | Shortcut | null = null): void {
  const isShortcutObj = typeof target === 'object' && target !== null && 'url' in target;
  state.editingId = isShortcutObj ? null : (target as string | null);
  
  const modal = document.getElementById('shortcut-modal');
  const title = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('modal-delete');

  if (!modal || !title || !deleteBtn) return;

  // 카테고리 셀렉트 업데이트 (lazy import로 순환 참조 방지)
  import('./categories').then((Categories) => {
    if (Categories.updateCategorySelect) {
      Categories.updateCategorySelect();
    }
  });

  if (target) {
    let s: Shortcut | undefined;
    if (isShortcutObj) {
      s = target as Shortcut;
    } else {
      s = state.shortcuts.find((x) => x.id === target);
    }

    if (s) {
      title.textContent = isShortcutObj ? 'Add Shortcut' : 'Edit Shortcut';
      (document.getElementById('shortcut-title') as HTMLInputElement).value = s.title;
      (document.getElementById('shortcut-url') as HTMLInputElement).value = s.url;
      (document.getElementById('shortcut-layer') as HTMLSelectElement).value = String(s.layer);
      (document.getElementById('shortcut-icon') as HTMLInputElement).value = s.icon || '';
      state.selectedColor = s.color;
      deleteBtn.style.display = isShortcutObj ? 'none' : 'block';
    }
  } else {
    title.textContent = 'Add Shortcut';
    (document.getElementById('shortcut-title') as HTMLInputElement).value = '';
    (document.getElementById('shortcut-url') as HTMLInputElement).value = '';
    // 현재 섹션의 카테고리 ID로 설정
    import('./categories').then((Categories) => {
      const sections = Categories.getAll();
      const currentCategory = sections[state.currentSection];
      (document.getElementById('shortcut-layer') as HTMLSelectElement).value =
        currentCategory ? String(currentCategory.id) : '0';
    });
    (document.getElementById('shortcut-icon') as HTMLInputElement).value = '';
    state.selectedColor = COLORS[0];
    deleteBtn.style.display = 'none';
  }

  document.querySelectorAll('.color-option').forEach((opt) => {
    const el = opt as HTMLElement;
    el.classList.toggle('selected', el.style.background === state.selectedColor);
  });

  modal.classList.add('active');
}

/**
 * 모달 닫기
 */
export function closeModal(): void {
  const modal = document.getElementById('shortcut-modal');
  if (modal) modal.classList.remove('active');
  state.editingId = null;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

/**
 * 토스트 메시지 표시
 * @param message - 표시할 메시지
 */
export function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.log('[Toast]', message);
    return;
  }
  toast.textContent = message;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 2000);
}

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

/**
 * 컨텍스트 메뉴 표시
 * @param e - 마우스 이벤트
 * @param id - 대상 바로가기 ID
 */
export function showContextMenu(e: MouseEvent, id: string): void {
  const menu = document.getElementById('context-menu');
  if (!menu) return;
  state.contextTargetId = id;
  menu.style.left = e.clientX + 'px';
  menu.style.top = e.clientY + 'px';
  menu.classList.add('active');
}

/**
 * 컨텍스트 메뉴 숨기기
 */
export function hideContextMenu(): void {
  const menu = document.getElementById('context-menu');
  if (menu) menu.classList.remove('active');
}

// ---------------------------------------------------------------------------
// Settings Menu
// ---------------------------------------------------------------------------

/**
 * 설정 메뉴 토글
 */
export function toggleSettingsMenu(): void {
  const menu = document.getElementById('settings-menu');
  if (menu) menu.classList.toggle('active');
}

/**
 * 설정 메뉴 숨기기
 */
export function hideSettingsMenu(): void {
  const menu = document.getElementById('settings-menu');
  if (menu) menu.classList.remove('active');
}

// ---------------------------------------------------------------------------
// Tunnel Submenu
// ---------------------------------------------------------------------------

/** 터널 서브메뉴 표시 */
export function showTunnelSubmenu(): void {
  const el = document.getElementById('tunnel-submenu');
  if (el) el.classList.add('active');
}

/** 터널 서브메뉴 숨기기 */
export function hideTunnelSubmenu(): void {
  const el = document.getElementById('tunnel-submenu');
  if (el) el.classList.remove('active');
}

/** 터널 서브메뉴 토글 */
export function toggleTunnelSubmenu(): void {
  const el = document.getElementById('tunnel-submenu');
  if (el) el.classList.toggle('active');
}

// ---------------------------------------------------------------------------
// Card Style Submenu
// ---------------------------------------------------------------------------

/** 카드 스타일 서브메뉴 표시 */
export function showCardStyleSubmenu(): void {
  const el = document.getElementById('card-style-submenu');
  if (el) el.classList.add('active');
}

/** 카드 스타일 서브메뉴 숨기기 */
export function hideCardStyleSubmenu(): void {
  const el = document.getElementById('card-style-submenu');
  if (el) el.classList.remove('active');
}

/** 카드 스타일 서브메뉴 토글 */
export function toggleCardStyleSubmenu(): void {
  const el = document.getElementById('card-style-submenu');
  if (el) el.classList.toggle('active');
}

// ---------------------------------------------------------------------------
// Menu Update 함수
// ---------------------------------------------------------------------------

/**
 * 터널 메뉴 업데이트 (현재 선택된 모양 표시)
 */
export function updateTunnelMenu(): void {
  document.querySelectorAll('.tunnel-option').forEach((opt) => {
    const el = opt as HTMLElement;
    el.classList.toggle('active', el.dataset.shape === state.tunnelShape);
  });
}

/**
 * 공간 타입 메뉴 레이블 업데이트
 */
export function updateSpaceMenu(): void {
  const label = document.getElementById('space-type-label');
  if (label) {
    const spaceLabels: Record<string, string> = {
      tunnel: '공간: 클래식 터널',
      warp: '공간: 코스믹 워프',
      aurora: '공간: 오로라',
    };
    label.textContent = spaceLabels[state.spaceType] || spaceLabels.tunnel;
  }
}

/**
 * 카드 스타일 메뉴 업데이트
 */
export function updateCardStyleMenu(): void {
  document.querySelectorAll('.card-style-option').forEach((opt) => {
    const el = opt as HTMLElement;
    el.classList.toggle('active', el.dataset.style === state.cardStyle);
  });
}

/**
 * 아이콘 색상 레이블 업데이트
 */
export function updateIconColorLabel(): void {
  const label = document.getElementById('icon-color-label');
  if (label) {
    label.textContent = state.iconColorMode === 'brand' ? '아이콘: 브랜드 색상' : '아이콘: 흰색';
  }
}

/**
 * 카드 레이아웃 레이블 업데이트
 */
export function updateCardLayoutLabel(): void {
  const label = document.getElementById('card-layout-label');
  if (label) {
    label.textContent = state.cardLayout === 'carousel' ? '배치: 캐러셀' : '배치: 그리드';
  }
}

export function updateVirtualizationLabel(): void {
  const label = document.getElementById('virtualization-label');
  if (label) {
    label.textContent = state.simpleVirtualization ? '성능: 고성능 (가상화)' : '성능: 일반 (전체 로드)';
  }
}

/**
 * 3D 배경 레이블 및 아이콘 업데이트
 */
export function update3DLabel(): void {
  const label = document.getElementById('enable-3d-label');
  if (label) {
    label.textContent = state.enable3D ? '3D 배경: 켜짐' : '3D 배경: 꺼짐';
  }

  // 우측 상단 유틸리티 아이콘 업데이트
  const on = document.getElementById('bg-icon-on');
  const off = document.getElementById('bg-icon-off');
  if (on && off) {
    on.style.display = state.enable3D ? '' : 'none';
    off.style.display = state.enable3D ? 'none' : '';
  }
}

// ---------------------------------------------------------------------------
// Entrance Animation
// ---------------------------------------------------------------------------

/**
 * 초기 등장 애니메이션
 * @param isReturning - 디스플레이 화면 등에서 돌아오는 것인지 여부
 */
export function animateEntrance(isReturning = false): void {
  // 복귀 시에는 애니메이션 없이 즉시 표시
  if (isReturning) {
    gsap.set(['#section-info', '#clock-widget', '.depth-dot', '.bottom-buttons', '#scroll-hint'], {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
    });

    const activeSection = document.querySelector('.section-cards.active');
    if (activeSection) {
      gsap.set(activeSection, { opacity: 1 });
      if (state.cardLayout !== 'carousel') {
        const cards = activeSection.querySelectorAll('.shortcut-card');
        gsap.set(cards, { scale: 1, opacity: 1, z: 0 });
      }
    }
    return;
  }

  // 처음 진입 시 전형적인 애니메이션
  gsap.fromTo('#section-info',
    { y: -50, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8 },
  );
  gsap.fromTo('#clock-widget',
    { x: -50, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.6 },
  );
  gsap.fromTo('.depth-dot',
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.4, stagger: 0.1, delay: 0.3 },
  );
  gsap.fromTo('.bottom-buttons',
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, delay: 0.5, ease: 'back.out(1.7)' },
  );

  // 현재 섹션 카드들 등장 애니메이션 (캐러셀 모드 제외 — 3D 원형 배치 유지)
  const activeSection = document.querySelector('.section-cards.active');
  if (activeSection) {
    if (state.cardLayout === 'carousel') {
      // 캐러셀: 3D 원형 배치를 보존하며 전체 섹션만 페이드인
      gsap.fromTo(activeSection,
        { opacity: 0 },
        { opacity: 1, duration: 0.6 },
      );
    } else {
      const cards = activeSection.querySelectorAll('.shortcut-card');
      cards.forEach((card, i) => {
        gsap.fromTo(card,
          { scale: 0.3, opacity: 0, z: -200 },
          { scale: 1, opacity: 1, z: 0, duration: 0.6, delay: 0.2 + i * 0.08, ease: 'back.out(1.7)' },
        );
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Carousel UI
// ---------------------------------------------------------------------------

/**
 * 캐러셀 UI 업데이트
 */
export function updateCarouselUI(): void {
  const activeSection = document.querySelector('.section-cards.active');
  if (!activeSection) return;

  const cards = activeSection.querySelectorAll('.shortcut-card');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!dotsContainer) return;

  dotsContainer.classList.add('visible');
  dotsContainer.innerHTML = '';

  cards.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === state.carouselIndex ? ' active' : '');
    dot.addEventListener('click', () => {
      import('./carousel').then((Carousel) => {
        if (Carousel.goToCarouselIndex) {
          Carousel.goToCarouselIndex(i);
        }
      });
    });
    dotsContainer.appendChild(dot);
  });
}

/**
 * 캐러셀 UI 숨기기
 */
export function hideCarouselUI(): void {
  const dots = document.getElementById('carousel-dots');
  if (dots) dots.classList.remove('visible');
}

// ---------------------------------------------------------------------------
// Glow Theme
// ---------------------------------------------------------------------------

/**
 * 글로우 테마 적용
 * @param themeName - 테마 이름 (gold, purple, cyan 등)
 */
export function applyGlowTheme(themeName: string): void {
  const theme = GLOW_THEMES[themeName];
  if (!theme) return;

  // CSS 변수 업데이트
  document.documentElement.style.setProperty('--accent', theme.primary);
  document.documentElement.style.setProperty('--accent-secondary', theme.secondary);

  // 글로우 오브 색상 변경
  const orbs = document.querySelectorAll('.glow-orb');
  orbs.forEach((orb, i) => {
    if (theme.orbs[i]) {
      gsap.to(orb, {
        background: `radial-gradient(circle, ${theme.orbs[i]} 0%, transparent 70%)`,
        duration: 0.5,
      });
    }
  });

  // 버튼 활성화 상태 업데이트
  document.querySelectorAll('.color-bar-btn').forEach((btn) => {
    const el = btn as HTMLElement;
    el.classList.toggle('active', el.dataset.theme === themeName);
  });

  // 상태 저장
  state.glowTheme = themeName;
  saveSettings();
}

// ---------------------------------------------------------------------------
// Dialog (범용 다이얼로그)
// ---------------------------------------------------------------------------

/** 현재 다이얼로그의 resolve 함수 */
let dialogResolve: ((value: unknown) => void) | null = null;

/**
 * 다이얼로그 모달 표시
 * @param options - 다이얼로그 옵션
 * @returns 결과 Promise
 */
export function showDialog(options: {
  type?: 'confirm' | 'prompt' | 'alert';
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  placeholder?: string;
  danger?: boolean;
}): Promise<unknown> {
  return new Promise((resolve) => {
    dialogResolve = resolve;

    const modal = document.getElementById('dialog-modal');
    const titleEl = document.getElementById('dialog-title');
    const message = document.getElementById('dialog-message');
    const inputField = document.getElementById('dialog-input-field');
    const input = document.getElementById('dialog-input') as HTMLInputElement | null;
    const cancelBtn = document.getElementById('dialog-cancel');
    const confirmBtn = document.getElementById('dialog-confirm');

    if (!modal || !titleEl || !message || !inputField || !input || !cancelBtn || !confirmBtn) {
      resolve(null);
      return;
    }

    titleEl.textContent = options.title || '확인';
    message.textContent = options.message || '';
    confirmBtn.textContent = options.confirmText || '확인';
    cancelBtn.textContent = options.cancelText || '취소';

    if (options.type === 'prompt') {
      inputField.style.display = 'block';
      input.value = options.defaultValue || '';
      input.placeholder = options.placeholder || '';
      setTimeout(() => input.focus(), 100);
    } else {
      inputField.style.display = 'none';
    }

    if (options.type === 'alert') {
      cancelBtn.style.display = 'none';
    } else {
      cancelBtn.style.display = 'block';
    }

    if (options.danger) {
      confirmBtn.classList.remove('primary');
      confirmBtn.classList.add('danger');
    } else {
      confirmBtn.classList.remove('danger');
      confirmBtn.classList.add('primary');
    }

    modal.classList.add('active');
  });
}

/**
 * 다이얼로그 닫기
 * @param result - 결과값
 */
export function closeDialog(result: unknown): void {
  const modal = document.getElementById('dialog-modal');
  if (modal) modal.classList.remove('active');
  if (dialogResolve) {
    dialogResolve(result);
    dialogResolve = null;
  }
}

/**
 * 확인 다이얼로그 (confirm 대체)
 * @param message - 메시지
 * @param options - 추가 옵션
 * @returns 확인 여부
 */
export function showConfirm(
  message: string,
  options: { title?: string; confirmText?: string; cancelText?: string; danger?: boolean } = {},
): Promise<unknown> {
  return showDialog({
    type: 'confirm',
    title: options.title || '확인',
    message,
    confirmText: options.confirmText || '확인',
    cancelText: options.cancelText || '취소',
    danger: options.danger || false,
  });
}

/**
 * 입력 다이얼로그 (prompt 대체)
 * @param message - 메시지
 * @param defaultValue - 기본값
 * @param options - 추가 옵션
 * @returns 입력값 또는 null
 */
export function showPrompt(
  message: string,
  defaultValue = '',
  options: { title?: string; placeholder?: string; confirmText?: string; cancelText?: string } = {},
): Promise<unknown> {
  return showDialog({
    type: 'prompt',
    title: options.title || '입력',
    message,
    defaultValue,
    placeholder: options.placeholder || '',
    confirmText: options.confirmText || '확인',
    cancelText: options.cancelText || '취소',
  });
}

/**
 * 알림 다이얼로그 (alert 대체)
 * @param message - 메시지
 * @param options - 추가 옵션
 * @returns Promise
 */
export function showAlert(
  message: string,
  options: { title?: string; confirmText?: string } = {},
): Promise<unknown> {
  return showDialog({
    type: 'alert',
    title: options.title || '알림',
    message,
    confirmText: options.confirmText || '확인',
  });
}

/**
 * 다이얼로그 이벤트 리스너 초기화
 * DOMContentLoaded 후에 호출해야 함
 */
export function initDialogListeners(): void {
  const confirmBtn = document.getElementById('dialog-confirm');
  const cancelBtn = document.getElementById('dialog-cancel');
  const inputEl = document.getElementById('dialog-input') as HTMLInputElement | null;

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const inputField = document.getElementById('dialog-input-field');
      if (inputField && inputField.style.display !== 'none') {
        closeDialog((document.getElementById('dialog-input') as HTMLInputElement).value);
      } else {
        closeDialog(true);
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeDialog(null);
    });
  }

  if (inputEl) {
    inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        closeDialog(inputEl.value);
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Storage helper (편의 alias)
// ---------------------------------------------------------------------------

/**
 * 설정 저장 (state에서 추출하여 Storage에 저장)
 */
export function saveSettings(): void {
  Storage.saveSettings({
    tunnelShape: state.tunnelShape,
    glowTheme: state.glowTheme,
    iconColorMode: state.iconColorMode,
    cardStyle: state.cardStyle,
    spaceType: state.spaceType,
    cardLayout: state.cardLayout,
    auroraBrightness: state.auroraBrightness,
    simpleVirtualization: state.simpleVirtualization,
    enable3D: state.enable3D,
  });
}

/**
 * 바로가기 저장 (state.shortcuts를 Storage에 저장)
 */
export function saveShortcuts(): void {
  Storage.saveShortcuts(state.shortcuts);
}
