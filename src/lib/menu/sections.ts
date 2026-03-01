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
import { SECTIONS } from './config';
import * as Categories from './categories';
import * as Carousel from './carousel';
import type { Category, Section } from './types';

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
 * Categories가 있으면 동적 카테고리, 없으면 기본 SECTIONS 사용
 * @returns 카테고리 배열
 */
export function getSections(): (Category | Section)[] {
  if (typeof Categories.getAll === 'function') {
    return Categories.getAll();
  }
  return SECTIONS;
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

  setTimeout(() => {
    state.isTransitioning = false;
  }, 800);

  // 스크롤 힌트 숨기기
  gsap.to('#scroll-hint', { opacity: 0, duration: 0.5 });
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

    // 현재 섹션과 앞/뒤 1개만 보이게, 나머지는 숨김
    // 뒤 섹션은 0.1로 매우 투명하게 (앞 카드와 확실히 구분)
    const opacity = absOffset <= 1 ? (offset === 0 ? 1 : 0.1) : 0;

    // z-index로 렌더링 순서 강제
    const zIndex = 100 - absOffset;

    // 애니메이션 전에 보여야 할 섹션은 display 먼저 설정
    if (absOffset <= 1) {
      if (state.cardLayout === 'thumbnail' && (section as HTMLElement).classList.contains('thumbnail-layout')) {
        gsap.set(section, { display: 'grid' });
      } else {
        gsap.set(section, { display: 'flex' });
      }
    }

    gsap.to(section, {
      z: zPos,
      scale: scale,
      opacity: opacity,
      y: yOffset,
      zIndex: zIndex,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => {
        if (offset === 0) {
          section.classList.add('active');
          // 스크롤 위치 초기화
          (section as HTMLElement).scrollTop = 0;
          // 캐러셀 모드면 슬롯 재렌더링 (가상화)
          if (state.cardLayout === 'carousel') {
            state.carouselIndex = 0;
            Carousel.renderCarouselSlots();
            Carousel.updateCarouselUI();
          }
          // 썸네일 모드면 페이지 리셋 + 재렌더
          if (state.cardLayout === 'thumbnail') {
            import('./cards').then((Cards) => {
              Cards.resetThumbnailPage();
              Cards.renderThumbnailPage();
              Cards.updateThumbnailArrowsVisibility();
            });
          }
        }
        // 애니메이션 끝난 후 멀리 있는 섹션 숨김
        if (absOffset > 1) {
          gsap.set(section, { display: 'none' });
        }
      },
    });

    // 현재 섹션 카드들 등장 애니메이션
    if (offset === 0) {
      const cards = section.querySelectorAll('.shortcut-card');
      cards.forEach((card, ci) => {
        gsap.fromTo(
          card,
          { scale: 0.5, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            delay: 0.3 + ci * 0.05,
            ease: 'back.out(1.7)',
          },
        );
      });
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

  if (titleEl) titleEl.textContent = section.name;
  if (subtitleEl) subtitleEl.textContent = section.subtitle;
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

    // 현재 섹션과 앞/뒤 1개만 보이게, 나머지는 숨김
    // 뒤 섹션은 0.1로 매우 투명하게 (앞 카드와 확실히 구분)
    const opacity = absOffset <= 1 ? (offset === 0 ? 1 : 0.1) : 0;

    // z-index로 렌더링 순서 강제 (현재 섹션이 가장 위)
    const zIndex = 100 - absOffset;

    // GSAP.set으로 초기 상태 설정
    gsap.set(section, {
      z: zPos,
      scale: scale,
      opacity: opacity,
      y: yOffset,
      zIndex: zIndex,
      display: absOffset <= 1
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
    dot.dataset.label = `${icon || ''} ${section.name}`;
    dot.addEventListener('click', () => goToSection(i));
    container.appendChild(dot);
  });

  // + 버튼 추가 (인디케이터 아래에 위치)
  const addBtn = document.createElement('button');
  addBtn.className = 'depth-add-btn';
  addBtn.id = 'depth-add-btn';
  addBtn.title = '새 카테고리 추가';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    Categories.openEditDialog();
  });
  container.appendChild(addBtn);
}
