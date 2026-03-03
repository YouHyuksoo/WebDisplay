/**
 * @file src/lib/menu/search.ts
 * @description 바로가기 검색 기능
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 상단 검색창에서 바로가기를 빠르게 검색
 * 2. **사용 방법**: `import * as Search from './search'; Search.init();`
 * 3. **단축키**: '/' 키로 검색창 포커스, 방향키로 결과 탐색, Enter로 이동
 *
 * 원본: mydesktop/js/search.js (App.Search)
 * 변경점: `App.Search.xxx` -> named export
 */

import { state } from './state';
import type { Shortcut } from './types';
import { openModal } from './ui';
import { t, getScreenTitle } from './i18n';

// ---------------------------------------------------------------------------
// 내부 상태
// ---------------------------------------------------------------------------

let searchInput: HTMLInputElement | null = null;
let searchResults: HTMLElement | null = null;
let searchContainer: HTMLElement | null = null;
let searchBox: HTMLElement | null = null;
let activeIndex = -1;
let currentResults: Shortcut[] = [];

// ---------------------------------------------------------------------------
// 유틸리티
// ---------------------------------------------------------------------------

/** 모바일 여부 확인 */
export function isMobile(): boolean {
  return window.innerWidth <= 480;
}

/** 입력 필드에 포커스 중인지 확인 */
function isInputFocused(): boolean {
  const active = document.activeElement as HTMLElement;
  return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || !!active?.isContentEditable;
}

/** 정규식 특수문자 이스케이프 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// 검색창 토글 (모바일용)
// ---------------------------------------------------------------------------

/**
 * 검색창 펼치기/접기 토글 (모바일용)
 */
export function toggle(forceState?: boolean): void {
  if (!searchContainer || !searchInput) return;

  const isExpanded = searchContainer.classList.contains('search-expanded');
  const shouldExpand = forceState !== undefined ? forceState : !isExpanded;

  if (shouldExpand) {
    searchContainer.classList.add('search-expanded');
    setTimeout(() => { searchInput?.focus(); }, 150);
  } else {
    searchContainer.classList.remove('search-expanded');
    if (searchInput) {
      searchInput.value = '';
      searchInput.blur();
    }
    close();
  }
}

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

/**
 * 검색 기능 초기화
 */
export function init(): void {
  searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  searchResults = document.getElementById('search-results');
  searchContainer = document.getElementById('search-container');
  searchBox = document.querySelector('.search-box');

  if (!searchInput || !searchResults) return;

  searchInput.addEventListener('input', handleSearchInput);
  searchInput.addEventListener('keydown', handleSearchKeydown);

  searchInput.addEventListener('focus', () => {
    if (searchInput && searchInput.value.trim()) {
      performSearch(searchInput.value);
    }
  });

  // 모바일: 검색 아이콘 클릭 시 토글
  if (searchBox) {
    searchBox.addEventListener('click', (e) => {
      if (isMobile()) {
        const isExpanded = searchContainer?.classList.contains('search-expanded');
        if (!isExpanded) {
          e.preventDefault();
          e.stopPropagation();
          toggle(true);
        } else if ((e.target as HTMLElement).closest('.search-icon')) {
          e.preventDefault();
          e.stopPropagation();
          toggle(false);
        }
      }
    });
  }

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('#search-container')) {
      close();
      if (isMobile()) toggle(false);
    }
  });

  // 전역 '/' 키로 검색창 포커스
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !isInputFocused()) {
      e.preventDefault();
      if (isMobile()) {
        toggle(true);
      } else {
        searchInput?.focus();
      }
    }
    if (e.key === 'Escape' && document.activeElement === searchInput) {
      close();
      searchInput?.blur();
      if (isMobile()) toggle(false);
    }
  });

  // 윈도우 리사이즈 시 상태 초기화
  window.addEventListener('resize', () => {
    if (!isMobile() && searchContainer) {
      searchContainer.classList.remove('search-expanded');
    }
  });
}

// ---------------------------------------------------------------------------
// 핸들러
// ---------------------------------------------------------------------------

/** 검색 입력 핸들러 */
function handleSearchInput(e: Event): void {
  const query = (e.target as HTMLInputElement).value.trim();
  if (query.length === 0) {
    close();
    return;
  }
  performSearch(query);
}

/** 키보드 네비게이션 */
function handleSearchKeydown(e: KeyboardEvent): void {
  if (!searchResults?.classList.contains('active')) return;

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, currentResults.length - 1);
      updateActiveResult();
      break;
    case 'ArrowUp':
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateActiveResult();
      break;
    case 'Enter':
      e.preventDefault();
      if (activeIndex >= 0 && currentResults[activeIndex]) {
        navigateToResult(currentResults[activeIndex]);
      }
      break;
    case 'Escape':
      close();
      searchInput?.blur();
      break;
  }
}

// ---------------------------------------------------------------------------
// 검색 로직
// ---------------------------------------------------------------------------

/** 검색 수행 */
function performSearch(query: string): void {
  const shortcuts = state.shortcuts || [];
  const lowerQuery = query.toLowerCase();

  currentResults = shortcuts.filter((shortcut) => {
    const titleMatch = shortcut.title.toLowerCase().includes(lowerQuery);
    const urlMatch = shortcut.url.toLowerCase().includes(lowerQuery);
    return titleMatch || urlMatch;
  }).slice(0, 10);

  activeIndex = currentResults.length > 0 ? 0 : -1;

  // Categories를 lazy import
  import('./categories').then((Categories) => {
    const categories = Categories.getAll();
    renderResults(currentResults, categories, query);
  });
}

/** 검색 결과 렌더링 */
function renderResults(
  results: Shortcut[],
  categories: Array<{ id: number; name: string }>,
  query: string,
): void {
  if (!searchResults) return;

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">' + t('menuUI.noSearchResults') + '</div>';
    searchResults.classList.add('active');
    return;
  }

  const html = results.map((item, index) => {
    const category = categories.find((c) => c.id === item.layer) || { name: 'Unknown' };
    const iconHtml = getIconHtml(item);
    const highlightedTitle = highlightMatch(item.title, query);

    return `
      <div class="search-result-item ${index === activeIndex ? 'active' : ''}" data-index="${index}">
        <div class="search-result-icon">${iconHtml}</div>
        <div class="search-result-info">
          <div class="search-result-title">${highlightedTitle}</div>
          <div class="search-result-category">${category.name}</div>
        </div>
      </div>
    `;
  }).join('');

  searchResults.innerHTML = html;
  searchResults.classList.add('active');

  searchResults.querySelectorAll('.search-result-item').forEach((item) => {
    // 아이콘 클릭 시 등록/수정 모달 (stopPropagation 처리로 탐색 방지)
    item.querySelector('.search-result-icon')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((item as HTMLElement).dataset.index || '0');
      const s = currentResults[idx];
      if (s) {
        const isRegistered = state.shortcuts.some((x) => x.url === s.url);
        if (isRegistered) {
          const existing = state.shortcuts.find((x) => x.url === s.url);
          openModal(existing!.id);
        } else {
          openModal(s);
        }
      }
    });

    item.addEventListener('click', () => {
      const idx = parseInt((item as HTMLElement).dataset.index || '0');
      if (currentResults[idx]) navigateToResult(currentResults[idx]);
    });
  });
}

/** 아이콘 HTML 생성 */
function getIconHtml(shortcut: Shortcut): string {
  const icon = shortcut.icon;
  if (!icon) return shortcut.title[0].toUpperCase();

  if (icon.startsWith('si:')) {
    const name = icon.substring(3);
    const color = shortcut.color ? shortcut.color.replace('#', '') : 'ffffff';
    return `<img src="https://cdn.simpleicons.org/${name}/${color}" alt="${shortcut.title}">`;
  }
  if (icon.startsWith('data:')) return `<img src="${icon}" alt="${shortcut.title}">`;
  if (icon.startsWith('http')) return `<img src="${icon}" alt="${shortcut.title}">`;

  return icon;
}

/** 검색어 하이라이트 */
function highlightMatch(text: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/** 활성 결과 업데이트 */
function updateActiveResult(): void {
  searchResults?.querySelectorAll('.search-result-item').forEach((item, idx) => {
    item.classList.toggle('active', idx === activeIndex);
    if (idx === activeIndex) {
      item.scrollIntoView({ block: 'nearest' });
    }
  });
}

/** 결과로 이동 */
function navigateToResult(shortcut: Shortcut): void {
  close();
  if (searchInput) {
    searchInput.value = '';
    searchInput.blur();
  }

  // CENTER 레인이 아니면 CENTER로 이동
  if (state.currentLane !== 0) {
    import('./lanes').then((Lanes) => Lanes.goToLane(0));
  }

  import('./categories').then((Categories) => {
    const categories = Categories.getAll();
    const targetSectionIndex = categories.findIndex((c) => c.id === shortcut.layer);
    const currentSection = state.currentSection;

    if (targetSectionIndex === -1) return;

    const laneDelay = state.currentLane !== 0 ? 500 : 0;

    setTimeout(() => {
      if (targetSectionIndex !== currentSection) {
        import('./sections').then((S) => S.goToSection(targetSectionIndex));
      }

      setTimeout(() => {
        highlightCard(shortcut.id);
      }, targetSectionIndex !== currentSection ? 600 : 100);
    }, laneDelay);
  });
}

/** 카드 하이라이트 효과 */
function highlightCard(cardId: string): void {
  const card = document.querySelector(`.shortcut-card[data-id="${cardId}"]`) as HTMLElement | null;
  if (!card) return;

  if (state.cardLayout === 'carousel') {
    const cards = Array.from(document.querySelectorAll('.section-cards.active .shortcut-card'));
    const cardIndex = cards.findIndex((c) => (c as HTMLElement).dataset.id === String(cardId));
    if (cardIndex >= 0) {
      state.carouselIndex = cardIndex;
      import('./carousel').then((Carousel) => Carousel.updateCarouselPosition());
    }
  }

  card.style.transition = 'all 0.3s ease';
  card.style.boxShadow = '0 0 30px var(--accent), 0 0 60px var(--accent)';
  card.style.transform = card.style.transform + ' scale(1.1)';

  setTimeout(() => {
    card.style.boxShadow = '';
    card.style.transform = card.style.transform.replace(' scale(1.1)', '');
  }, 1500);
}

/**
 * 검색 닫기
 */
export function close(): void {
  if (searchResults) searchResults.classList.remove('active');
  activeIndex = -1;
  currentResults = [];
}
