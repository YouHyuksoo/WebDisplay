/**
 * @file src/lib/menu/handlers/ui-buttons.ts
 * @description UI 유틸리티 버튼 핸들러 - 이스터에그, 테마, 종료, 밝기, 다국어 등
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 메뉴 시스템의 보조 UI 버튼들을 담당합니다.
 *    클릭 이펙트나 설정 메뉴가 아닌, 독립적인 기능 버튼들입니다.
 * 2. **이스터에그 버튼**: 드래곤, 늑대, 유성, 까마귀, 고양이, UFO, 별 등
 *    숨겨진 비주얼 이펙트를 트리거합니다.
 * 3. **테마/다국어**: 다크/라이트 테마 전환, 한/영/중 언어 전환
 * 4. **밝기 조절**: 배경 오로라 밝기를 25% 단위로 조절합니다.
 *
 * 원본: handlers/click.ts에서 UI 버튼 부분을 분리
 */

import { state } from '../state';
import { KEYS } from '../storage';
import {
  updateVirtualizationLabel,
  update3DLabel,
} from '../ui';
import { toggleClickFx } from './click';

/**
 * 이스터에그, 리플 토글, 카드 수면, 아이콘 색상 등의 버튼 핸들러 등록
 */
export function setupUtilityButtonHandlers(): void {
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
      const enabled = toggleClickFx();
      clickFxBtn.classList.toggle('active', enabled);
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
    });
  }

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

  const currentLocale = localStorage.getItem(KEYS.LOCALE) ?? 'ko';
  localeDropdown
    ?.querySelector(`.locale-option[data-locale="${currentLocale}"]`)
    ?.classList.add('active');

  localeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    localeDropdown?.classList.toggle('open');
  });

  localeDropdown?.querySelectorAll('.locale-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const locale = (btn as HTMLElement).dataset.locale ?? 'ko';
      localStorage.setItem(KEYS.LOCALE, locale);
      import('../ui').then((UI) => UI.showToast(`🌐 Language: ${locale.toUpperCase()}`));
      localeDropdown.classList.remove('open');
      setTimeout(() => location.reload(), 800);
    });
  });

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
    import('../ui').then((UI) => UI.showToast('⚠️ 브라우저에서 직접 닫아주세요'));
  });

  // ===== 최근 사용 바로가기 =====
  document.getElementById('recent-btn')?.addEventListener('click', () => {
    import('../lanes').then((Lanes) => Lanes.goToLane(-1));
  });

  // ===== 돌아가기 버튼 =====
  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (state.currentLane !== 0) {
      import('../lanes').then((Lanes) => Lanes.goToLane(0));
      return;
    }
    const prev = state.sectionHistory.pop();
    if (prev !== undefined) {
      import('../sections').then((S) => S.goToSection(prev));
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
}

/**
 * UI 초기 상태 설정 (레이아웃 아이콘, 가상화 아이콘, 3D 레이블 등)
 * initEventListeners()의 마지막에 호출
 */
export function setupInitialUIState(): void {
  // ===== 테마 버튼 초기 상태 =====
  const savedTheme = localStorage.getItem(KEYS.THEME) ?? 'dark';
  const themeBtnEl = document.getElementById('theme-btn');
  if (themeBtnEl) themeBtnEl.innerHTML = savedTheme === 'dark' ? '&#127769;' : '&#9728;&#65039;';

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
