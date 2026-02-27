/**
 * @file src/lib/menu/ui-stub.ts
 * @description UI 모듈의 임시 대체 함수 (ui.ts가 포팅되기 전까지 사용)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 아직 포팅되지 않은 App.UI / App.showToast 등의 placeholder
 * 2. **사용 방법**: `import { showToast, applyGlowTheme } from './ui-stub'` 로 가져와 사용
 * 3. **교체 시기**: ui.ts가 포팅되면 이 파일은 삭제하고 import 경로를 ui.ts로 변경
 *
 * 원본: mydesktop/js/ui.js (App.UI, App.showToast, App.showConfirm 등)
 * 변경점: 콘솔 로그로 대체하여 런타임 에러 방지
 */

// ---------------------------------------------------------------------------
// Toast / Confirm
// ---------------------------------------------------------------------------

/**
 * 토스트 메시지 표시 (placeholder)
 * @param msg - 표시할 메시지
 */
export function showToast(msg: string): void {
  console.log('[Toast]', msg);
}

/**
 * 확인 다이얼로그 표시 (placeholder)
 * @param msg - 확인 메시지
 * @param _options - 옵션 (무시됨)
 * @returns 항상 true 반환
 */
export function showConfirm(
  msg: string,
  _options?: { title?: string; danger?: boolean },
): Promise<boolean> {
  console.log('[Confirm]', msg);
  return Promise.resolve(true);
}

// ---------------------------------------------------------------------------
// UI 함수 (placeholder)
// ---------------------------------------------------------------------------

/**
 * 글로우 테마 적용 (placeholder)
 * @param _theme - 테마 이름 (무시됨)
 */
export function applyGlowTheme(_theme: string): void {
  console.log('[UI] applyGlowTheme:', _theme);
}

/**
 * 설정 메뉴 토글 (placeholder)
 */
export function toggleSettingsMenu(): void {
  console.log('[UI] toggleSettingsMenu');
}

/**
 * 모달 열기 (placeholder)
 * @param _id - 편집할 바로가기 ID (무시됨)
 */
export function openModal(_id: string): void {
  console.log('[UI] openModal:', _id);
}

/**
 * 컨텍스트 메뉴 표시 (placeholder)
 * @param _e - 마우스 이벤트 (무시됨)
 * @param _id - 바로가기 ID (무시됨)
 */
export function showContextMenu(_e: MouseEvent, _id: string): void {
  console.log('[UI] showContextMenu:', _id);
}

/**
 * 설정 저장 (placeholder)
 * storage 모듈의 saveSettings를 호출해야 하지만, 아직 연결되지 않음
 */
export function saveSettings(): void {
  console.log('[UI] saveSettings');
}

/**
 * 바로가기 저장 (placeholder)
 * storage 모듈의 saveShortcuts를 호출해야 하지만, 아직 연결되지 않음
 */
export function saveShortcuts(): void {
  console.log('[UI] saveShortcuts');
}
