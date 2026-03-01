/**
 * @file src/lib/menu/lanes.ts
 * @description X축 레인 전환 시스템 (LEFT/CENTER/RIGHT) - 핵심 로직
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 3개의 레인으로 구성된 X축 전환
 *    - LEFT (-1): 히스토리 - 최근 사용한 바로가기
 *    - CENTER (0): 메인 - 기존 카테고리 섹션들
 *    - RIGHT (+1): 도구 - 설정 및 유틸리티
 * 2. **사용 방법**:
 *    ```ts
 *    import { goToLane, LANE_IDS } from '@/lib/menu/lanes';
 *    goToLane(LANE_IDS.LEFT); // 히스토리 레인으로 이동
 *    ```
 * 3. **입력**: Shift+휠 또는 좌우 화살표 키 (그리드 모드)
 * 4. **분리 구조**: 렌더링 로직은 lanes-render.ts에 분리
 *
 * 원본: mydesktop/js/lanes.js (App.Lanes)
 * 변경점:
 *   - `App.Lanes.xxx` -> named export 함수
 *   - `App.State` -> `state` (state.ts import)
 *   - `App.Sections` / `App.Carousel` -> import
 *   - 렌더링 코드를 lanes-render.ts로 분리 (500줄 제한 준수)
 */

import gsap from 'gsap';
import { state } from './state';
import * as Sections from './sections';
import * as Carousel from './carousel';
import { renderHistoryLane, renderToolsLane } from './lanes-render';
import type { Shortcut } from './types';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 레인 ID 매핑 */
export const LANE_IDS = { LEFT: -1, CENTER: 0, RIGHT: 1 } as const;

/** 레인 이름 및 설명 */
export const LANE_NAMES: Record<number, { name: string; subtitle: string; icon: string }> = {
  [-1]: { name: '히스토리', subtitle: '최근 사용한 바로가기', icon: '🕐' },
  [0]: { name: '메인', subtitle: '카테고리 탐색', icon: '🏠' },
  [1]: { name: '도구', subtitle: '설정 및 유틸리티', icon: '🔧' },
};

import { KEYS } from './storage';

/** 히스토리 최대 저장 개수 */
const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// Re-exports (lanes-render.ts에서)
// ---------------------------------------------------------------------------

export { renderHistoryLane, renderToolsLane };

// ---------------------------------------------------------------------------
// 히스토리 관리
// ---------------------------------------------------------------------------

/**
 * 히스토리 불러오기
 * @returns 히스토리 배열
 */
function loadHistory(): Shortcut[] {
  try {
    const saved = localStorage.getItem(KEYS.HISTORY);
    if (saved) {
      return JSON.parse(saved) as Shortcut[];
    }
  } catch (e) {
    console.error('Failed to load history:', e);
  }
  return [];
}

/**
 * 히스토리 저장
 * @param history - 히스토리 배열
 */
function saveHistory(history: Shortcut[]): void {
  try {
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

/**
 * 바로가기 사용 시 히스토리에 추가
 * @param shortcut - 사용한 바로가기 객체
 */
export function addToHistory(shortcut: Shortcut): void {
  if (!shortcut || !shortcut.id) return;

  let history = state.laneData.left as (Shortcut & { usedAt?: number })[];

  // 중복 제거 (이미 있으면 제거 후 맨 앞에 추가)
  history = history.filter((item) => item.id !== shortcut.id);

  // 맨 앞에 추가 (타임스탬프 포함)
  history.unshift({
    ...shortcut,
    usedAt: Date.now(),
  });

  // 최대 개수 제한
  if (history.length > MAX_HISTORY) {
    history = history.slice(0, MAX_HISTORY);
  }

  state.laneData.left = history;
  saveHistory(history);

  // 히스토리 레인이 현재 보이고 있으면 다시 렌더링
  if (state.currentLane === LANE_IDS.LEFT) {
    renderHistoryLane();
  }
}

// ---------------------------------------------------------------------------
// 레인 UI 생성
// ---------------------------------------------------------------------------

/**
 * 레인 화살표 생성 (휠 아이콘 양옆에 배치)
 */
export function createLaneIndicator(): void {
  // 이미 존재하면 제거
  const existing = document.getElementById('lane-arrows');
  if (existing) existing.remove();

  const scrollHint = document.getElementById('scroll-hint');
  if (!scrollHint) return;

  // 화살표 컨테이너
  const arrowsContainer = document.createElement('div');
  arrowsContainer.id = 'lane-arrows';

  // 왼쪽 화살표
  const leftArrow = document.createElement('div');
  leftArrow.id = 'lane-arrow-left';
  leftArrow.className = 'lane-arrow';
  leftArrow.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
    </svg>
  `;
  leftArrow.addEventListener('click', handleLeftArrowClick);

  // 오른쪽 화살표
  const rightArrow = document.createElement('div');
  rightArrow.id = 'lane-arrow-right';
  rightArrow.className = 'lane-arrow';
  rightArrow.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
    </svg>
  `;
  rightArrow.addEventListener('click', handleRightArrowClick);

  arrowsContainer.appendChild(leftArrow);
  arrowsContainer.appendChild(rightArrow);

  // scroll-hint 부모에 추가
  if (scrollHint.parentNode) {
    scrollHint.parentNode.insertBefore(arrowsContainer, scrollHint);
  }

  // 초기 상태 업데이트
  updateLaneIndicator();
}

/**
 * 왼쪽 화살표 클릭 핸들러
 */
function handleLeftArrowClick(): void {
  const currentLane = state.currentLane;
  if (currentLane === LANE_IDS.CENTER) {
    goToLane(LANE_IDS.LEFT);
  } else if (currentLane === LANE_IDS.RIGHT) {
    goToLane(LANE_IDS.CENTER);
  }
}

/**
 * 오른쪽 화살표 클릭 핸들러
 */
function handleRightArrowClick(): void {
  const currentLane = state.currentLane;
  if (currentLane === LANE_IDS.CENTER) {
    goToLane(LANE_IDS.RIGHT);
  } else if (currentLane === LANE_IDS.LEFT) {
    goToLane(LANE_IDS.CENTER);
  }
}

/**
 * 레인 화살표 상태 업데이트
 */
export function updateLaneIndicator(): void {
  const leftArrow = document.getElementById('lane-arrow-left');
  const rightArrow = document.getElementById('lane-arrow-right');

  if (!leftArrow || !rightArrow) return;

  const currentLane = state.currentLane;

  leftArrow.classList.remove('disabled');
  rightArrow.classList.remove('disabled');

  if (currentLane === LANE_IDS.LEFT) {
    leftArrow.classList.add('disabled');
  } else if (currentLane === LANE_IDS.RIGHT) {
    rightArrow.classList.add('disabled');
  }
}

/**
 * 레인 컨테이너 생성 (LEFT, RIGHT)
 */
function createLaneContainers(): void {
  const space = document.getElementById('cards-3d-space');
  if (!space) return;

  if (!document.getElementById('lane-left')) {
    const leftLane = document.createElement('div');
    leftLane.id = 'lane-left';
    leftLane.className = 'lane-container';
    space.appendChild(leftLane);
  }

  if (!document.getElementById('lane-right')) {
    const rightLane = document.createElement('div');
    rightLane.id = 'lane-right';
    rightLane.className = 'lane-container';
    space.appendChild(rightLane);
  }
}

// ---------------------------------------------------------------------------
// 레인 전환
// ---------------------------------------------------------------------------

/**
 * 특정 레인으로 이동
 * @param laneId - 레인 ID (-1, 0, 1)
 */
export function goToLane(laneId: number): void {
  if (state.isLaneTransitioning) return;
  if (laneId < -1 || laneId > 1) return;
  if (laneId === state.currentLane) return;

  state.isLaneTransitioning = true;

  const previousLane = state.currentLane;

  // 애니메이션 실행
  animateLaneTransition(previousLane, laneId);

  state.currentLane = laneId;
  updateLaneIndicator();

  // 캐러셀/썸네일 화살표 표시 업데이트
  Carousel.updateNavArrowsVisibility();
  import('./cards').then((Cards) => Cards.updateThumbnailArrowsVisibility());

  setTimeout(() => {
    state.isLaneTransitioning = false;
  }, 600);
}

/**
 * 레인 콘텐츠 정리
 * @param laneId - 정리할 레인 ID
 */
function clearLaneContent(laneId: number): void {
  if (laneId === LANE_IDS.LEFT) {
    const leftLane = document.getElementById('lane-left');
    if (leftLane) leftLane.innerHTML = '';
  } else if (laneId === LANE_IDS.RIGHT) {
    const rightLane = document.getElementById('lane-right');
    if (rightLane) rightLane.innerHTML = '';
  }
}

/**
 * 레인 전환 애니메이션
 * @param fromLane - 출발 레인
 * @param toLane - 도착 레인
 */
function animateLaneTransition(fromLane: number, toLane: number): void {
  const mainContainer = document.getElementById('cards-3d-space');
  const leftLane = document.getElementById('lane-left');
  const rightLane = document.getElementById('lane-right');
  const depthIndicator = document.getElementById('depth-indicator');
  const sectionInfo = document.getElementById('section-info');

  if (!mainContainer || !leftLane || !rightLane) return;

  const slideDistance = window.innerWidth * 0.8;
  const centerElements = mainContainer.querySelectorAll('.section-cards');

  if (toLane === LANE_IDS.CENTER) {
    // LEFT 또는 RIGHT에서 CENTER로 돌아오기
    const leavingLane = fromLane === LANE_IDS.LEFT ? leftLane : rightLane;
    const exitDirection = fromLane === LANE_IDS.LEFT ? -1 : 1;

    gsap.to(leavingLane, {
      x: exitDirection * slideDistance,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        leavingLane.classList.remove('active');
        gsap.set(leavingLane, { display: 'none', x: 0 });
        clearLaneContent(fromLane);
      },
    });

    const enterDirection = fromLane === LANE_IDS.LEFT ? 1 : -1;
    centerElements.forEach((el) => {
      gsap.set(el, { display: 'flex', x: enterDirection * slideDistance, opacity: 0 });
    });

    gsap.to(centerElements, {
      x: 0,
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
      stagger: 0.03,
      onComplete: () => {
        Sections.updateCardsDepth();
      },
    });

    if (depthIndicator) gsap.to(depthIndicator, { opacity: 1, duration: 0.3 });
    if (sectionInfo) gsap.to(sectionInfo, { opacity: 1, duration: 0.3 });
  } else if (fromLane === LANE_IDS.CENTER) {
    // CENTER에서 LEFT 또는 RIGHT로 이동
    const enteringLane = toLane === LANE_IDS.LEFT ? leftLane : rightLane;
    const exitDirection = toLane === LANE_IDS.LEFT ? 1 : -1;
    const enterDirection = toLane === LANE_IDS.LEFT ? -1 : 1;

    gsap.to(centerElements, {
      x: exitDirection * slideDistance,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      stagger: 0.02,
      onComplete: () => {
        centerElements.forEach((el) => {
          el.classList.remove('active');
          gsap.set(el, { display: 'none', x: 0 });
        });
      },
    });

    if (depthIndicator) gsap.to(depthIndicator, { opacity: 0, duration: 0.3 });
    if (sectionInfo) gsap.to(sectionInfo, { opacity: 0, duration: 0.3 });

    // 새 레인 콘텐츠 렌더링
    if (toLane === LANE_IDS.LEFT) {
      renderHistoryLane();
    } else {
      renderToolsLane();
    }

    gsap.set(enteringLane, {
      display: 'flex',
      x: enterDirection * slideDistance,
      opacity: 0,
    });
    enteringLane.classList.add('active');

    gsap.to(enteringLane, {
      x: 0,
      opacity: 1,
      duration: 0.4,
      ease: 'power2.out',
    });
  }
}

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

/**
 * 레인 시스템 초기화
 */
export function init(): void {
  // 히스토리 로드
  state.laneData.left = loadHistory();

  // 컨테이너 생성
  createLaneContainers();

  // 인디케이터 생성
  createLaneIndicator();

  // 초기 상태는 CENTER
  state.currentLane = LANE_IDS.CENTER;
}
