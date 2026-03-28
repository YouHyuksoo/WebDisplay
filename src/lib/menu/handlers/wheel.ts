/**
 * @file src/lib/menu/handlers/wheel.ts
 * @description 마우스 휠 이벤트 핸들러 - 섹션 전환 및 레인 전환
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 마우스 휠을 굴리면 메뉴 섹션이 전환됩니다.
 *    Shift+휠은 레인(좌우 패널) 전환에 사용됩니다.
 * 2. **즉시 잠금**: 휠 임계치 도달 시 로컬 sectionLocked=true로 즉시 잠금하여
 *    import() 비동기 지연 중 중복 goToSection 호출을 차단합니다.
 *    goToSection 실행 완료 후 .then()에서 반드시 해제 → 데드락 불가.
 * 3. **주도권 이양**: 전환이 시작되면 goToSection이 터널 속도/글로우/카드를
 *    일괄 제어합니다. 전환 완료 + 쿨다운 해제까지 휠은 간섭하지 않습니다.
 *
 * 원본: handlers/index.ts initEventListeners() 중 휠 이벤트 부분에서 분리
 */

import { state } from '../state';
import { addTracked } from './tracker';

/** 전환 간 최소 간격 (ms) — 전환 애니메이션(700ms) + 쿨다운(500ms) */
const MIN_TRANSITION_GAP = 1200;

/**
 * 휠 이벤트 리스너 등록
 * - 기본 휠: 섹션(상하) 전환 + 3D 속도/글로우 연동
 * - Shift+휠: 레인(좌우 패널) 전환
 */
export function setupWheelHandlers(): void {
  let wheelAccumulator = 0;
  let wheelTimeout: ReturnType<typeof setTimeout>;
  let lastWheelTime = 0;
  let decayRafId: number | null = null;
  const WHEEL_THRESHOLD = 150;
  const WHEEL_DECAY = 0.92;

  /** 마지막 전환을 트리거한 시각 (디바운스 기준) */
  let lastTriggerTime = 0;

  /** import() 비동기 지연 중 중복 방지 잠금 (.then에서 반드시 해제) */
  let sectionLocked = false;

  /** 휠 누적값을 점차 감쇠시키는 애니메이션 */
  function decayWheelAccumulator(): void {
    if (Math.abs(wheelAccumulator) > 1) {
      wheelAccumulator *= WHEEL_DECAY;
      decayRafId = requestAnimationFrame(decayWheelAccumulator);
    } else {
      wheelAccumulator = 0;
      decayRafId = null;
    }
  }

  /** 감쇠 루프 시작 (중복 방지) */
  function startDecay(): void {
    if (decayRafId !== null) cancelAnimationFrame(decayRafId);
    decayRafId = requestAnimationFrame(decayWheelAccumulator);
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

    // ── 전환 중(goToSection 제어 중): 휠 전체 무시 ──
    if (state.isTransitioning || sectionLocked) {
      wheelAccumulator = 0;
      return;
    }

    // ── 3D 효과: 전환만 아니면 항상 반응 (쿨다운 중에도) ──
    const speedMultiplier = Math.min(Math.abs(e.deltaY) / 50, 1);
    state.targetSpeed = (e.deltaY > 0 ? 8 : -8) * speedMultiplier;
    state.glowIntensity = Math.min(1, state.glowIntensity + Math.abs(e.deltaY) * 0.005);

    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
      state.targetSpeed = 0;
      startDecay();
    }, 150);

    // ── 쿨다운 중: 3D 효과는 위에서 적용됨, 섹션 전환만 차단 ──
    if ((now - lastTriggerTime) < MIN_TRANSITION_GAP) {
      wheelAccumulator = 0;
      return;
    }

    // ── 섹션 전환 누적 ──
    if (timeDelta < 200) {
      wheelAccumulator += e.deltaY * 0.5;
    } else {
      wheelAccumulator = e.deltaY * 0.8;
    }

    if (wheelAccumulator > WHEEL_THRESHOLD) {
      // 즉시 잠금 → import 완료 후 해제
      sectionLocked = true;
      lastTriggerTime = now;
      wheelAccumulator = 0;
      import('../sections').then((Sections) => {
        Sections.goToSection(state.currentSection + 1);
        sectionLocked = false;
      }).catch(() => { sectionLocked = false; });
    } else if (wheelAccumulator < -WHEEL_THRESHOLD) {
      sectionLocked = true;
      lastTriggerTime = now;
      wheelAccumulator = 0;
      import('../sections').then((Sections) => {
        Sections.goToSection(state.currentSection - 1);
        sectionLocked = false;
      }).catch(() => { sectionLocked = false; });
    }
  };
  addTracked(window, 'wheel', wheelHandler as EventListener, { passive: true });
}
