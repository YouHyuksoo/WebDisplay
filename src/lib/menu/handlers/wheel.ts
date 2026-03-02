/**
 * @file src/lib/menu/handlers/wheel.ts
 * @description 마우스 휠 이벤트 핸들러 - 섹션 전환 및 레인 전환
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 마우스 휠을 굴리면 메뉴 섹션이 전환됩니다.
 *    Shift+휠은 레인(좌우 패널) 전환에 사용됩니다.
 * 2. **임계값(Threshold)**: 휠 움직임이 일정량 누적되어야 전환이 실행됩니다.
 *    이렇게 하면 살짝 굴렸을 때 과도하게 전환되는 것을 방지합니다.
 * 3. **감쇠(Decay)**: 휠을 멈추면 누적값이 점차 줄어들어 자연스러운 느낌을 줍니다.
 *
 * 원본: handlers/index.ts initEventListeners() 중 휠 이벤트 부분에서 분리
 */

import { state } from '../state';
import { addTracked } from './tracker';

/**
 * 휠 이벤트 리스너 등록
 * - 기본 휠: 섹션(상하) 전환 + 3D 속도/글로우 연동
 * - Shift+휠: 레인(좌우 패널) 전환
 */
export function setupWheelHandlers(): void {
  let wheelAccumulator = 0;
  let wheelTimeout: ReturnType<typeof setTimeout>;
  let lastWheelTime = 0;
  const WHEEL_THRESHOLD = 150;
  const WHEEL_DECAY = 0.92;

  /** 휠 누적값을 점차 감쇠시키는 애니메이션 */
  function decayWheelAccumulator(): void {
    if (Math.abs(wheelAccumulator) > 1) {
      wheelAccumulator *= WHEEL_DECAY;
      requestAnimationFrame(decayWheelAccumulator);
    } else {
      wheelAccumulator = 0;
    }
  }

  let laneWheelAccumulator = 0;
  const LANE_WHEEL_THRESHOLD = 100;

  const wheelHandler = (e: WheelEvent) => {
    state.lastActivityTime = Date.now();
    const now = Date.now();
    const timeDelta = now - lastWheelTime;
    lastWheelTime = now;

    // Shift+휠: 레인 전환
    if (e.shiftKey) {
      if (!state.isLaneTransitioning) {
        laneWheelAccumulator += e.deltaY * 0.8;

        if (laneWheelAccumulator > LANE_WHEEL_THRESHOLD) {
          import('../lanes').then((Lanes) => Lanes.goToLane(state.currentLane + 1));
          laneWheelAccumulator = 0;
        } else if (laneWheelAccumulator < -LANE_WHEEL_THRESHOLD) {
          import('../lanes').then((Lanes) => Lanes.goToLane(state.currentLane - 1));
          laneWheelAccumulator = 0;
        }
      }

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => { laneWheelAccumulator = 0; }, 150);
      return;
    }

    if (state.currentLane !== 0) return;

    const speedMultiplier = Math.min(Math.abs(e.deltaY) / 50, 1);
    state.targetSpeed = (e.deltaY > 0 ? 8 : -8) * speedMultiplier;
    state.glowIntensity = Math.min(1, state.glowIntensity + Math.abs(e.deltaY) * 0.005);

    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      state.targetSpeed = 0;
      decayWheelAccumulator();
    }, 150);

    if (!state.isTransitioning) {
      if (timeDelta < 200) {
        wheelAccumulator += e.deltaY * 0.5;
      } else {
        wheelAccumulator = e.deltaY * 0.8;
      }

      if (wheelAccumulator > WHEEL_THRESHOLD) {
        import('../sections').then((Sections) => Sections.goToSection(state.currentSection + 1));
        wheelAccumulator = 0;
      } else if (wheelAccumulator < -WHEEL_THRESHOLD) {
        import('../sections').then((Sections) => Sections.goToSection(state.currentSection - 1));
        wheelAccumulator = 0;
      }
    }
  };
  addTracked(window, 'wheel', wheelHandler as EventListener, { passive: true });
}
