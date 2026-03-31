/**
 * @file src/lib/menu/handlers/wheel.ts
 * @description 마우스 휠 이벤트 핸들러 - 섹션 전환 및 레인 전환
 *
 * 초보자 가이드:
 * 1. 휠 한 번 = 섹션 전환 한 번 (누적 없음, 단순 쿨다운 방식)
 * 2. Shift+휠: 레인(좌우 패널) 전환
 * 3. 전환 중에는 모든 휠 입력 무시
 * 4. 3D 터널 효과(속도/글로우)는 전환과 무관하게 항상 반응
 */

import { state } from '../state';
import { addTracked } from './tracker';

/** 전환 후 다음 전환까지 최소 대기 (ms) */
const COOLDOWN = 1200;

export function setupWheelHandlers(): void {
  /** 마지막 전환 시각 */
  let lastTriggerTime = 0;
  /** 3D 효과 복귀용 타이머 */
  let effectTimeout: ReturnType<typeof setTimeout>;

  /** 레인 전환용 */
  let laneWheelAcc = 0;
  let laneTimeout: ReturnType<typeof setTimeout>;
  const LANE_THRESHOLD = 100;

  const wheelHandler = (e: WheelEvent) => {
    state.lastActivityTime = Date.now();
    const now = Date.now();

    // ── Shift+휠: 레인 전환 ──
    if (e.shiftKey) {
      if (!state.isLaneTransitioning) {
        laneWheelAcc += e.deltaY * 0.8;
        if (laneWheelAcc > LANE_THRESHOLD) {
          import('../lanes').then((L) => L.goToLane(state.currentLane + 1));
          laneWheelAcc = 0;
        } else if (laneWheelAcc < -LANE_THRESHOLD) {
          import('../lanes').then((L) => L.goToLane(state.currentLane - 1));
          laneWheelAcc = 0;
        }
      }
      clearTimeout(laneTimeout);
      laneTimeout = setTimeout(() => { laneWheelAcc = 0; }, 150);
      return;
    }

    if (state.currentLane !== 0) return;

    // ── 3D 효과: 항상 반응 ──
    const speedMul = Math.min(Math.abs(e.deltaY) / 50, 1.5);
    state.targetSpeed = (e.deltaY > 0 ? 10 : -10) * speedMul;
    state.glowIntensity = Math.min(1, state.glowIntensity + Math.abs(e.deltaY) * 0.008);

    clearTimeout(effectTimeout);
    effectTimeout = setTimeout(() => { state.targetSpeed = 0; }, 150);

    // ── 전환 중이거나 쿨다운 중이면 무시 ──
    if (state.isTransitioning || (now - lastTriggerTime) < COOLDOWN) {
      return;
    }

    // ── 방향 판별: deltaY 부호만으로 즉시 전환 ──
    if (Math.abs(e.deltaY) < 10) return; // 미세 움직임 무시

    lastTriggerTime = now;
    const direction = e.deltaY > 0 ? 1 : -1;

    import('../sections').then((Sections) => {
      Sections.goToSection(state.currentSection + direction);
    });
  };

  addTracked(window, 'wheel', wheelHandler as EventListener, { passive: true });
}
