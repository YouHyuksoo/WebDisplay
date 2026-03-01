/**
 * @file src/lib/menu/carousel.ts
 * @description 캐러셀 레이아웃 - 가상화로 최대 8개만 렌더링
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 카드가 많아도 8개만 DOM에 렌더링하여 성능 최적화
 * 2. **사용 방법**:
 *    ```ts
 *    import { goToCarouselIndex, initCarousel } from '@/lib/menu/carousel';
 *    goToCarouselIndex(0); // 첫 번째 카드로 이동
 *    ```
 * 3. **의존성**: state, cards(lazy), gsap
 *
 * 원본: mydesktop/js/carousel.js (App.Carousel)
 * 변경점:
 *   - `App.Carousel.xxx` -> named export 함수
 *   - `App.state` -> `state` (state.ts import)
 *   - `App.Cards` -> lazy import (순환 참조 방지)
 *   - `App.showToast` -> ui.ts import
 */

import gsap from 'gsap';
import { state } from './state';
import { showToast, saveSettings } from './ui';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 한 번에 보여줄 최대 카드 수 */
export const VISIBLE_SLOTS = 8;

// ---------------------------------------------------------------------------
// 현재 섹션 바로가기
// ---------------------------------------------------------------------------

/**
 * 현재 섹션의 바로가기 목록 가져오기
 *
 * cards.ts의 getSections를 lazy import하여 순환 참조 방지
 * 동기 호출이 필요하므로, 동적 import 대신 require-style 접근 사용
 */
export function getCurrentShortcuts() {
  // 순환 참조 방지: 직접 categories에서 가져오기
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Categories = require('./categories') as typeof import('./categories');
  const sections = Categories.getAll();
  const currentSection = sections[state.currentSection];
  if (!currentSection) return [];

  return state.shortcuts.filter((s) => s.layer === currentSection.id);
}

// ---------------------------------------------------------------------------
// 캐러셀 UI
// ---------------------------------------------------------------------------

/**
 * 캐러셀 UI 업데이트 (점 인디케이터 - 페이지 단위)
 */
export function updateCarouselUI(): void {
  const shortcuts = getCurrentShortcuts();
  const totalCards = shortcuts.length;
  const dotsContainer = document.getElementById('carousel-dots');

  if (!dotsContainer) return;

  if (totalCards === 0) {
    dotsContainer.classList.remove('visible');
    return;
  }

  dotsContainer.classList.add('visible');

  // 페이지 수 계산 (8개씩)
  const totalPages = Math.ceil(totalCards / VISIBLE_SLOTS);
  const currentPage = Math.floor(state.carouselIndex / VISIBLE_SLOTS);

  // 점 생성 (페이지 단위)
  dotsContainer.innerHTML = '';
  for (let i = 0; i < totalPages; i++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (i === currentPage ? ' active' : '');
    dot.addEventListener('click', () => goToCarouselIndex(i * VISIBLE_SLOTS));
    dotsContainer.appendChild(dot);
  }
}

/**
 * 캐러셀 UI 숨기기
 */
export function hideCarouselUI(): void {
  const dotsContainer = document.getElementById('carousel-dots');
  if (dotsContainer) {
    dotsContainer.classList.remove('visible');
  }
}

// ---------------------------------------------------------------------------
// 캐러셀 슬롯 렌더링
// ---------------------------------------------------------------------------

/**
 * 캐러셀 슬롯 렌더링 (8개만)
 */
export function renderCarouselSlots(): void {
  const activeSection = document.querySelector('.section-cards.active') as HTMLElement | null;
  if (!activeSection) return;

  const shortcuts = getCurrentShortcuts();
  const totalCards = shortcuts.length;

  if (totalCards === 0) {
    activeSection.innerHTML = '<div class="empty-message">바로가기가 없습니다</div>';
    return;
  }

  // 현재 페이지의 시작 인덱스
  const pageStart = Math.floor(state.carouselIndex / VISIBLE_SLOTS) * VISIBLE_SLOTS;
  const pageEnd = Math.min(pageStart + VISIBLE_SLOTS, totalCards);
  const visibleShortcuts = shortcuts.slice(pageStart, pageEnd);

  // 기존 카드 제거
  activeSection.innerHTML = '';

  // cards.ts의 createCard를 lazy import (순환 참조 방지)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Cards = require('./cards') as typeof import('./cards');

  // 보이는 카드만 렌더링
  visibleShortcuts.forEach((shortcut, i) => {
    const card = Cards.createCard(shortcut, pageStart + i);
    activeSection.appendChild(card);
  });

  // 3D 위치 업데이트
  updateCarouselPosition(true);
}

// ---------------------------------------------------------------------------
// 캐러셀 위치 / 이동
// ---------------------------------------------------------------------------

/**
 * 캐러셀 위치 업데이트 (3D 원형 배치)
 * @param immediate - true면 애니메이션 없이 즉시 이동
 */
export function updateCarouselPosition(immediate = false): void {
  const activeSection = document.querySelector('.section-cards.active');
  if (!activeSection || state.cardLayout !== 'carousel') return;

  const cards = activeSection.querySelectorAll('.shortcut-card');
  const cardCount = cards.length;
  if (cardCount === 0) return;

  const isMobile = window.innerWidth <= 768;

  // 8개 이하이므로 적절한 반지름
  const baseRadius = isMobile ? 200 : 320;
  const radius = baseRadius;
  const angleStep = (Math.PI * 2) / Math.max(cardCount, 5);

  // 페이지 내 로컬 인덱스
  const pageStart = Math.floor(state.carouselIndex / VISIBLE_SLOTS) * VISIBLE_SLOTS;
  const localIndex = state.carouselIndex - pageStart;

  cards.forEach((card, i) => {
    const angle = angleStep * (i - localIndex);

    let x = 0,
      y = 0,
      z = 0,
      scale = 1,
      rotateY = 0,
      opacity = 1;

    const depth = Math.cos(angle);
    const normalizedDepth = (depth + 1) / 2;

    if (isMobile) {
      y = Math.sin(angle) * radius * 0.8;
      z = depth * 150;
      scale = 0.75 + 0.3 * normalizedDepth;     // 0.75 ~ 1.05 (center card slightly bigger)
      opacity = 0.6 + 0.4 * normalizedDepth;
    } else {
      x = Math.sin(angle) * radius;
      z = depth * 250;
      rotateY = -angle * (180 / Math.PI) * 0.4;
      scale = 0.75 + 0.35 * normalizedDepth;    // 0.75 ~ 1.1 (center card is bigger)
      opacity = 0.5 + 0.5 * normalizedDepth;
    }

    const zIndex = Math.round(50 + 50 * normalizedDepth);
    const pointerEvents = normalizedDepth > 0.3 ? 'auto' : 'none';

    const htmlCard = card as HTMLElement;

    if (immediate) {
      gsap.set(htmlCard, { x, y, z, scale, rotateY, opacity, zIndex });
    } else {
      gsap.to(htmlCard, {
        x,
        y,
        z,
        scale,
        rotateY,
        opacity,
        zIndex,
        duration: 0.25,
        ease: 'power2.out',
      });
    }
    htmlCard.style.pointerEvents = pointerEvents;
  });

  // 점 업데이트
  const totalCards = getCurrentShortcuts().length;
  const totalPages = Math.ceil(totalCards / VISIBLE_SLOTS);
  const currentPage = Math.floor(state.carouselIndex / VISIBLE_SLOTS);

  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === currentPage);
  });
}

/**
 * 특정 인덱스의 카드로 이동
 * @param index - 이동할 카드 인덱스
 */
export function goToCarouselIndex(index: number): void {
  const shortcuts = getCurrentShortcuts();
  const totalCards = shortcuts.length;
  if (totalCards === 0) return;

  // 순환 처리
  if (index < 0) index = totalCards - 1;
  if (index >= totalCards) index = 0;

  const oldPage = Math.floor(state.carouselIndex / VISIBLE_SLOTS);
  const newPage = Math.floor(index / VISIBLE_SLOTS);

  state.carouselIndex = index;

  // 페이지가 바뀌면 슬롯 재렌더링
  if (oldPage !== newPage) {
    renderCarouselSlots();
    updateCarouselUI();
  } else {
    updateCarouselPosition();
  }
}

/**
 * 이전 카드로 이동
 */
export function carouselPrev(): void {
  goToCarouselIndex(state.carouselIndex - 1);
}

/**
 * 다음 카드로 이동
 */
export function carouselNext(): void {
  goToCarouselIndex(state.carouselIndex + 1);
}

// ---------------------------------------------------------------------------
// 레이아웃 변경
// ---------------------------------------------------------------------------

/**
 * 카드 레이아웃 변경 (그리드 <-> 캐러셀)
 * @param layout - 'grid' 또는 'carousel'
 */
export function changeCardLayout(layout: string): void {
  state.cardLayout = layout;
  state.carouselIndex = 0;
  saveSettings();

  // cards.ts의 renderCards를 lazy import (순환 참조 방지)
  import('./cards').then((Cards) => {
    Cards.renderCards();
  });

  updateCardLayoutLabel();

  // 화살표 표시/숨김 업데이트
  updateNavArrowsVisibility();

  showToast(layout === 'carousel' ? '🎠 캐러셀 배치' : '📦 그리드 배치');
}

/**
 * 카드 레이아웃 라벨 업데이트
 */
export function updateCardLayoutLabel(): void {
  const label = document.getElementById('card-layout-label');
  if (label) {
    label.textContent = state.cardLayout === 'carousel' ? '배치: 캐러셀' : '배치: 그리드';
  }
}

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

/**
 * 캐러셀 초기화 (섹션 변경 시 호출)
 */
export function initCarousel(): void {
  if (state.cardLayout !== 'carousel') return;

  state.carouselIndex = 0;
  renderCarouselSlots();
  updateCarouselUI();
}

// ---------------------------------------------------------------------------
// 네비게이션 화살표
// ---------------------------------------------------------------------------

/**
 * 캐러셀 네비게이션 화살표 생성
 */
export function createCarouselNavArrows(): void {
  // 이미 존재하면 제거
  const existing = document.getElementById('carousel-nav-arrows');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'carousel-nav-arrows';
  container.innerHTML = `
    <div class="carousel-nav-arrow carousel-nav-prev">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
      </svg>
    </div>
    <div class="carousel-nav-arrow carousel-nav-next">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
      </svg>
    </div>
  `;

  document.body.appendChild(container);

  const prevArrow = container.querySelector('.carousel-nav-prev');
  const nextArrow = container.querySelector('.carousel-nav-next');

  // 클릭으로 이동
  if (prevArrow) prevArrow.addEventListener('click', carouselPrev);
  if (nextArrow) nextArrow.addEventListener('click', carouselNext);

  updateNavArrowsVisibility();
}

/**
 * 네비게이션 화살표 표시/숨김
 */
export function updateNavArrowsVisibility(): void {
  const container = document.getElementById('carousel-nav-arrows');
  if (!container) return;

  const isCarousel = state.cardLayout === 'carousel';
  const isCenter = state.currentLane === 0;
  const hasCards = getCurrentShortcuts().length > 0;

  if (isCarousel && isCenter && hasCards) {
    container.classList.add('visible');
  } else {
    container.classList.remove('visible');
  }
}

/**
 * 네비게이션 화살표 제거
 */
export function removeCarouselNavArrows(): void {
  const container = document.getElementById('carousel-nav-arrows');
  if (container) container.remove();
}

// ---------------------------------------------------------------------------
// 페이지 로드 시 화살표 생성 (DOMContentLoaded)
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createCarouselNavArrows);
  } else {
    setTimeout(createCarouselNavArrows, 100);
  }
}
