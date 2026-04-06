/**
 * @file src/lib/menu/storage.ts
 * @description localStorage를 통한 메뉴 데이터 영속화 관리
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 브라우저 localStorage를 사용해 사용자 설정과 바로가기를 저장/복원
 * 2. **사용 방법**: `import * as Storage from '@/lib/menu/storage'` 후
 *    `Storage.loadShortcuts()`, `Storage.saveSettings(settings)` 등으로 호출
 * 3. **데이터 구조**:
 *    - shortcuts: 바로가기 배열 (JSON)
 *    - settings: 사용자 설정 객체 (tunnelShape, glowTheme, iconColorMode 등)
 *    - categories: 사용자 정의 카테고리 배열 (JSON)
 *
 * 원본: mydesktop/js/storage.js (App.Storage 네임스페이스)
 * 변경점:
 *   - `App.Storage.XXX()` → named export 함수
 *   - localStorage 키 접두사: `mydesktop-tunnel-` → `mes-display-`
 *   - 타입 안전성 추가 (TypeScript)
 */

import type { Shortcut, Category, MenuSettings } from './types';
import { DEFAULT_SHORTCUTS, DEFAULT_CATEGORIES, DEFAULT_MENU_SETTINGS } from './config';

// ---------------------------------------------------------------------------
// localStorage 키 상수
// ---------------------------------------------------------------------------

/** localStorage 키 매핑 — Single Source of Truth */
export const KEYS = {
  SHORTCUTS: 'mes-display-shortcuts',
  SETTINGS: 'mes-display-settings',
  CATEGORIES: 'mes-display-categories',
  ROLLING: 'mes-display-rolling',
  LAST_SECTION: 'mes-display-last-section',
  LOCALE: 'mes-display-locale',
  THEME: 'mes-display-theme',
  HISTORY: 'mes-display-history',
  AUTO_LAUNCH: 'mes-display-auto-launch',
  DELETED_DEFAULTS: 'mes-display-deleted-defaults',
  CARDS_CACHE: 'mes-display-cards-cache',
} as const;

// ---------------------------------------------------------------------------
// Shortcuts
// ---------------------------------------------------------------------------

/**
 * 바로가기 목록 반환.
 * - 일반 카드(layer 1+): cards.json 캐시 우선, 없으면 DEFAULT_SHORTCUTS 폴백
 * - 즐겨찾기(layer 0): localStorage에서 사용자가 등록/해제
 */
export function loadShortcuts(): Shortcut[] {
  const defaults = loadCardsCache() ?? JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS)) as Shortcut[];
  const favorites = loadFavorites();
  return [...favorites, ...defaults];
}

/** cards.json에서 가져온 캐시를 localStorage에서 읽기 */
function loadCardsCache(): Shortcut[] | null {
  try {
    const saved = localStorage.getItem(KEYS.CARDS_CACHE);
    if (saved) return JSON.parse(saved) as Shortcut[];
  } catch { /* ignore */ }
  return null;
}

/**
 * 서버(cards.json)에서 카드+카테고리를 가져와 localStorage에 캐시한다.
 * 메뉴 초기화 시 호출.
 */
export async function syncCardsFromServer(): Promise<{ cards: Shortcut[]; categories: Category[] }> {
  try {
    const res = await fetch('/api/settings/cards');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cards = data.cards as Shortcut[];
    const categories = data.categories as Category[];
    localStorage.setItem(KEYS.CARDS_CACHE, JSON.stringify(cards));
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    return { cards, categories };
  } catch {
    const cards = loadCardsCache() ?? (JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS)) as Shortcut[]);
    return { cards, categories: [] };
  }
}

/**
 * 즐겨찾기 목록만 저장 (layer 0인 항목만 추출하여 localStorage에 저장)
 */
export function saveShortcuts(shortcuts: Shortcut[]): boolean {
  try {
    const favorites = shortcuts.filter((s) => s.layer === 0);
    localStorage.setItem(KEYS.SHORTCUTS, JSON.stringify(favorites));
    return true;
  } catch (e) {
    console.error('Failed to save favorites:', e);
    return false;
  }
}

/** 즐겨찾기 초기화 (빈 배열) */
export function resetShortcuts(): Shortcut[] {
  localStorage.removeItem(KEYS.SHORTCUTS);
  return loadShortcuts();
}

/** localStorage에서 즐겨찾기(layer 0) 항목만 불러오기 */
function loadFavorites(): Shortcut[] {
  try {
    const saved = localStorage.getItem(KEYS.SHORTCUTS);
    if (saved) {
      return (JSON.parse(saved) as Shortcut[]).filter((s) => s.layer === 0);
    }
  } catch { /* ignore */ }
  return [];
}

/** @deprecated 사용하지 않음 */
export function loadDeletedDefaults(): Set<string> { return new Set(); }
/** @deprecated 사용하지 않음 */
export function addDeletedDefault(_id: string): void { /* noop */ }
/** @deprecated 사용하지 않음 */
export function resetDeletedDefaults(): void { /* noop */ }

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** 기본 설정 값 — config.ts에서 통합 관리 */
const DEFAULT_SETTINGS = DEFAULT_MENU_SETTINGS;

/**
 * 설정 불러오기
 * 저장된 설정이 없으면 기본값 반환
 *
 * @returns 설정 객체
 *
 * @example
 * ```ts
 * const settings = loadSettings();
 * console.log(settings.tunnelShape); // 'triangle'
 * ```
 */
export function loadSettings(): MenuSettings {
  try {
    const saved = localStorage.getItem(KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<MenuSettings>;
      // 기본값과 병합 (새 설정 항목 대응)
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
    const seeded = { ...DEFAULT_SETTINGS };
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(seeded));
    return seeded;
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  const fallback = { ...DEFAULT_SETTINGS };
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(fallback));
  } catch { /* ignore */ }
  return fallback;
}

/**
 * 설정 저장
 *
 * @param settings - 저장할 설정 객체
 * @returns 저장 성공 여부
 *
 * @example
 * ```ts
 * const settings = loadSettings();
 * settings.glowTheme = 'purple';
 * saveSettings(settings);
 * ```
 */
export function saveSettings(settings: MenuSettings): boolean {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** @deprecated 사용자 정의 카테고리 제거됨 — config.ts가 단일 소스 */
export function loadCategories(): Category[] {
  return [];
}

/** @deprecated 사용하지 않음 */
export function saveCategories(_categories: Category[]): boolean {
  return true;
}

// ---------------------------------------------------------------------------
// Clear All
// ---------------------------------------------------------------------------

/**
 * 모든 데이터 삭제
 * 주의: 이 함수는 모든 저장된 데이터를 삭제합니다
 *
 * @returns 삭제 성공 여부
 */
export function clearAll(): boolean {
  try {
    localStorage.removeItem(KEYS.SHORTCUTS);
    localStorage.removeItem(KEYS.SETTINGS);
    localStorage.removeItem(KEYS.CATEGORIES);
    return true;
  } catch (e) {
    console.error('Failed to clear storage:', e);
    return false;
  }
}
