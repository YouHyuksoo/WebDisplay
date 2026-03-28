/**
 * @file src/lib/menu/space/index.ts
 * @description Three.js 공간 효과 - 통합 모듈 (애니메이션 루프, init/dispose)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: Three.js를 사용해 배경에 3D 터널/워프/오로라 효과 렌더링
 * 2. **사용 방법**:
 *    ```ts
 *    import { init, animate, stopAnimate, dispose } from '@/lib/menu/space';
 *    // React useEffect 내에서:
 *    init();
 *    animate();
 *    return () => { stopAnimate(); dispose(); };
 *    ```
 * 3. **공간 타입**:
 *    - tunnel: 클래식 삼각형/원형 등 다양한 모양의 터널
 *    - warp: 스타워즈 스타일 코스믹 워프 효과
 *    - aurora: 몽환적인 오로라 빛 효과
 * 4. **의존성**: Three.js, GSAP 라이브러리 필요
 *
 * 모듈 구조:
 * - core.ts: 초기화, 공유 변수, 기본 함수
 * - tunnel.ts: 클래식 터널 효과
 * - warp.ts: 코스믹 워프 효과
 * - aurora.ts: 오로라 효과
 * - index.ts (이 파일): 애니메이션 루프 및 통합 진입점
 *
 * 원본: mydesktop/js/space/index.js (App.Space.animate)
 * 변경점:
 *   - requestAnimationFrame ID를 추적하여 stopAnimate() 지원
 *   - dispose() 함수 추가 (Three.js 리소스 정리)
 *   - 모든 서브 모듈을 re-export
 */

import * as THREE from 'three';
import { state } from '../state';
import {
  _i,
  initCore,
  clearSpace,
  handleResize,
  setSpaceType,
  setShape,
  updateThemeColors,
  setTargetSpeed,
  setGlowIntensity,
  addGlowIntensity,
  registerCreators,
} from './core';
import { createTunnel, updateTunnelAnimation, pulseRings, getShapeVertices, resetParticleCache } from './tunnel';
import { createCosmicWarp, updateCosmicWarp } from './warp';
import {
  createAurora,
  updateAuroraAnimation,
  createGlowTexture,
  disposeSharedTexture,
} from './aurora';

// ---------------------------------------------------------------------------
// 순환 참조 해결을 위한 생성 함수 등록
// ---------------------------------------------------------------------------

// core.ts에서 setSpaceType/setShape이 tunnel/warp/aurora 생성 함수를 호출해야 하므로
// 순환 참조를 방지하기 위해 콜백으로 등록
registerCreators({
  createTunnel,
  createCosmicWarp,
  createAurora,
  onClearSpace: resetParticleCache,
});

// ---------------------------------------------------------------------------
// 애니메이션 프레임 관리
// ---------------------------------------------------------------------------

/** requestAnimationFrame ID (stopAnimate에서 취소용) */
let _animFrameId: number | null = null;

/** 마지막 렌더링 타임스탬프 (rAF timestamp 기반) */
let _lastFrameTime = 0;

/** 목표 프레임 간격 (ms): 활성 시 ~30fps, 절전 시 ~15fps */
const ACTIVE_FRAME_INTERVAL = 1000 / 30;
const IDLE_FRAME_INTERVAL = 1000 / 15;

/**
 * 메인 애니메이션 루프
 *
 * requestAnimationFrame의 timestamp를 사용해 일정한 프레임 간격을 보장.
 * delta time 기반 보간으로 프레임 드롭 시에도 움직임이 일정하게 유지됨.
 *
 * [최적화]
 * - rAF timestamp 기반 프레임 제어 (Date.now() 제거)
 * - 활성 시 30fps, 절전 시 15fps로 GPU 부하 감소
 * - delta time 보간으로 프레임 독립적 애니메이션
 */
export function animate(timestamp = 0): void {
  _animFrameId = requestAnimationFrame(animate);

  // 첫 프레임 초기화
  if (_lastFrameTime === 0) {
    _lastFrameTime = timestamp;
    return;
  }

  const deltaMs = timestamp - _lastFrameTime;
  const inactiveTime = timestamp - state.lastActivityTime;

  // 조작 중인지 여부
  const isMoving = Math.abs(_i.tunnelSpeed) > 0.01 || Math.abs(state.targetSpeed) > 0.01 || _i.glowIntensity > 0.1;

  // 프레임 간격 제어: 활성 시 30fps, 절전(10초 비활동) 시 15fps
  const frameInterval = (!isMoving && inactiveTime > 10000) ? IDLE_FRAME_INTERVAL : ACTIVE_FRAME_INTERVAL;
  if (deltaMs < frameInterval) return;

  // delta factor: 33.3ms(30fps) 기준 1.0, 프레임 드롭 시 비례 증가
  const delta = Math.min(deltaMs / 33.3, 3); // 최대 3배까지 보상 (10fps 이하 방지)
  _lastFrameTime = timestamp;

  // state에서 값 읽기
  const stateTargetSpeed = state.targetSpeed || 0;
  const stateGlowIntensity = state.glowIntensity || 0;

  // 속도 보간 (delta 기반)
  const lerpFactor = 1 - Math.pow(0.92, delta);
  _i.tunnelSpeed += (stateTargetSpeed - _i.tunnelSpeed) * lerpFactor;

  // 조명 강도 감쇠 (delta 기반)
  const decayFactor = Math.pow(0.95, delta);
  _i.glowIntensity = Math.max(
    _i.glowIntensity * decayFactor,
    stateGlowIntensity * decayFactor,
  );
  state.glowIntensity = _i.glowIntensity;

  // state에서 공간 타입 읽기
  const currentSpaceType = state.spaceType || _i.spaceType;

  if (currentSpaceType === 'warp') {
    updateCosmicWarp();
  } else if (currentSpaceType === 'aurora') {
    updateAuroraAnimation();
  } else {
    updateTunnelAnimation();
  }

  if (_i.renderer && _i.scene && _i.camera) {
    _i.renderer.render(_i.scene, _i.camera);
  }
}

/**
 * 애니메이션 루프 정지
 * requestAnimationFrame을 취소하여 렌더링을 중단
 */
export function stopAnimate(): void {
  if (_animFrameId !== null) {
    cancelAnimationFrame(_animFrameId);
    _animFrameId = null;
  }
}

// ---------------------------------------------------------------------------
// 초기화 / 해제
// ---------------------------------------------------------------------------

/**
 * Three.js 공간 효과 초기화
 *
 * Scene/Camera/Renderer를 생성하고, state.spaceType에 따라
 * 초기 공간(tunnel/warp/aurora)을 생성한다.
 */
export function init(): void {
  initCore();

  // 현재 spaceType에 맞는 공간 생성
  const currentSpaceType = state.spaceType || _i.spaceType;
  if (currentSpaceType === 'warp') {
    createCosmicWarp();
  } else if (currentSpaceType === 'aurora') {
    createAurora();
  } else {
    createTunnel();
  }
}

/**
 * Three.js 리소스 정리 (dispose)
 *
 * renderer, scene 내 geometry/material을 해제하고,
 * DOM에서 canvas를 제거한다.
 * React useEffect cleanup 등에서 호출.
 */
export function dispose(): void {
  stopAnimate();

  // scene 내 오브젝트 정리 (geometry + material + texture)
  if (_i.scene) {
    _i.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          // 텍스처 명시 해제
          if ('map' in mat && (mat as THREE.SpriteMaterial).map) {
            (mat as THREE.SpriteMaterial).map!.dispose();
          }
          mat.dispose();
        });
      }
    });
    _i.scene.clear();
    _i.scene = null;
  }

  // 오로라 공유 텍스처 해제
  disposeSharedTexture();

  // renderer 정리
  if (_i.renderer) {
    _i.renderer.dispose();
    // DOM에서 canvas 제거
    const domElement = _i.renderer.domElement;
    if (domElement.parentNode) {
      domElement.parentNode.removeChild(domElement);
    }
    _i.renderer = null;
  }

  _i.camera = null;
  _i.tunnelRings = [];
  _i.starField = null;
  _i.auroraParticles = null;
  _i.auroraMesh = null;
}

// ---------------------------------------------------------------------------
// Re-exports (다른 모듈에서 space/index를 통해 접근할 수 있도록)
// ---------------------------------------------------------------------------

export {
  // core
  _i,
  initCore,
  clearSpace,
  handleResize,
  setSpaceType,
  setShape,
  updateThemeColors,
  setTargetSpeed,
  setGlowIntensity,
  addGlowIntensity,
  // tunnel
  createTunnel,
  updateTunnelAnimation,
  pulseRings,
  getShapeVertices,
  resetParticleCache,
  // warp
  createCosmicWarp,
  updateCosmicWarp,
  // aurora
  createAurora,
  updateAuroraAnimation,
  createGlowTexture,
};
