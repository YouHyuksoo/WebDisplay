/**
 * @file src/lib/menu/handlers/index.ts
 * @description 이벤트 핸들러 통합 진입점 - 모든 입력 이벤트 초기화 및 정리
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 모든 핸들러 모듈을 통합하여 이벤트 리스너 설정/해제를 관리합니다.
 * 2. **사용 방법**:
 *    ```ts
 *    import { initEventListeners, cleanup } from './handlers';
 *    // React useEffect에서:
 *    useEffect(() => { initEventListeners(); return cleanup; }, []);
 *    ```
 * 3. **모듈 구성**:
 *    - tracker.ts          : 이벤트 추적 및 정리 (addTracked, cleanup)
 *    - wheel.ts            : 마우스 휠 이벤트 (섹션/레인 전환)
 *    - touch.ts            : 터치/드래그/스와이프 이벤트
 *    - keyboard.ts         : 키보드 단축키 (방향키, Escape)
 *    - click.ts            : 클릭 이펙트, UI 버튼 토글, 설정 메뉴
 *    - shortcut-crud.ts    : 바로가기 CRUD
 *    - settings-handler.ts : 설정 변경
 *    - data-io.ts          : 데이터 내보내기/가져오기
 *    - grid-scroll.ts      : 그리드 스크롤
 *
 * 원본: mydesktop/js/handlers/index.js (App.Events.initEventListeners)
 * 변경점: 868줄 단일 파일 → 기능별 6개 모듈로 분리
 */

import { state } from '../state';
import { COLORS } from '../config';
import { addTracked, cleanup } from './tracker';
import { setupWheelHandlers } from './wheel';
import { setupTouchHandlers } from './touch';
import { setupKeyboardHandlers } from './keyboard';
import { setupClickHandlers } from './click';
import { setupUtilityButtonHandlers, setupInitialUIState } from './ui-buttons';

// Re-export: 다른 모듈에서 handlers/index를 통해 접근하는 기존 API 유지
export { cleanup } from './tracker';
export { saveShortcut, deleteShortcut } from './shortcut-crud';
export { changeSpaceType, changeTunnelShape, changeCardStyle, toggleIconColor } from './settings-handler';
export { exportData, importData } from './data-io';
export { initGridScrollControls, updateGridScrollButtons } from './grid-scroll';

// ---------------------------------------------------------------------------
// Color Picker
// ---------------------------------------------------------------------------

/**
 * 컬러 피커 초기화
 * 색상 옵션을 DOM에 생성하고 선택 이벤트를 바인딩
 */
export function initColorPicker(): void {
  const picker = document.getElementById('color-picker');
  if (!picker) return;

  COLORS.forEach((color) => {
    const opt = document.createElement('div');
    opt.className = 'color-option' + (color === state.selectedColor ? ' selected' : '');
    opt.style.background = color;
    opt.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach((el) => el.classList.remove('selected'));
      opt.classList.add('selected');
      state.selectedColor = color;
    });
    picker.appendChild(opt);
  });
}

// ---------------------------------------------------------------------------
// Main init
// ---------------------------------------------------------------------------

/**
 * 모든 이벤트 리스너 초기화
 * 각 핸들러 모듈의 setup 함수를 호출하고 리사이즈 이벤트를 등록
 */
export function initEventListeners(): void {
  // 휠 이벤트 (섹션/레인 전환)
  setupWheelHandlers();

  // 리사이즈 이벤트 (throttle 100ms — 모바일 리사이즈 폭주 방지)
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  const resizeHandler = () => {
    if (resizeTimer) return;
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      if (state.camera && state.renderer) {
        (state.camera as { aspect: number; updateProjectionMatrix: () => void }).aspect =
          window.innerWidth / window.innerHeight;
        (state.camera as { updateProjectionMatrix: () => void }).updateProjectionMatrix();
        (state.renderer as { setSize: (w: number, h: number) => void }).setSize(
          window.innerWidth, window.innerHeight,
        );
      }
    }, 100);
  };
  addTracked(window, 'resize', resizeHandler);

  // 터치 이벤트 (모바일 스와이프)
  setupTouchHandlers();

  // 키보드 단축키
  setupKeyboardHandlers();

  // 클릭 관련 이벤트 (모달, 컨텍스트 메뉴, 설정 메뉴 등)
  setupClickHandlers();

  // UI 유틸리티 버튼 (이스터에그, 테마, 종료, 밝기, 다국어 등)
  setupUtilityButtonHandlers();

  // UI 초기 상태 설정 (아이콘, 레이블 등)
  setupInitialUIState();
}
