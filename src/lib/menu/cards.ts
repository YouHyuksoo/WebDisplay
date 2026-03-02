/**
 * @file src/lib/menu/cards.ts
 * @description 카드 생성 및 렌더링 관련 함수 모음
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 바로가기 카드를 DOM 요소로 생성하고 화면에 렌더링
 * 2. **사용 방법**:
 *    ```ts
 *    import { renderCards, createCard } from '@/lib/menu/cards';
 *    renderCards(); // 전체 카드 갱신
 *    ```
 * 3. **의존성**: state, config, carousel(lazy), sections(lazy), lanes(lazy), gsap
 *
 * 원본: mydesktop/js/cards.js (App.Cards)
 * 변경점:
 *   - `App.Cards.xxx` -> named export 함수
 *   - `App.state` -> `state` (state.ts import)
 *   - `App.Config` -> config.ts import
 *   - `App.Carousel` / `App.Sections` / `App.Lanes` -> lazy import (순환 참조 방지)
 *   - `App.openModal` / `App.showConfirm` / `App.showContextMenu` -> ui.ts import
 *   - 카드 클릭 시 `window.open` -> `mes-navigate` CustomEvent dispatch (MES 전용)
 */

import gsap from 'gsap';
import { state } from './state';
import { RAINBOW_COLORS, FAVORITES_CATEGORY_ID } from './config';
import * as Categories from './categories';
import {
  openModal,
  showConfirm,
  showContextMenu,
  saveShortcuts,
  showToast,
} from './ui';
import type { Shortcut, Category } from './types';

/** FAVORITES 카테고리의 layer ID — config.ts에서 관리 */
const FAVORITES_LAYER = FAVORITES_CATEGORY_ID;

/**
 * 해당 URL이 즐겨찾기에 등록되어 있는지 확인
 */
function isFavorited(url: string): boolean {
  return state.shortcuts.some((s) => s.layer === FAVORITES_LAYER && s.url === url);
}

/**
 * 즐겨찾기 토글 — 없으면 복사 등록, 있으면 제거
 * @returns 토글 후 즐겨찾기 상태 (true=등록됨)
 */
function toggleFavorite(shortcut: Shortcut): boolean {
  const favId = `fav-${shortcut.id}`;
  const existing = state.shortcuts.find(
    (s) => s.layer === FAVORITES_LAYER && s.url === shortcut.url,
  );

  if (existing) {
    state.shortcuts = state.shortcuts.filter((s) => s !== existing);
    saveShortcuts();
    showToast('즐겨찾기에서 제거됨');
    return false;
  }

  state.shortcuts.push({
    ...shortcut,
    id: favId,
    layer: FAVORITES_LAYER,
  });
  saveShortcuts();
  showToast('즐겨찾기에 등록됨');
  return true;
}

// ---------------------------------------------------------------------------
// 아이콘 라이브러리
// ---------------------------------------------------------------------------

/**
 * SVG 아이콘 라이브러리에서 아이콘 반환
 * @param name - 아이콘 이름
 * @param color - 아이콘 색상 (기본: white)
 * @returns SVG HTML 문자열
 */
export function getSvgIcon(name: string, color = 'white'): string {
  const icons: Record<string, string> = {
    calculator: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-6h2v6zm0-8h-2V7h2v2zm-8 8H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
    store: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M18.36 9l.6 3H5.04l.6-3h12.72M20 4H4v2h16V4zm0 3H4l-1 5v2h1v6h10v-6h4v6h2v-6h1v-2l-1-5zM6 18v-4h6v4H6z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`,
    scissors: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"/></svg>`,
    weather: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>`,
    edge: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M21 12c0-1.54-.37-3-.99-4.3-.62 1.1-.99 2.37-.99 3.71 0 2.87 1.63 5.38 4 6.63-.65 1.27-1.54 2.39-2.63 3.29C17.75 17.64 15.05 15 12 15c-2.21 0-4.21.9-5.66 2.34C4.9 15.9 4 13.9 4 12c0-4.42 3.58-8 8-8 2.03 0 3.89.76 5.3 2H12c-3.31 0-6 2.69-6 6 0 2.21 1.79 4 4 4 1.54 0 2.87-.87 3.54-2.15.42.1.86.15 1.31.15 1.55 0 2.98-.56 4.08-1.49.07.49.07.99.07 1.49 0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2c2.72 0 5.19 1.09 6.99 2.86C18.35 4.33 17.71 4 17 4c-1.66 0-3 1.34-3 3s1.34 3 3 3c.39 0 .76-.08 1.1-.21.58.93.9 2.02.9 3.21z"/></svg>`,
    word: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M6 2h8l6 6v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm8 7h5l-5-5v5zM8.5 18h1.2l1.3-5.3 1.3 5.3h1.2l1.8-7h-1.3l-1.1 5-1.3-5h-1.2l-1.3 5-1.1-5H7.7l1.8 7z"/></svg>`,
    excel: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M6 2h8l6 6v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm8 7h5l-5-5v5zM8 18h1.5l1.5-2.5 1.5 2.5H14l-2.25-3.5L14 11h-1.5l-1.5 2.5L9.5 11H8l2.25 3.5L8 18z"/></svg>`,
    powerpoint: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M6 2h8l6 6v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm8 7h5l-5-5v5zM8 18v-7h3c1.66 0 3 1.34 3 3s-1.34 3-3 3H9.5v1H8zm1.5-2.5H11c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H9.5v3z"/></svg>`,
    outlook: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>`,
    onenote: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M6 2h8l6 6v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm8 7h5l-5-5v5zM8 18v-7h1.5l2.5 4.5V11H14v7h-1.5L10 13.5V18H8z"/></svg>`,
    teams: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M19.19 8.77q-.46 0-.86-.18-.39-.18-.69-.48-.29-.31-.46-.71-.16-.41-.16-.86 0-.46.16-.85.17-.4.46-.7.3-.3.7-.47.39-.18.85-.18.46 0 .85.18.4.17.7.47.3.3.47.7.17.4.17.85 0 .45-.17.86-.17.4-.47.71-.3.3-.7.48-.39.18-.85.18zm-5.92-1.12q-.69 0-1.29-.26-.59-.27-1.04-.72-.44-.46-.69-1.06-.26-.6-.26-1.3 0-.69.26-1.29.25-.6.69-1.05.45-.44 1.04-.7.6-.26 1.3-.26.69 0 1.29.26.6.26 1.04.7.45.45.7 1.05.26.6.26 1.3 0 .69-.26 1.29-.25.6-.7 1.05-.44.45-1.04.72-.6.26-1.29.26zm8.08 10.35H14.7V10H21c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1h-.65zM3 19v-8c0-.55.45-1 1-1h7v9H4c-.55 0-1-.45-1-1zm9-9v10h4V10h-4z"/></svg>`,
    chatgpt: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>`,
    linkedin: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    // MES 메뉴 아이콘
    factory: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M22 22H2V10l7-3v3l7-3v3l6-3v15zM12 9.5l-7 3V20h14v-7.5l-7-3zm-3 8.5H7v-2h2v2zm0-3H7v-2h2v2zm4 3h-2v-2h2v2zm0-3h-2v-2h2v2zm4 3h-2v-2h2v2zm0-3h-2v-2h2v2z"/></svg>`,
    'error-log': `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM12 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2v-4h2v4z"/></svg>`,
    monitor: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>`,
    'pba-production': `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`,
    production: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
    yield: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>`,
    'chip-smd': `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M18 4V2h-2v2H8V2H6v2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h2v2h2v-2h8v2h2v-2h2c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-2zm2 14H4V6h16v12zM7 8h10v2H7zm0 3h10v2H7zm0 3h7v2H7z"/></svg>`,
    material: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z"/></svg>`,
    'msl-warning': `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    'operation-rate': `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>`,
    solder: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>`,
    stencil: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M17 3H7c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7V5h10v14zM8 7h3v3H8zm5 0h3v3h-3zM8 11.5h3v3H8zm5 0h3v3h-3zM8 16h3v2H8z"/></svg>`,
    vision: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
    temperature: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1h-1v1h1v2h-1v1h1v2h-2V5z"/></svg>`,
    humidity: `<svg viewBox="0 0 24 24" fill="${color}" width="36" height="36"><path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2C20 10.48 17.33 6.55 12 2zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z"/></svg>`,
  };
  return (
    icons[name] ||
    `<span style="color:${color};font-size:24px;font-weight:bold;">${name[0].toUpperCase()}</span>`
  );
}

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

/**
 * URL에서 도메인 추출
 * @param url - 전체 URL
 * @returns 도메인 또는 원본 URL
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// 아이콘 콘텐츠 생성
// ---------------------------------------------------------------------------

/**
 * 바로가기 아이콘 콘텐츠 생성
 * @param shortcut - 바로가기 객체
 * @returns 아이콘 HTML 문자열
 */
export function getIconContent(shortcut: Shortcut): string {
  const icon = shortcut.icon;
  if (!icon) {
    return `<span style="color:${shortcut.color};font-size:24px;font-weight:bold;">${shortcut.title[0].toUpperCase()}</span>`;
  }

  // Simple Icons (si:name)
  if (icon.startsWith('si:')) {
    const name = icon.replace('si:', '');
    const color = state.iconColorMode === 'white' ? 'white' : shortcut.color;
    return `<img src="https://cdn.simpleicons.org/${name}/${color.replace('#', '')}" alt="${shortcut.title}" onerror="this.parentElement.innerHTML='${shortcut.title[0].toUpperCase()}'">`;
  }

  // Data URI 이미지 (Base64 - Chrome 북마크에서 가져온 아이콘)
  if (icon.startsWith('data:')) {
    return `<img src="${icon}" alt="${shortcut.title}" onerror="this.parentElement.innerHTML='${shortcut.title[0].toUpperCase()}'">`;
  }

  // URL 이미지
  if (icon.startsWith('http')) {
    return `<img src="${icon}" alt="${shortcut.title}" onerror="this.parentElement.innerHTML='${shortcut.title[0].toUpperCase()}'">`;
  }

  // SVG 아이콘
  if (icon.startsWith('svg:')) {
    const name = icon.replace('svg:', '');
    const color = state.iconColorMode === 'white' ? 'white' : shortcut.color;
    return getSvgIcon(name, color);
  }

  return icon;
}

// getSections() → sections.ts로 통합
import { getSections } from './sections';
export { getSections };

// ---------------------------------------------------------------------------
// 카드 생성
// ---------------------------------------------------------------------------

/**
 * 단일 카드 DOM 요소 생성
 * @param shortcut - 바로가기 데이터
 * @param index - 카드 인덱스 (무지개 색상용)
 * @returns 카드 DOM 요소
 */
export function createCard(shortcut: Shortcut, index = 0): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'shortcut-card';

  if (state.cardStyle !== 'glass') {
    card.classList.add('style-' + state.cardStyle);
  }

  // 무지개 색상 적용
  if (state.cardStyle === 'rainbow') {
    const color = RAINBOW_COLORS[index % RAINBOW_COLORS.length];
    card.style.setProperty('--rainbow-r', String(color.r));
    card.style.setProperty('--rainbow-g', String(color.g));
    card.style.setProperty('--rainbow-b', String(color.b));
  }

  card.dataset.id = shortcut.id;

  const iconContent = getIconContent(shortcut);

  const favored = isFavorited(shortcut.url);
  card.innerHTML = `
    <div class="shortcut-icon">${iconContent}</div>
    <div class="shortcut-title">${shortcut.title}</div>
    <div class="shortcut-url">${getDomain(shortcut.url)}</div>
    <div class="card-actions">
      <button class="card-btn fav-btn${favored ? ' active' : ''}" data-tooltip="즐겨찾기">
        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </button>
      <button class="card-btn edit-btn" data-tooltip="수정">
        <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
      </button>
      <button class="card-btn delete-btn" data-tooltip="삭제">
        <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    </div>
  `;

  // 카드 색상을 글로우 효과로 활용
  card.style.setProperty('--card-color', shortcut.color);

  // 즐겨찾기 버튼
  card.querySelector('.fav-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget as HTMLElement;
    const nowActive = toggleFavorite(shortcut);
    btn.classList.toggle('active', nowActive);
    renderCards();
  });

  // 로고 아이콘 클릭 — 카드 클릭과 동일하게 내비게이션 (모달은 edit-btn 전용)

  // 수정 버튼
  card.querySelector('.edit-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(shortcut.id);
  });

  // 삭제 버튼
  card.querySelector('.delete-btn')!.addEventListener('click', async (e) => {
    e.stopPropagation();
    const confirmed = await showConfirm('삭제할까요?', {
      title: '바로가기 삭제',
      danger: true,
    });
    if (confirmed) {
      state.shortcuts = state.shortcuts.filter((x) => x.id !== shortcut.id);
      saveShortcuts();
      renderCards();
    }
  });

  // 마우스 다운 - 눌림 효과
  card.addEventListener('mousedown', () => {
    const parent = card.closest('.section-cards');
    if (!parent?.classList.contains('active')) return;
    card.classList.add('pressing');
  });

  // 마우스 업 - 눌림 해제
  card.addEventListener('mouseup', () => {
    card.classList.remove('pressing');
  });

  card.addEventListener('mouseleave', () => {
    card.classList.remove('pressing');
  });

  // 클릭 - MES: dispatch navigation event instead of opening URL
  card.addEventListener('click', () => {
    const parent = card.closest('.section-cards');
    if (!parent?.classList.contains('active')) return;
    if (card.classList.contains('opening')) return; // 중복 클릭 방지

    card.classList.remove('pressing');
    card.classList.add('opening');

    // 현재 섹션 위치 즉시 저장 (GSAP 애니메이션 전 — 페이지 전환 시 유실 방지)
    try { localStorage.setItem('mes-display-last-section', String(state.currentSection)); } catch {}

    // 짧은 애니메이션 후 내비게이션 이벤트 발생
    gsap.to(card, {
      scale: 1.05,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        // MES: dispatch navigation event instead of opening URL
        window.dispatchEvent(
          new CustomEvent('mes-navigate', {
            detail: { url: shortcut.url, title: shortcut.title },
          }),
        );

        // 히스토리에 추가 (lazy import로 순환 참조 방지)
        import('./lanes').then((Lanes) => {
          if (Lanes.addToHistory) {
            Lanes.addToHistory(shortcut);
          }
        });

        // 카드 상태 복원
        setTimeout(() => {
          card.classList.remove('opening');
          gsap.to(card, {
            scale: 1,
            duration: 0.3,
            ease: 'power2.out',
          });
        }, 300);
      },
    });
  });

  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const parent = card.closest('.section-cards');
    if (!parent?.classList.contains('active')) return;
    showContextMenu(e, shortcut.id);
  });

  return card;
}

// ---------------------------------------------------------------------------
// 썸네일 카드 생성
// ---------------------------------------------------------------------------

/**
 * 썸네일 모드 카드 DOM 요소 생성
 * @param shortcut - 바로가기 데이터
 * @param index - 카드 인덱스
 * @returns 썸네일 카드 DOM 요소
 */
export function createThumbnailCard(shortcut: Shortcut, index = 0): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'shortcut-card';

  if (state.cardStyle !== 'glass') {
    card.classList.add('style-' + state.cardStyle);
  }

  if (state.cardStyle === 'rainbow') {
    const color = RAINBOW_COLORS[index % RAINBOW_COLORS.length];
    card.style.setProperty('--rainbow-r', String(color.r));
    card.style.setProperty('--rainbow-g', String(color.g));
    card.style.setProperty('--rainbow-b', String(color.b));
  }

  card.dataset.id = shortcut.id;
  card.style.setProperty('--card-color', shortcut.color);

  // screenId 추출 (url에서 /display/XX 형태)
  const screenIdMatch = shortcut.url.match(/\/display\/(\d+)/);
  const screenId = screenIdMatch ? screenIdMatch[1] : '';
  const hasImage = !!screenId;

  // 이미지 영역
  const imageArea = document.createElement('div');
  imageArea.className = 'thumbnail-image-area';

  // 업로드 버튼
  const uploadBtn = document.createElement('button');
  uploadBtn.className = 'thumbnail-upload-btn';
  uploadBtn.textContent = '이미지 등록';
  uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerThumbnailUpload(screenId, card);
  });

  if (hasImage) {
    const img = document.createElement('img');
    img.src = `/thumbnails/${screenId}.png?t=${Date.now()}`;
    img.alt = shortcut.title;
    img.loading = 'lazy';
    img.onerror = () => {
      img.remove();
      imageArea.classList.add('empty');
      imageArea.insertBefore(createPlaceholder(), uploadBtn);
      uploadBtn.textContent = '이미지 등록';
    };
    img.onload = () => {
      uploadBtn.textContent = '이미지 변경';
    };
    imageArea.appendChild(img);
  } else {
    imageArea.classList.add('empty');
    imageArea.appendChild(createPlaceholder());
  }

  imageArea.appendChild(uploadBtn);

  // 제목 영역
  const titleArea = document.createElement('div');
  titleArea.className = 'thumbnail-title';
  titleArea.textContent = shortcut.title;

  // 액션 버튼 (즐겨찾기 / 수정 / 삭제)
  const favored = isFavorited(shortcut.url);
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.innerHTML = `
    <button class="card-btn fav-btn${favored ? ' active' : ''}" data-tooltip="즐겨찾기">
      <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
    </button>
    <button class="card-btn edit-btn" data-tooltip="수정">
      <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
    </button>
    <button class="card-btn delete-btn" data-tooltip="삭제">
      <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
    </button>
  `;

  actions.querySelector('.fav-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(shortcut);
    renderCards();
  });


  actions.querySelector('.edit-btn')!.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal(shortcut.id);
  });

  actions.querySelector('.delete-btn')!.addEventListener('click', async (e) => {
    e.stopPropagation();
    const confirmed = await showConfirm('삭제할까요?', {
      title: '바로가기 삭제',
      danger: true,
    });
    if (confirmed) {
      state.shortcuts = state.shortcuts.filter((x) => x.id !== shortcut.id);
      saveShortcuts();
      renderCards();
    }
  });

  card.appendChild(imageArea);
  card.appendChild(titleArea);
  card.appendChild(actions);

  // 클릭 - 디스플레이 화면 열기
  card.addEventListener('click', () => {
    const parent = card.closest('.section-cards');
    if (!parent?.classList.contains('active')) return;

    // 현재 섹션 위치 저장 (돌아왔을 때 복원용) — 동기 저장 필수
    try { localStorage.setItem('mes-display-last-section', String(state.currentSection)); } catch {}

    window.dispatchEvent(
      new CustomEvent('mes-navigate', {
        detail: { url: shortcut.url, title: shortcut.title },
      }),
    );

    import('./lanes').then((Lanes) => {
      if (Lanes.addToHistory) {
        Lanes.addToHistory(shortcut);
      }
    });
  });

  // 우클릭 컨텍스트 메뉴
  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const parent = card.closest('.section-cards');
    if (!parent?.classList.contains('active')) return;
    showContextMenu(e, shortcut.id);
  });

  return card;
}

/** 이미지 미등록 placeholder */
function createPlaceholder(): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'thumbnail-placeholder';
  placeholder.innerHTML = `
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
    <span>스크린샷 미등록</span>
  `;
  return placeholder;
}

/** 이미지 업로드 트리거 */
function triggerThumbnailUpload(screenId: string, card: HTMLDivElement): void {
  if (!screenId) {
    import('./ui').then(({ showToast }) => showToast('이 화면은 이미지 등록을 지원하지 않습니다'));
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('screenId', screenId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/thumbnails', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success) {
        const imageArea = card.querySelector('.thumbnail-image-area');
        if (imageArea) {
          imageArea.classList.remove('empty');
          const placeholder = imageArea.querySelector('.thumbnail-placeholder');
          if (placeholder) placeholder.remove();

          let img = imageArea.querySelector('img');
          if (!img) {
            img = document.createElement('img');
            img.alt = card.querySelector('.thumbnail-title')?.textContent || '';
            img.loading = 'lazy';
            imageArea.insertBefore(img, imageArea.querySelector('.thumbnail-upload-btn'));
          }
          img.src = `${data.path}?t=${Date.now()}`;

          const btn = imageArea.querySelector('.thumbnail-upload-btn');
          if (btn) btn.textContent = '이미지 변경';
        }

        import('./ui').then(({ showToast }) => showToast('스크린샷이 등록되었습니다'));
      } else {
        import('./ui').then(({ showToast }) => showToast(data.error || '업로드 실패'));
      }
    } catch {
      import('./ui').then(({ showToast }) => showToast('업로드 중 오류가 발생했습니다'));
    }
  };
  input.click();
}

// ---------------------------------------------------------------------------
// 카드 렌더링
// ---------------------------------------------------------------------------

/**
 * 특정 섹션의 카드들을 생성하여 컨테이너에 추가 (가상화 지원)
 */
export function populateSection(container: HTMLElement, sectionIndex: number): void {
  // 이미 카드가 있으면 리턴 (단, 썸네일 모드가 아니어야 함)
  if (state.cardLayout !== 'thumbnail' && state.cardLayout !== 'carousel' && container.querySelector('.shortcut-card')) {
    return;
  }

  const sections = getSections();
  const section = sections[sectionIndex];
  if (!section) return;

  const sectionShortcuts = state.shortcuts.filter((s) => s.layer === section.id);
  const isThumbnail = state.cardLayout === 'thumbnail';

  if (isThumbnail) {
    // 썸네일은 현재 보여주는 페이지(6개)만 렌더
    container.innerHTML = '';
    const startIdx = thumbnailPage * THUMBNAILS_PER_PAGE;
    const pageSlice = sectionShortcuts.slice(startIdx, startIdx + THUMBNAILS_PER_PAGE);
    pageSlice.forEach((shortcut, i) => {
      container.appendChild(createThumbnailCard(shortcut, i));
    });
  } else {
    // 그리드: 컨테이너 비우고 전부 생성 (레이아웃 보존용)
    container.innerHTML = '';
    sectionShortcuts.forEach((shortcut, i) => {
      container.appendChild(createCard(shortcut, i));
    });
  }
}

/**
 * 모든 섹션의 카드를 3D 깊이로 렌더링
 *
 * Carousel/Sections/Lanes/Events 모듈은 순환 참조 방지를 위해 lazy import 사용
 */
export function renderAllCards(): void {
  const space = document.getElementById('cards-3d-space');
  if (!space) return;

  // 레인 컨테이너 보존 (섹션 카드만 제거)
  const sectionCards = space.querySelectorAll('.section-cards');
  sectionCards.forEach((el) => el.remove());

  const sections = getSections();
  const isCarousel = state.cardLayout === 'carousel';
  const isThumbnail = state.cardLayout === 'thumbnail';

  sections.forEach((section, sectionIndex) => {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section-cards';

    if (isCarousel) {
      sectionDiv.classList.add('carousel-layout');
    }
    if (isThumbnail) {
      sectionDiv.classList.add('thumbnail-layout');
      // gsap이 display:flex를 인라인으로 덮어쓰므로, 인라인으로 grid 강제
      sectionDiv.style.display = 'grid';
      sectionDiv.style.gridTemplateColumns = 'repeat(3, 320px)';
      sectionDiv.style.gridTemplateRows = 'repeat(2, 220px)';
      sectionDiv.style.gap = '24px';
      sectionDiv.style.width = '1060px';
      sectionDiv.style.maxWidth = '96vw';
      sectionDiv.style.maxHeight = 'none';
      sectionDiv.style.flexWrap = 'unset';
    }

    sectionDiv.dataset.section = String(sectionIndex);
    sectionDiv.dataset.label = section.name;

    // 가상화 적용: 현재 섹션과 인접 섹션만 바로 로드
    const absOffset = Math.abs(sectionIndex - state.currentSection);

    if (!isCarousel) {
      if (!state.simpleVirtualization || absOffset <= 1) {
        populateSection(sectionDiv, sectionIndex);
      }
    }

    space.appendChild(sectionDiv);
  });

  // Sections/Carousel/Lanes를 lazy import로 호출 (순환 참조 방지)
  import('./sections').then((Sections) => {
    Sections.updateCardsDepth();
  });

  // 캐러셀 모드면 초기화 (8개만 렌더링)
  if (isCarousel) {
    state.carouselIndex = 0;
    import('./carousel').then((Carousel) => {
      Carousel.renderCarouselSlots();
      Carousel.updateCarouselUI();
    });
  } else {
    import('./carousel').then((Carousel) => {
      Carousel.hideCarouselUI();
    });
  }

  // 레인 컨테이너가 없으면 다시 생성 (설정 변경 등으로 제거된 경우)
  if (!document.getElementById('lane-left') || !document.getElementById('lane-right')) {
    const laneLeft = document.createElement('div');
    laneLeft.id = 'lane-left';
    laneLeft.className = 'lane-container';
    space.appendChild(laneLeft);

    const laneRight = document.createElement('div');
    laneRight.id = 'lane-right';
    laneRight.className = 'lane-container';
    space.appendChild(laneRight);
  }

  // 레인 화살표 인디케이터도 확인
  if (!document.getElementById('lane-arrows')) {
    import('./lanes').then((Lanes) => {
      Lanes.createLaneIndicator();
    });
  }

  // 썸네일 네비게이션 관리
  if (isThumbnail) {
    thumbnailPage = 0;
    createThumbnailNavArrows();
  } else {
    removeThumbnailNavArrows();
  }
}

// ---------------------------------------------------------------------------
// 썸네일 스크롤 화살표
// ---------------------------------------------------------------------------

/** 한 페이지에 표시할 썸네일 수 (3열 x 2행) */
const THUMBNAILS_PER_PAGE = 6;

/** 현재 썸네일 페이지 (모듈 레벨) */
let thumbnailPage = 0;

/**
 * 썸네일 페이지 렌더링 (현재 섹션의 카드를 6개씩 페이지로 표시)
 */
export function renderThumbnailPage(): void {
  const section = document.querySelector(
    `.section-cards.thumbnail-layout[data-section="${state.currentSection}"]`
  ) as HTMLElement | null;
  if (!section) return;

  // 현재 섹션의 바로가기 목록
  const sections = getSections();
  const currentSec = sections[state.currentSection];
  if (!currentSec) return;

  const shortcuts = state.shortcuts.filter((s) => s.layer === currentSec.id);
  const totalPages = Math.max(1, Math.ceil(shortcuts.length / THUMBNAILS_PER_PAGE));

  // 페이지 범위 보정
  if (thumbnailPage >= totalPages) thumbnailPage = totalPages - 1;
  if (thumbnailPage < 0) thumbnailPage = 0;

  // 현재 페이지의 카드만 슬라이스
  const start = thumbnailPage * THUMBNAILS_PER_PAGE;
  const pageShortcuts = shortcuts.slice(start, start + THUMBNAILS_PER_PAGE);

  // 기존 카드 제거 후 재렌더
  section.innerHTML = '';
  pageShortcuts.forEach((shortcut, i) => {
    section.appendChild(createThumbnailCard(shortcut, start + i));
  });

  updateThumbnailNavState(shortcuts.length);
}

/**
 * 썸네일 좌우 네비게이션 화살표 생성
 */
function createThumbnailNavArrows(): void {
  removeThumbnailNavArrows();

  const container = document.createElement('div');
  container.id = 'thumbnail-nav-arrows';
  container.innerHTML = `
    <div class="thumbnail-nav-arrow thumbnail-nav-prev">
      <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
    </div>
    <div class="thumbnail-nav-arrow thumbnail-nav-next">
      <svg viewBox="0 0 24 24"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
    </div>
  `;

  // 페이지 인디케이터
  const pageInfo = document.createElement('div');
  pageInfo.id = 'thumbnail-page-info';

  document.body.appendChild(container);
  document.body.appendChild(pageInfo);
  container.classList.add('visible');
  pageInfo.classList.add('visible');

  container.querySelector('.thumbnail-nav-prev')
    ?.addEventListener('click', () => {
      if (thumbnailPage > 0) {
        thumbnailPage--;
        renderThumbnailPage();
      }
    });
  container.querySelector('.thumbnail-nav-next')
    ?.addEventListener('click', () => {
      thumbnailPage++;
      renderThumbnailPage();
    });
}

/**
 * 썸네일 네비게이션 제거
 */
function removeThumbnailNavArrows(): void {
  document.getElementById('thumbnail-nav-arrows')?.remove();
  document.getElementById('thumbnail-page-info')?.remove();
}

/**
 * 좌우 화살표 활성/비활성 + 페이지 표시 업데이트
 */
function updateThumbnailNavState(totalCards: number): void {
  const totalPages = Math.max(1, Math.ceil(totalCards / THUMBNAILS_PER_PAGE));
  const prevBtn = document.querySelector('.thumbnail-nav-prev');
  const nextBtn = document.querySelector('.thumbnail-nav-next');
  const pageInfo = document.getElementById('thumbnail-page-info');

  prevBtn?.classList.toggle('disabled', thumbnailPage <= 0);
  nextBtn?.classList.toggle('disabled', thumbnailPage >= totalPages - 1);

  if (pageInfo) {
    if (totalPages > 1) {
      pageInfo.textContent = `${thumbnailPage + 1} / ${totalPages}`;
      pageInfo.classList.add('visible');
    } else {
      pageInfo.classList.remove('visible');
    }
  }
}

/**
 * 썸네일 네비게이션 표시/숨김 업데이트
 */
export function updateThumbnailArrowsVisibility(): void {
  const arrowContainer = document.getElementById('thumbnail-nav-arrows');
  const pageInfo = document.getElementById('thumbnail-page-info');
  if (!arrowContainer) return;

  const isThumbnail = state.cardLayout === 'thumbnail';
  const isCenter = state.currentLane === 0;

  if (isThumbnail && isCenter) {
    arrowContainer.classList.add('visible');
    pageInfo?.classList.add('visible');
  } else {
    arrowContainer.classList.remove('visible');
    pageInfo?.classList.remove('visible');
  }
}

/**
 * 썸네일 페이지 초기화 (섹션 전환 시)
 */
export function resetThumbnailPage(): void {
  thumbnailPage = 0;
}

/**
 * ID로 즐겨찾기 토글 (컨텍스트 메뉴에서 호출)
 */
export function toggleFavoriteById(id: string): void {
  const shortcut = state.shortcuts.find((s) => s.id === id);
  if (shortcut) {
    toggleFavorite(shortcut);
    renderCards();
  }
}

/**
 * 카드 렌더링 (renderAllCards 래퍼)
 */
export function renderCards(): void {
  renderAllCards();
}
