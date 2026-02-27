/**
 * @file src/lib/menu/categories.ts
 * @description 카테고리 관리 모듈 - CRUD 및 UI 렌더링
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 기본 카테고리 + 사용자 정의 카테고리를 통합 관리
 * 2. **사용 방법**:
 *    ```ts
 *    import * as Categories from '@/lib/menu/categories';
 *    const all = Categories.getAll();
 *    Categories.add('MY_CAT', '설명', '📁');
 *    ```
 * 3. **데이터 구조**:
 *    - 기본 카테고리: id 0~99 (config.ts의 DEFAULT_CATEGORIES)
 *    - 사용자 정의: id 100+ (localStorage에 저장)
 *
 * 원본: mydesktop/js/categories.js (App.Categories)
 * 변경점:
 *   - `App.Categories.xxx()` -> named export 함수
 *   - `App.Config` -> config.ts import
 *   - `App.Storage` -> storage.ts import
 *   - `App.State` -> state.ts import
 *   - `App.showToast` / `App.showConfirm` -> ui.ts import
 *   - `App.Sections` / `App.Cards` -> lazy import (순환 참조 방지)
 */

import type { Category } from './types';
import { DEFAULT_CATEGORIES, SECTIONS } from './config';
import * as Storage from './storage';
import { state } from './state';
import { showToast, showConfirm, saveShortcuts } from './ui';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** 사용자 정의 카테고리 시작 ID */
export const CUSTOM_ID_START = 100;

// ---------------------------------------------------------------------------
// 내부 상태
// ---------------------------------------------------------------------------

/** 메모리에 캐시된 사용자 정의 카테고리 */
let customCategories: Category[] = [];

// ---------------------------------------------------------------------------
// CRUD 함수
// ---------------------------------------------------------------------------

/**
 * 사용자 정의 카테고리 로드
 * @returns 사용자 정의 카테고리 배열
 */
export function load(): Category[] {
  customCategories = Storage.loadCategories();
  return customCategories;
}

/**
 * 사용자 정의 카테고리 저장
 * @returns 저장 성공 여부
 */
export function save(): boolean {
  return Storage.saveCategories(customCategories);
}

/**
 * 모든 카테고리 반환 (기본 + 사용자 정의)
 * @returns 전체 카테고리 배열
 */
export function getAll(): Category[] {
  const defaults = DEFAULT_CATEGORIES || SECTIONS;
  return [...defaults, ...customCategories];
}

/**
 * 기본 카테고리만 반환
 * @returns 기본 카테고리 배열
 */
export function getDefaults(): Category[] {
  return DEFAULT_CATEGORIES || SECTIONS;
}

/**
 * 사용자 정의 카테고리만 반환
 * @returns 사용자 정의 카테고리 배열
 */
export function getCustom(): Category[] {
  return customCategories;
}

/**
 * ID로 카테고리 찾기
 * @param id - 카테고리 ID
 * @returns 카테고리 객체 또는 null
 */
export function getById(id: number): Category | null {
  return getAll().find((cat) => cat.id === id) || null;
}

/**
 * 새 카테고리 추가
 * @param name - 카테고리 이름
 * @param subtitle - 부제목 (선택)
 * @param icon - 이모지 아이콘 (선택)
 * @returns 추가된 카테고리 객체
 */
export function add(
  name: string,
  subtitle = '',
  icon = '📁',
): Category {
  // 새 ID 생성 (기존 최대값 + 1)
  const maxId =
    customCategories.length > 0
      ? Math.max(...customCategories.map((c) => c.id))
      : CUSTOM_ID_START - 1;

  const newCategory: Category = {
    id: maxId + 1,
    name: name.toUpperCase(),
    subtitle: subtitle || 'Custom category',
    icon: icon,
  };

  customCategories.push(newCategory);
  save();

  return newCategory;
}

/**
 * 카테고리 수정
 * @param id - 수정할 카테고리 ID
 * @param data - 수정할 데이터
 * @returns 수정 성공 여부
 */
export function update(
  id: number,
  data: { name?: string; subtitle?: string; icon?: string },
): boolean {
  // 기본 카테고리는 수정 불가
  if (id < CUSTOM_ID_START) {
    console.warn('Cannot update default categories');
    return false;
  }

  const idx = customCategories.findIndex((c) => c.id === id);
  if (idx === -1) return false;

  if (data.name) customCategories[idx].name = data.name.toUpperCase();
  if (data.subtitle !== undefined) customCategories[idx].subtitle = data.subtitle;
  if (data.icon) customCategories[idx].icon = data.icon;

  save();
  return true;
}

/**
 * 카테고리 삭제
 * @param id - 삭제할 카테고리 ID
 * @returns 삭제 성공 여부
 */
export function remove(id: number): boolean {
  // 기본 카테고리는 삭제 불가
  if (id < CUSTOM_ID_START) {
    console.warn('Cannot delete default categories');
    return false;
  }

  const idx = customCategories.findIndex((c) => c.id === id);
  if (idx === -1) return false;

  customCategories.splice(idx, 1);
  save();

  // 해당 카테고리의 바로가기들을 첫 번째 카테고리로 이동
  if (state.shortcuts) {
    state.shortcuts.forEach((shortcut) => {
      if (shortcut.layer === id) {
        shortcut.layer = 0;
      }
    });
    saveShortcuts();
  }

  return true;
}

// ---------------------------------------------------------------------------
// 카테고리 관리 모달 UI
// ---------------------------------------------------------------------------

/**
 * 카테고리 관리 모달 열기
 */
export function openManager(): void {
  const modal = document.getElementById('category-modal');
  if (!modal) return;

  renderManagerList();
  modal.classList.add('active');
}

/**
 * 카테고리 관리 모달 닫기
 */
export function closeManager(): void {
  const modal = document.getElementById('category-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * 카테고리 관리 목록 렌더링
 */
export function renderManagerList(): void {
  const list = document.getElementById('category-list');
  if (!list) return;

  const categories = getAll();
  list.innerHTML = '';

  categories.forEach((cat) => {
    const item = document.createElement('div');
    item.className = 'category-item';
    item.dataset.id = String(cat.id);

    const isDefault = cat.id < CUSTOM_ID_START;

    item.innerHTML = `
      <span class="category-icon">${cat.icon || '📁'}</span>
      <div class="category-info">
        <div class="category-name">${cat.name}</div>
        <div class="category-subtitle">${cat.subtitle}</div>
      </div>
      ${
        isDefault
          ? '<span class="category-badge">기본</span>'
          : `
          <div class="category-actions">
            <button class="category-edit-btn" title="수정">✏️</button>
            <button class="category-delete-btn" title="삭제">🗑️</button>
          </div>
        `
      }
    `;

    // 수정 버튼 이벤트
    const editBtn = item.querySelector('.category-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditDialog(cat);
      });
    }

    // 삭제 버튼 이벤트
    const deleteBtn = item.querySelector('.category-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await showConfirm(
          `"${cat.name}" 카테고리를 삭제할까요?\n해당 카테고리의 바로가기는 FAVORITES로 이동됩니다.`,
          { title: '카테고리 삭제', danger: true },
        );
        if (confirmed) {
          remove(cat.id);
          renderManagerList();
          refreshUI();
          showToast('카테고리 삭제됨');
        }
      });
    }

    list.appendChild(item);
  });
}

/**
 * 카테고리 편집 다이얼로그 열기
 * @param category - 편집할 카테고리 (null이면 새 카테고리)
 */
export function openEditDialog(category: Category | null = null): void {
  const nameInput = document.getElementById('category-name-input') as HTMLInputElement | null;
  const subtitleInput = document.getElementById('category-subtitle-input') as HTMLInputElement | null;
  const iconInput = document.getElementById('category-icon-input') as HTMLInputElement | null;
  const dialog = document.getElementById('category-edit-dialog') as HTMLElement | null;
  const title = document.getElementById('category-edit-title');

  if (!dialog || !nameInput || !subtitleInput || !iconInput) return;

  if (category) {
    if (title) title.textContent = '카테고리 수정';
    nameInput.value = category.name;
    subtitleInput.value = category.subtitle;
    iconInput.value = category.icon || '📁';
    dialog.dataset.editId = String(category.id);
  } else {
    if (title) title.textContent = '새 카테고리';
    nameInput.value = '';
    subtitleInput.value = '';
    iconInput.value = '📁';
    delete dialog.dataset.editId;
  }

  dialog.classList.add('active');
  nameInput.focus();
}

/**
 * 카테고리 편집 다이얼로그 닫기
 */
export function closeEditDialog(): void {
  const dialog = document.getElementById('category-edit-dialog');
  if (dialog) {
    dialog.classList.remove('active');
  }
}

/**
 * 카테고리 저장 (추가 또는 수정)
 */
export function saveFromDialog(): void {
  const dialog = document.getElementById('category-edit-dialog') as HTMLElement | null;
  const nameInput = document.getElementById('category-name-input') as HTMLInputElement | null;
  const subtitleInput = document.getElementById('category-subtitle-input') as HTMLInputElement | null;
  const iconInput = document.getElementById('category-icon-input') as HTMLInputElement | null;

  if (!dialog || !nameInput || !subtitleInput || !iconInput) return;

  const name = nameInput.value.trim();
  if (!name) {
    showToast('카테고리 이름을 입력해주세요');
    return;
  }

  const editId = dialog.dataset.editId;
  if (editId) {
    // 수정
    update(parseInt(editId, 10), {
      name: name,
      subtitle: subtitleInput.value.trim(),
      icon: iconInput.value.trim() || '📁',
    });
    showToast('카테고리 수정됨');
  } else {
    // 추가
    add(name, subtitleInput.value.trim(), iconInput.value.trim() || '📁');
    showToast('카테고리 추가됨');
  }

  closeEditDialog();
  renderManagerList();
  refreshUI();
}

/**
 * UI 새로고침 (깊이 인디케이터, 카드, 셀렉트 등)
 *
 * 순환 참조 방지를 위해 Sections/Cards를 동적 import
 */
export function refreshUI(): void {
  // 깊이 인디케이터 재생성 (lazy import로 순환 참조 방지)
  const depthIndicator = document.getElementById('depth-indicator');
  if (depthIndicator) {
    depthIndicator.innerHTML = '';
    // Sections.createDepthIndicator()는 lazy import로 호출
    import('./sections').then((Sections) => {
      Sections.createDepthIndicator();
    });
  }

  // 모달의 카테고리 셀렉트 업데이트
  updateCategorySelect();

  // 카드 재렌더링 (lazy import로 순환 참조 방지)
  import('./cards').then((Cards) => {
    Cards.renderCards();
  });
}

/**
 * 바로가기 모달의 카테고리 셀렉트 옵션 업데이트
 */
export function updateCategorySelect(): void {
  const select = document.getElementById('shortcut-layer') as HTMLSelectElement | null;
  if (!select) return;

  const categories = getAll();
  select.innerHTML = '';

  categories.forEach((cat) => {
    const option = document.createElement('option');
    option.value = String(cat.id);
    option.textContent = `${cat.icon || ''} ${cat.name}`;
    select.appendChild(option);
  });
}
