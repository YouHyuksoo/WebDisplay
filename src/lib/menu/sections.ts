/**
 * @file src/lib/menu/sections.ts
 * @description 섹션 전환 및 깊이 관리 관련 함수 모음
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 3D 터널 내 섹션(레이어) 간 전환 및 깊이 효과 관리
 * 2. **사용 방법**:
 *    ```ts
 *    import { goToSection, updateCardsDepth } from '@/lib/menu/sections';
 *    goToSection(2); // 3번째 섹션으로 이동
 *    ```
 * 3. **의존성**: state, config, categories, carousel(lazy), gsap
 *
 * 원본: mydesktop/js/sections.js (App.Sections)
 * 변경점:
 *   - `App.Sections.xxx` -> named export 함수
 *   - `App.state` -> `state` (state.ts import)
 *   - `App.Config` -> config.ts import
 *   - `App.Carousel` -> carousel.ts import (동기 참조)
 *   - `App.Categories` -> categories.ts import
 */

import gsap from 'gsap';
import { state } from './state';
import { DEFAULT_CATEGORIES } from './config';
import * as Categories from './categories';
import * as Carousel from './carousel';
import type { Category } from './types';
import { t } from './i18n';

/** 동적 import 캐시 (매 전환마다 import() 반복 방지) */
let _cardsModule: typeof import('./cards') | null = null;
function getCardsModule(): Promise<typeof import('./cards')> {
  if (_cardsModule) return Promise.resolve(_cardsModule);
  return import('./cards').then((m) => { _cardsModule = m; return m; });
}

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 섹션 간 Z 간격 */
export const DEPTH_SPACING = 600;

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

/**
 * 현재 사용 가능한 카테고리(섹션) 목록 반환
 * 동적 카테고리(기본 + 사용자 정의) 반환
 * @returns 카테고리 배열
 */
export function getSections(): Category[] {
  if (typeof Categories.getAll === 'function') {
    return Categories.getAll();
  }
  return DEFAULT_CATEGORIES;
}

// ---------------------------------------------------------------------------
// 섹션 이동
// ---------------------------------------------------------------------------

/**
 * 특정 섹션으로 이동
 * @param index - 이동할 섹션 인덱스
 * @param forceDirection - 강제 방향 지정 (1: 앞으로, -1: 뒤로)
 */
export function goToSection(index: number, forceDirection: number | null = null): void {
  if (state.isTransitioning) return;

  const sections = getSections();

  // 순환 처리 및 방향 계산
  let direction: number;
  if (index < 0) {
    index = sections.length - 1;
    direction = -1; // 뒤로 가는 것
  } else if (index >= sections.length) {
    index = 0;
    direction = 1; // 앞으로 가는 것
  } else {
    direction = index > state.currentSection ? 1 : -1;
  }

  if (index === state.currentSection) return;
  if (forceDirection !== null) direction = forceDirection;

  // 히스토리에 현재 섹션 기록 (돌아가기 기능용, 최대 20개)
  state.sectionHistory.push(state.currentSection);
  if (state.sectionHistory.length > 20) state.sectionHistory.shift();

  state.isTransitioning = true;

  // 터널 가속
  state.targetSpeed = direction * 30;

  // [최적화] 기존 타이틀 트윈 정리
  gsap.killTweensOf('#section-info');

  // 섹션 타이틀 애니메이션
  gsap.to('#section-info', {
    opacity: 0,
    y: direction * -30,
    duration: 0.3,
    onComplete: () => {
      state.currentSection = index;
      updateSectionInfo();
      updateDepthIndicator();

      gsap.fromTo(
        '#section-info',
        { opacity: 0, y: direction * 30 },
        { opacity: 1, y: 0, duration: 0.3 },
      );
    },
  });

  // 카드 깊이 업데이트 (GSAP로 부드럽게)
  animateCardsToSection(index, direction);

  // 터널 속도를 서서히 감속
  gsap.to({ speed: state.targetSpeed }, {
    speed: 0,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate: function (this: gsap.core.Tween) {
      state.targetSpeed = (this.targets()[0] as { speed: number }).speed;
    },
  });

  // 라이트 모드: 즉시 해제, 일반: 애니메이션 완료 후 해제
  const transitionDuration = state.simpleVirtualization ? 100 : 700;
  setTimeout(() => {
    state.isTransitioning = false;
  }, transitionDuration);

  // 스크롤 힌트 숨기기
  gsap.to('#scroll-hint', { opacity: 0, duration: 0.5 });
}

/**
 * 다음 섹션으로 이동 (자동 롤링용)
 */
export function goToNextSection(): void {
  const sections = getSections();
  if (sections.length === 0) return;
  const next = (state.currentSection + 1) % sections.length;
  goToSection(next, 1);
}

// ---------------------------------------------------------------------------
// 카드 애니메이션
// ---------------------------------------------------------------------------

/**
 * 카드들을 목표 섹션으로 애니메이션 (무한 순환 지원)
 *
 * 순환 오프셋 계산으로 마지막→첫번째, 첫번째→마지막 이동 시에도
 * 최단 경로로 부드러운 전환을 구현합니다.
 *
 * @param targetIndex - 목표 섹션 인덱스
 * @param direction - 이동 방향 (1 또는 -1)
 */
export function animateCardsToSection(targetIndex: number, direction: number): void {
  const sections = document.querySelectorAll('.section-cards');
  const sectionCount = sections.length;

  // 먼저 모든 섹션에서 active 제거
  sections.forEach((s) => s.classList.remove('active'));

  sections.forEach((section, i) => {
    // 순환 오프셋: 최단 경로 계산
    let offset = i - targetIndex;
    if (offset > sectionCount / 2) offset -= sectionCount;
    if (offset < -sectionCount / 2) offset += sectionCount;

    const absOffset = Math.abs(offset);

    const zPos = -offset * DEPTH_SPACING;
    const scale = offset === 0 ? 1 : Math.max(0.3, 1 - absOffset * 0.4);
    const yOffset = offset > 0 ? -40 : offset < 0 ? 40 : 0;

    const isGridMode = state.cardLayout === 'grid';
    const visibleRange = isGridMode ? 1 : 0;
    const opacity = absOffset <= visibleRange ? (offset === 0 ? 1 : 0.15) : 0;
    const zIndex = 100 - absOffset;

    gsap.killTweensOf(section);

    // 보이지 않는 섹션은 즉시 숨김
    if (absOffset > visibleRange) {
      gsap.set(section, {
        z: zPos, scale: scale, opacity: 0, y: yOffset, zIndex,
        display: 'none',
      });
      return;
    }

    // 가까운 섹션: display 설정 + 그리드 모드만 사전 카드 로드
    // (썸네일/캐러셀은 onSectionComplete에서 렌더 — 이중 렌더 방지)
    if (state.cardLayout === 'grid') {
      getCardsModule().then((Cards) => {
        Cards.populateSection(section as HTMLElement, i);
      });
    }

    if (state.cardLayout === 'thumbnail' && (section as HTMLElement).classList.contains('thumbnail-layout')) {
      gsap.set(section, { display: 'grid' });
    } else {
      gsap.set(section, { display: 'flex' });
    }

    // [라이트 모드] 즉시 전환 vs [일반] 부드러운 애니메이션
    const sectionProps = { z: zPos, scale, opacity, y: yOffset, zIndex };
    const onSectionComplete = () => {
      if (offset === 0) {
        section.classList.add('active');
        (section as HTMLElement).scrollTop = 0;
        if (state.cardLayout === 'carousel') {
          state.carouselIndex = 0;
          Carousel.renderCarouselSlots();
          Carousel.updateCarouselUI();
        }
        if (state.cardLayout === 'thumbnail') {
          getCardsModule().then((Cards) => {
            Cards.resetThumbnailPage();
            Cards.renderThumbnailPage();
            Cards.updateThumbnailArrowsVisibility();
          });
        }
      }
    };

    if (state.simpleVirtualization) {
      // 라이트 모드: 즉시 전환 (GSAP 트윈 0개)
      gsap.set(section, sectionProps);
      onSectionComplete();
    } else {
      gsap.to(section, {
        ...sectionProps,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
        onComplete: onSectionComplete,
      });
    }

    // 현재 섹션 카드 등장 처리
    if (offset === 0) {
      const cards = section.querySelectorAll('.shortcut-card');

      // [최적화] 이미 렌더된 카드(data-shown)는 가벼운 fade만,
      // 최초 등장 카드만 scale 애니메이션 (DOM 재활용 시 부하 대폭 감소)
      const isFirstRender = !section.hasAttribute('data-rendered');
      if (isFirstRender) section.setAttribute('data-rendered', '1');

      if (state.simpleVirtualization) {
        // 라이트 모드: 카드 애니메이션 전체 스킵
        gsap.set(cards, { scale: 1, opacity: 1 });
      } else if (isFirstRender) {
        // 최초 등장: scale 애니메이션 (최대 8개)
        const maxAnimCards = Math.min(cards.length, 8);
        for (let ci = 0; ci < maxAnimCards; ci++) {
          gsap.fromTo(
            cards[ci],
            { scale: 0.5, opacity: 0 },
            {
              scale: 1, opacity: 1,
              duration: 0.35, delay: 0.15 + ci * 0.03,
              ease: 'back.out(1.7)', overwrite: 'auto',
            },
          );
        }
        for (let ci = maxAnimCards; ci < cards.length; ci++) {
          gsap.set(cards[ci], { scale: 1, opacity: 1 });
        }
      }
      // 재방문 + 일반 모드: 애니메이션 없음 (섹션 자체 opacity 전환으로 충분)
    }
  });
}

// ---------------------------------------------------------------------------
// 섹션 정보 업데이트
// ---------------------------------------------------------------------------

/**
 * 섹션 정보 UI 업데이트
 */
export function updateSectionInfo(): void {
  const sections = getSections();
  const section = sections[state.currentSection];
  if (!section) return;

  const titleEl = document.getElementById('section-title');
  const subtitleEl = document.getElementById('section-subtitle');

  if (titleEl) {
    const nameKey = `menuUI.catName${section.id}`;
    const translatedName = t(nameKey);
    titleEl.textContent = translatedName !== nameKey ? translatedName : section.name;
  }
  if (subtitleEl) {
    const subtitleKey = `menuUI.catSub${section.id}`;
    const translated = t(subtitleKey);
    subtitleEl.textContent = translated !== subtitleKey ? translated : section.subtitle;
  }
}

// ---------------------------------------------------------------------------
// 깊이 관리
// ---------------------------------------------------------------------------

/**
 * 카드 섹션들의 3D 깊이 업데이트 (무한 순환 지원)
 */
export function updateCardsDepth(): void {
  const sections = document.querySelectorAll('.section-cards');
  const sectionCount = sections.length;

  sections.forEach((section, i) => {
    // 순환 오프셋: 최단 경로 계산
    let offset = i - state.currentSection;
    if (offset > sectionCount / 2) offset -= sectionCount;
    if (offset < -sectionCount / 2) offset += sectionCount;

    const absOffset = Math.abs(offset);
    const zPos = -offset * DEPTH_SPACING;
    const scale = offset === 0 ? 1 : Math.max(0.3, 1 - absOffset * 0.4);
    const yOffset = offset > 0 ? -30 : offset < 0 ? 30 : 0;

    const isGridMode = state.cardLayout === 'grid';
    const visibleRange = isGridMode ? 1 : 0;
    const opacity = absOffset <= visibleRange ? (offset === 0 ? 1 : 0.1) : 0;
    const zIndex = 100 - absOffset;

    // 보이는 범위의 섹션만 카드 로드
    if (absOffset <= visibleRange) {
      getCardsModule().then((Cards) => {
        Cards.populateSection(section as HTMLElement, i);
      });
    }

    gsap.set(section, {
      z: zPos,
      scale: scale,
      opacity: opacity,
      y: yOffset,
      zIndex: zIndex,
      display: absOffset <= visibleRange
        ? ((section as HTMLElement).classList.contains('thumbnail-layout') ? 'grid' : 'flex')
        : 'none',
    });

    section.classList.toggle('active', offset === 0);
  });
}

/**
 * 깊이 인디케이터(도트) 업데이트
 */
export function updateDepthIndicator(): void {
  document.querySelectorAll('.depth-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.currentSection);
  });
}

/**
 * 깊이 인디케이터 초기 생성
 */
export function createDepthIndicator(): void {
  const container = document.getElementById('depth-indicator');
  if (!container) return;

  const sections = getSections();

  // 기존 내용 제거 (재생성 시)
  container.innerHTML = '';

  sections.forEach((section, i) => {
    const dot = document.createElement('div');
    dot.className = 'depth-dot' + (i === state.currentSection ? ' active' : '');
    const icon = 'icon' in section ? (section as Category).icon : '';
    const nameKey = `menuUI.catName${section.id}`;
    const translatedName = t(nameKey);
    const displayName = translatedName !== nameKey ? translatedName : section.name;
    dot.dataset.label = `${icon || ''} ${displayName}`;
    dot.addEventListener('click', () => goToSection(i));
    container.appendChild(dot);
  });

  // + 버튼 추가 (인디케이터 아래에 위치)
  const addBtn = document.createElement('button');
  addBtn.className = 'depth-add-btn';
  addBtn.id = 'depth-add-btn';
  addBtn.title = t('menuUI.newCategory');
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    Categories.openEditDialog();
  });
  container.appendChild(addBtn);
}
