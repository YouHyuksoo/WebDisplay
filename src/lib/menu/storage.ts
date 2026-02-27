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
import { DEFAULT_SHORTCUTS, DEFAULT_CATEGORIES } from './config';

// ---------------------------------------------------------------------------
// localStorage 키 상수
// ---------------------------------------------------------------------------

/** localStorage 키 매핑 */
export const KEYS = {
  SHORTCUTS: 'mes-display-shortcuts',
  SETTINGS: 'mes-display-settings',
  CATEGORIES: 'mes-display-categories',
} as const;

// ---------------------------------------------------------------------------
// Shortcuts
// ---------------------------------------------------------------------------

/**
 * 바로가기 목록 불러오기
 * localStorage에 저장된 바로가기가 없으면 기본값 반환
 *
 * @returns 바로가기 배열
 *
 * @example
 * ```ts
 * const shortcuts = loadShortcuts();
 * console.log(shortcuts[0].title); // 'ASSY 생산 현황'
 * ```
 */
export function loadShortcuts(): Shortcut[] {
  try {
    const saved = localStorage.getItem(KEYS.SHORTCUTS);
    if (saved) {
      return JSON.parse(saved) as Shortcut[];
    }
  } catch (e) {
    console.error('Failed to load shortcuts:', e);
  }
  // 기본값 반환 (깊은 복사)
  return JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS)) as Shortcut[];
}

/**
 * 바로가기 목록 저장
 *
 * @param shortcuts - 저장할 바로가기 배열
 * @returns 저장 성공 여부
 *
 * @example
 * ```ts
 * const shortcuts = loadShortcuts();
 * shortcuts.push({ id: 'menu-99', title: 'New', url: '/display/99', color: '#fff', icon: '', layer: 0 });
 * saveShortcuts(shortcuts);
 * ```
 */
export function saveShortcuts(shortcuts: Shortcut[]): boolean {
  try {
    localStorage.setItem(KEYS.SHORTCUTS, JSON.stringify(shortcuts));
    return true;
  } catch (e) {
    console.error('Failed to save shortcuts:', e);
    return false;
  }
}

/**
 * 바로가기 초기화 (기본값으로 복원)
 *
 * @returns 초기화된 바로가기 배열
 *
 * @example
 * ```ts
 * const shortcuts = resetShortcuts();
 * ```
 */
export function resetShortcuts(): Shortcut[] {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS)) as Shortcut[];
  saveShortcuts(defaults);
  return defaults;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** 기본 설정 값 */
const DEFAULT_SETTINGS: MenuSettings = {
  tunnelShape: 'triangle',
  glowTheme: 'gold',
  iconColorMode: 'brand',
  cardStyle: 'glass',
  spaceType: 'tunnel',
  cardLayout: 'grid',
};

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
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
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

/**
 * 사용자 정의 카테고리 불러오기
 * localStorage에 저장된 카테고리가 없으면 빈 배열 반환
 *
 * @returns 사용자 정의 카테고리 배열
 */
export function loadCategories(): Category[] {
  try {
    const saved = localStorage.getItem(KEYS.CATEGORIES);
    if (saved) {
      return JSON.parse(saved) as Category[];
    }
  } catch (e) {
    console.error('Failed to load categories:', e);
  }
  return [];
}

/**
 * 사용자 정의 카테고리 저장
 *
 * @param categories - 저장할 카테고리 배열
 * @returns 저장 성공 여부
 */
export function saveCategories(categories: Category[]): boolean {
  try {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    return true;
  } catch (e) {
    console.error('Failed to save categories:', e);
    return false;
  }
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
