/**
 * @file src/lib/menu/lanes-render.ts
 * @description 레인 콘텐츠 렌더링 - 히스토리/도구 레인 UI 생성
 *
 * 초보자 가이드:
 * 1. **주요 개념**: LEFT 레인(히스토리)과 RIGHT 레인(도구)의 카드 UI를 생성
 * 2. **사용 방법**:
 *    ```ts
 *    import { renderHistoryLane, renderToolsLane } from '@/lib/menu/lanes-render';
 *    renderHistoryLane(); // 히스토리 카드 렌더링
 *    renderToolsLane();   // 도구 카드 렌더링
 *    ```
 * 3. **의존성**: state, gsap, ui
 *
 * 원본: mydesktop/js/lanes.js (App.Lanes) 중 렌더링 부분
 * 변경점:
 *   - lanes.ts에서 렌더링 코드를 분리하여 500줄 제한 준수
 *   - `window.open` -> `mes-navigate` CustomEvent
 */

import gsap from 'gsap';
import { state } from './state';
import {
  showToast,
  applyGlowTheme,
  toggleSettingsMenu,
} from './ui';
import type { Shortcut } from './types';

// ---------------------------------------------------------------------------
// 도구 카드 설정
// ---------------------------------------------------------------------------

/** 도구 카드 설정 */
const TOOLS_CONFIG = [
  {
    id: 'tool-settings',
    title: '설정',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
    action: 'openSettings',
  },
  {
    id: 'tool-categories',
    title: '카테고리',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>',
    action: 'openCategories',
  },
  {
    id: 'tool-import',
    title: '가져오기',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
    action: 'openImport',
  },
  {
    id: 'tool-theme',
    title: '테마',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    action: 'cycleTheme',
  },
];

// ---------------------------------------------------------------------------
// 히스토리 관리 (addToHistory는 lanes.ts에서 import하여 사용)
// ---------------------------------------------------------------------------

/**
 * 히스토리 저장 (내부 전용)
 * @param history - 히스토리 배열
 */
function saveHistory(history: Shortcut[]): void {
  try {
    localStorage.setItem('mydesktop-history', JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

/**
 * 시간 경과 텍스트 반환
 * @param timestamp - 타임스탬프
 * @returns 경과 시간 텍스트
 */
function getTimeAgo(timestamp?: number): string {
  if (!timestamp) return '';

  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

// ---------------------------------------------------------------------------
// 히스토리 레인 렌더링
// ---------------------------------------------------------------------------

/**
 * 히스토리 레인 렌더링
 */
export function renderHistoryLane(): void {
  const container = document.getElementById('lane-left');
  if (!container) return;

  const history = state.laneData.left as (Shortcut & { usedAt?: number })[];

  if (history.length === 0) {
    container.innerHTML = `
      <div class="lane-empty">
        <div class="lane-empty-icon">🕐</div>
        <div class="lane-empty-title">히스토리가 비어있습니다</div>
        <div class="lane-empty-subtitle">바로가기를 사용하면 여기에 기록됩니다</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="lane-header">
      <span class="lane-header-icon">🕐</span>
      <span class="lane-header-title">최근 사용</span>
    </div>
    <div class="lane-cards"></div>
  `;

  const cardsContainer = container.querySelector('.lane-cards');
  if (!cardsContainer) return;

  history.forEach((item, index) => {
    const card = createHistoryCard(item, index);
    cardsContainer.appendChild(card);
  });
}

/**
 * 히스토리 카드 생성
 * @param item - 히스토리 아이템
 * @param index - 인덱스
 * @returns 카드 요소
 */
function createHistoryCard(
  item: Shortcut & { usedAt?: number },
  index: number,
): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'history-card';
  card.dataset.id = item.id;
  card.style.setProperty('--card-color', item.color || 'var(--accent)');

  // 아이콘 처리
  let iconContent = '';
  if (item.icon && item.icon.startsWith('si:')) {
    const iconName = item.icon.replace('si:', '');
    const color = state.iconColorMode === 'white' ? 'white' : 'default';
    iconContent = `<img src="https://cdn.simpleicons.org/${iconName}/${color === 'white' ? 'white' : ''}" alt="${item.title}" onerror="this.parentElement.textContent='${item.title.charAt(0).toUpperCase()}'">`;
  } else if (item.icon && item.icon.startsWith('http')) {
    iconContent = `<img src="${item.icon}" alt="${item.title}" onerror="this.parentElement.textContent='${item.title.charAt(0).toUpperCase()}'">`;
  } else {
    iconContent = item.title.charAt(0).toUpperCase();
  }

  // 시간 표시
  const timeAgo = getTimeAgo(item.usedAt);

  card.innerHTML = `
    <div class="history-icon">${iconContent}</div>
    <div class="history-info">
      <div class="history-title">${item.title}</div>
      <div class="history-time">${timeAgo}</div>
    </div>
    <button class="history-delete-btn" title="삭제">
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  `;

  // 삭제 버튼 클릭 이벤트
  const deleteBtn = card.querySelector('.history-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromHistory(item.id, card);
    });
  }

  // 클릭 이벤트 - MES: dispatch navigation event
  card.addEventListener('click', () => {
    if (item.url) {
      // MES: dispatch navigation event instead of opening URL
      window.dispatchEvent(
        new CustomEvent('mes-navigate', {
          detail: { url: item.url, title: item.title },
        }),
      );
      // addToHistory는 lanes.ts에서 호출 (순환 참조 방지)
      import('./lanes').then((Lanes) => {
        Lanes.addToHistory(item);
      });
    }
  });

  // 등장 애니메이션
  gsap.fromTo(
    card,
    { opacity: 0, x: -50 },
    { opacity: 1, x: 0, duration: 0.3, delay: index * 0.05, ease: 'power2.out' },
  );

  return card;
}

/**
 * 히스토리에서 아이템 삭제
 * @param itemId - 삭제할 아이템 ID
 * @param cardElement - 카드 DOM 요소
 */
function removeFromHistory(itemId: string, cardElement: HTMLDivElement): void {
  gsap.to(cardElement, {
    opacity: 0,
    x: -50,
    scale: 0.8,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      let history = state.laneData.left;
      history = history.filter((item) => item.id !== itemId);
      state.laneData.left = history;
      saveHistory(history);

      cardElement.remove();

      if (history.length === 0) {
        renderHistoryLane();
      }

      showToast('삭제되었습니다');
    },
  });
}

// ---------------------------------------------------------------------------
// 도구 레인 렌더링
// ---------------------------------------------------------------------------

/**
 * 도구 레인 렌더링
 */
export function renderToolsLane(): void {
  const container = document.getElementById('lane-right');
  if (!container) return;

  container.innerHTML = `
    <div class="lane-header">
      <span class="lane-header-icon">🔧</span>
      <span class="lane-header-title">도구</span>
    </div>
    <div class="lane-cards tools-cards"></div>
  `;

  const cardsContainer = container.querySelector('.lane-cards');
  if (!cardsContainer) return;

  TOOLS_CONFIG.forEach((tool, index) => {
    const card = createToolCard(tool, index);
    cardsContainer.appendChild(card);
  });
}

/**
 * 도구 카드 생성
 * @param tool - 도구 설정
 * @param index - 인덱스
 * @returns 카드 요소
 */
function createToolCard(
  tool: (typeof TOOLS_CONFIG)[number],
  index: number,
): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'tool-card';
  card.dataset.action = tool.action;

  card.innerHTML = `
    <div class="tool-icon">${tool.icon}</div>
    <div class="tool-title">${tool.title}</div>
  `;

  card.addEventListener('click', () => {
    executeToolAction(tool.action);
  });

  gsap.fromTo(
    card,
    { opacity: 0, x: 50 },
    { opacity: 1, x: 0, duration: 0.3, delay: index * 0.05, ease: 'power2.out' },
  );

  return card;
}

/**
 * 도구 액션 실행
 * @param action - 액션 이름
 */
function executeToolAction(action: string): void {
  switch (action) {
    case 'openSettings':
      toggleSettingsMenu();
      break;
    case 'openCategories':
      import('./categories').then((Categories) => {
        Categories.openManager();
      });
      break;
    case 'openImport':
      // App.Bookmarks는 아직 포팅 전 - placeholder
      console.log('[Lanes] openImport - Bookmarks not ported yet');
      break;
    case 'cycleTheme': {
      const themes = ['gold', 'purple', 'cyan', 'pink', 'green', 'red', 'blue', 'white'];
      const currentIndex = themes.indexOf(state.glowTheme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      applyGlowTheme(nextTheme);
      state.glowIntensity = 1;
      showToast(`테마: ${nextTheme}`);
      break;
    }
  }
}
