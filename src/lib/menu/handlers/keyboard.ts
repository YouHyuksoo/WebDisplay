/**
 * @file src/lib/menu/handlers/keyboard.ts
 * @description 키보드 단축키 이벤트 핸들러
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 키보드 방향키와 Escape로 메뉴를 탐색합니다.
 * 2. **단축키 목록**:
 *    - 방향키 ←→: 캐러셀 이전/다음 또는 레인 전환
 *    - 방향키 ↑↓: 섹션 이전/다음
 *    - Escape: 레인 복귀 또는 모달/메뉴 닫기
 * 3. **레이아웃별 동작**: carousel 모드와 grid 모드에서 방향키 동작이 다릅니다.
 * 4. **INPUT 필드 무시**: 입력 필드에 포커스가 있을 때는 키보드 핸들러가 작동하지 않습니다.
 *
 * 원본: handlers/index.ts initEventListeners() 중 키보드 이벤트 부분에서 분리
 */

import { state } from '../state';
import {
  closeModal,
  hideContextMenu,
  hideSettingsMenu,
} from '../ui';
import { addTracked } from './tracker';

/**
 * 키보드 이벤트 리스너 등록
 * 방향키(섹션/레인/캐러셀 전환) + Escape(닫기)
 */
export function setupKeyboardHandlers(): void {
  const keydownHandler = (e: KeyboardEvent) => {
    state.lastActivityTime = Date.now();
    if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return;

    if (state.cardLayout === 'carousel' && state.currentLane === 0) {
      if (e.key === 'ArrowLeft') import('../carousel').then((C) => C.carouselPrev());
      if (e.key === 'ArrowRight') import('../carousel').then((C) => C.carouselNext());
      if (e.key === 'ArrowUp') import('../sections').then((S) => S.goToSection(state.currentSection - 1));
      if (e.key === 'ArrowDown') import('../sections').then((S) => S.goToSection(state.currentSection + 1));
    } else if (state.cardLayout === 'grid') {
      if (state.currentLane === 0) {
        if (e.key === 'ArrowLeft') import('../lanes').then((L) => L.goToLane(-1));
        if (e.key === 'ArrowRight') import('../lanes').then((L) => L.goToLane(1));
        if (e.key === 'ArrowUp') import('../sections').then((S) => S.goToSection(state.currentSection - 1));
        if (e.key === 'ArrowDown') import('../sections').then((S) => S.goToSection(state.currentSection + 1));
      } else {
        if (e.key === 'ArrowLeft' && state.currentLane === 1) import('../lanes').then((L) => L.goToLane(0));
        if (e.key === 'ArrowRight' && state.currentLane === -1) import('../lanes').then((L) => L.goToLane(0));
      }
    }

    if (e.key === 'Escape') {
      if (state.currentLane !== 0) {
        import('../lanes').then((L) => L.goToLane(0));
        return;
      }
      closeModal();
      hideContextMenu();
      hideSettingsMenu();
    }
  };
  addTracked(document, 'keydown', keydownHandler as EventListener);
}
