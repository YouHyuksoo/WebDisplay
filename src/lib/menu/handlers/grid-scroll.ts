/**
 * @file src/lib/menu/handlers/grid-scroll.ts
 * @description 그리드 스크롤 컨트롤
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 그리드 레이아웃에서 카드 목록 스크롤 제어
 * 2. **사용 방법**: `import { initGridScrollControls, updateGridScrollButtons } from './grid-scroll'`
 * 3. **의존성**: state
 *
 * 원본: mydesktop/js/handlers/grid-scroll.js (App.Handlers)
 * 변경점: `App.Handlers.xxx` -> named export
 */

import { state } from '../state';

/** 한 번 클릭 시 스크롤량 */
const SCROLL_AMOUNT = 200;

/**
 * 그리드 스크롤 컨트롤 초기화
 */
export function initGridScrollControls(): void {
  const scrollUpBtn = document.getElementById('grid-scroll-up');
  const scrollDownBtn = document.getElementById('grid-scroll-down');

  if (!scrollUpBtn || !scrollDownBtn) return;

  scrollUpBtn.addEventListener('click', () => {
    const activeSection = document.querySelector('.section-cards.active');
    if (activeSection) {
      activeSection.scrollBy({ top: -SCROLL_AMOUNT, behavior: 'smooth' });
      setTimeout(() => updateGridScrollButtons(), 300);
    }
  });

  scrollDownBtn.addEventListener('click', () => {
    const activeSection = document.querySelector('.section-cards.active');
    if (activeSection) {
      activeSection.scrollBy({ top: SCROLL_AMOUNT, behavior: 'smooth' });
      setTimeout(() => updateGridScrollButtons(), 300);
    }
  });

  // 스크롤 이벤트로 버튼 상태 업데이트
  document.addEventListener('scroll', (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.classList && target.classList.contains('section-cards')) {
      updateGridScrollButtons();
    }
  }, true);
}

/**
 * 그리드 스크롤 버튼 상태 업데이트
 */
export function updateGridScrollButtons(): void {
  const scrollControls = document.getElementById('grid-scroll-controls');
  const scrollUpBtn = document.getElementById('grid-scroll-up') as HTMLButtonElement | null;
  const scrollDownBtn = document.getElementById('grid-scroll-down') as HTMLButtonElement | null;
  const activeSection = document.querySelector('.section-cards.active');

  if (!scrollControls || !activeSection) return;

  // 캐러셀 모드면 숨김
  if (state.cardLayout === 'carousel') {
    scrollControls.classList.remove('visible');
    return;
  }

  // 스크롤 가능 여부 확인
  const isScrollable = activeSection.scrollHeight > activeSection.clientHeight;

  if (isScrollable) {
    scrollControls.classList.add('visible');
    activeSection.classList.add('grid-scrollable');

    if (scrollUpBtn) {
      scrollUpBtn.disabled = activeSection.scrollTop <= 0;
    }

    if (scrollDownBtn) {
      const maxScroll = activeSection.scrollHeight - activeSection.clientHeight;
      scrollDownBtn.disabled = activeSection.scrollTop >= maxScroll - 1;
    }
  } else {
    scrollControls.classList.remove('visible');
    activeSection.classList.remove('grid-scrollable');
  }
}
