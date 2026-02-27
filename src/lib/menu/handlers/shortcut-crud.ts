/**
 * @file src/lib/menu/handlers/shortcut-crud.ts
 * @description 바로가기 CRUD (생성, 수정, 삭제)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 바로가기 생성, 수정, 삭제 핸들러
 * 2. **사용 방법**: `import { saveShortcut, deleteShortcut } from './shortcut-crud'`
 * 3. **의존성**: state, ui, storage, cards (lazy)
 *
 * 원본: mydesktop/js/handlers/shortcut-crud.js (App.Handlers)
 * 변경점: `App.Handlers.xxx` -> named export
 */

import { state } from '../state';
import { showToast, showConfirm, closeModal, saveShortcuts } from '../ui';

/**
 * 바로가기 저장
 */
export function saveShortcut(): void {
  const title = (document.getElementById('shortcut-title') as HTMLInputElement)?.value.trim();
  const url = (document.getElementById('shortcut-url') as HTMLInputElement)?.value.trim();
  const layer = parseInt((document.getElementById('shortcut-layer') as HTMLSelectElement)?.value);
  const icon = (document.getElementById('shortcut-icon') as HTMLInputElement)?.value.trim();

  if (!title || !url) {
    showToast('제목과 URL을 입력해주세요');
    return;
  }

  if (state.editingId) {
    // 수정
    const idx = state.shortcuts.findIndex((x) => x.id === state.editingId);
    if (idx >= 0) {
      state.shortcuts[idx] = {
        ...state.shortcuts[idx],
        title,
        url,
        layer,
        icon,
        color: state.selectedColor,
      };
    }
  } else {
    // 새로 추가
    state.shortcuts.push({
      id: Date.now().toString(),
      title,
      url,
      layer,
      icon,
      color: state.selectedColor,
    });
  }

  saveShortcuts();

  // Cards 재렌더링 (lazy import로 순환 참조 방지)
  import('../cards').then((Cards) => {
    Cards.renderCards();
  });

  closeModal();
  showToast(state.editingId ? '수정 완료!' : '추가 완료!');
}

/**
 * 바로가기 삭제
 * @param id - 삭제할 바로가기 ID
 */
export async function deleteShortcut(id: string): Promise<void> {
  const confirmed = await showConfirm('삭제할까요?', { title: '바로가기 삭제', danger: true });
  if (confirmed) {
    state.shortcuts = state.shortcuts.filter((x) => x.id !== id);
    saveShortcuts();

    import('../cards').then((Cards) => {
      Cards.renderCards();
    });

    closeModal();
    showToast('삭제 완료!');
  }
}
