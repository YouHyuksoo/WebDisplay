/**
 * @file src/lib/menu/handlers/touch.ts
 * @description 터치/드래그/스와이프 이벤트 핸들러
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 모바일 및 터치스크린에서 스와이프 제스처로
 *    섹션 전환, 캐러셀 이동 등을 처리합니다.
 * 2. **터치 이벤트 흐름**:
 *    - touchstart: 터치 시작 위치 기록
 *    - touchmove: 드래그 중 3D 속도/글로우 업데이트
 *    - touchend: 스와이프 방향과 속도를 계산하여 전환 실행
 * 3. **레이아웃별 동작**:
 *    - carousel 모바일: 상하 스와이프로 카드 전환, 좌우 스와이프로 섹션 전환
 *    - carousel 데스크탑: 좌우 스와이프로 카드 전환
 *    - grid: 상하 스와이프로 섹션 전환
 *
 * 원본: handlers/index.ts initEventListeners() 중 터치 이벤트 부분에서 분리
 */

import { state } from '../state';
import { addTracked } from './tracker';

/**
 * 터치 이벤트 리스너 등록
 * touchstart → touchmove → touchend 플로우 처리
 */
export function setupTouchHandlers(): void {
  let touchStartY = 0;
  let touchStartX = 0;
  let touchStartTime = 0;
  let touchOnCard = false;

  const touchStartHandler = (e: TouchEvent) => {
    state.lastActivityTime = Date.now();
    const target = e.target as HTMLElement;
    if (target.closest('.floating-btn') ||
        target.closest('#settings-menu') ||
        target.closest('#tunnel-submenu') ||
        target.closest('.modal-overlay') ||
        target.closest('.carousel-dots')) return;

    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    touchOnCard = !!target.closest('.shortcut-card');
  };
  addTracked(document, 'touchstart', touchStartHandler as EventListener, { passive: true });

  const touchMoveHandler = (e: TouchEvent) => {
    if (touchStartY === 0 || touchOnCard) return;
    const deltaY = touchStartY - e.touches[0].clientY;
    state.targetSpeed = deltaY * 0.1;
    state.glowIntensity = Math.min(1, state.glowIntensity + Math.abs(deltaY) * 0.002);
  };
  addTracked(document, 'touchmove', touchMoveHandler as EventListener, { passive: true });

  const touchEndHandler = (e: TouchEvent) => {
    if (touchStartY === 0) return;

    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;
    const deltaTime = Date.now() - touchStartTime;
    const isMobile = window.innerWidth <= 768;

    if (state.cardLayout === 'carousel' && isMobile) {
      if (touchOnCard && Math.abs(deltaY) > 50) {
        import('../carousel').then((C) => {
          if (deltaY > 0) C.carouselNext(); else C.carouselPrev();
        });
      } else if (!touchOnCard && Math.abs(deltaY) > 50) {
        const velocity = Math.abs(deltaY) / deltaTime;
        if (velocity > 0.3 || Math.abs(deltaY) > 100) {
          import('../sections').then((S) => {
            if (deltaY > 0) S.goToSection(state.currentSection + 1);
            else S.goToSection(state.currentSection - 1);
          });
        }
      }
    } else if (state.cardLayout === 'carousel' && !isMobile) {
      if (Math.abs(deltaX) > 50) {
        import('../carousel').then((C) => {
          if (deltaX > 0) C.carouselNext(); else C.carouselPrev();
        });
      }
    } else if (state.cardLayout === 'grid') {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
        const velocity = Math.abs(deltaY) / deltaTime;
        if (velocity > 0.3 || Math.abs(deltaY) > 100) {
          import('../sections').then((S) => {
            if (deltaY > 0) S.goToSection(state.currentSection + 1);
            else S.goToSection(state.currentSection - 1);
          });
        }
      }
    }

    touchStartY = 0;
    touchStartX = 0;
    touchOnCard = false;
    state.targetSpeed = 0;
  };
  addTracked(document, 'touchend', touchEndHandler as EventListener, { passive: true });
}
