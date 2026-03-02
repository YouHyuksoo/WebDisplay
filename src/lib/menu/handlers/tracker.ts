/**
 * @file src/lib/menu/handlers/tracker.ts
 * @description 이벤트 핸들러 추적 및 정리 유틸리티
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 이벤트 리스너를 등록할 때 `addTracked()`를 사용하면
 *    나중에 `cleanup()` 한 번으로 모든 리스너를 자동 해제할 수 있습니다.
 * 2. **사용 방법**:
 *    ```ts
 *    import { addTracked, cleanup } from './tracker';
 *    addTracked(window, 'click', handler);
 *    // 정리 시:
 *    cleanup();
 *    ```
 * 3. **왜 필요한가**: React의 useEffect cleanup에서 모든 리스너를 깔끔하게
 *    해제하지 않으면 메모리 누수가 발생합니다.
 *
 * 원본: handlers/index.ts 에서 분리
 */

/** 등록된 이벤트 핸들러 참조 저장소 */
const handlers: Array<{
  target: EventTarget;
  event: string;
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}> = [];

/**
 * 이벤트 리스너를 등록하고 추적 배열에 저장
 * @param target - 이벤트 대상 (window, document, HTMLElement 등)
 * @param event - 이벤트 이름 (click, wheel, keydown 등)
 * @param handler - 이벤트 핸들러 함수
 * @param options - addEventListener 옵션 (passive, capture 등)
 */
export function addTracked(
  target: EventTarget,
  event: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  target.addEventListener(event, handler, options);
  handlers.push({ target, event, handler, options });
}

/**
 * 모든 추적된 이벤트 리스너 해제
 * React useEffect cleanup에서 호출
 */
export function cleanup(): void {
  handlers.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  handlers.length = 0;
}
