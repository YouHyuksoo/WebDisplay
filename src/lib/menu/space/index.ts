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
import { createTunnel, updateTunnelAnimation, pulseRings, getShapeVertices } from './tunnel';
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
});

// ---------------------------------------------------------------------------
// 애니메이션 프레임 관리
// ---------------------------------------------------------------------------

/** requestAnimationFrame ID (stopAnimate에서 취소용) */
let _animFrameId: number | null = null;

/** 마지막 렌더링 시간 (FPS 제어용) */
let _lastRenderTime = 0;

/**
 * 메인 애니메이션 루프
 *
 * requestAnimationFrame으로 매 프레임 호출.
 * state에서 targetSpeed/glowIntensity/spaceType을 읽어 반영하고,
 * 현재 spaceType에 맞는 업데이트 함수를 호출한 뒤 renderer.render() 실행.
 *
 * [최적화] 사용자가 조작하지 않을 때는 프레임워크를 '절전 모드'로 전환하여 CPU/GPU 점유율을 낮춥니다.
 */
export function animate(): void {
  _animFrameId = requestAnimationFrame(animate);

  const now = Date.now();
  const inactiveTime = now - state.lastActivityTime;
  
  // 조작 중인지 여부 (속도가 있거나 글로우가 살아있어도 조작 중으로 간주)
  const isMoving = Math.abs(_i.tunnelSpeed) > 0.01 || Math.abs(state.targetSpeed) > 0.01 || _i.glowIntensity > 0.1;

  // 10초 이상 입력이 없으면 절전 모드 (1초에 약 20프레임으로 제한)
  if (!isMoving && inactiveTime > 10000) {
    if (now - _lastRenderTime < 50) return; // 약 20fps
  }
  
  _lastRenderTime = now;

  // state에서 값 읽기 (외부에서 설정한 값 반영)
  const stateTargetSpeed = state.targetSpeed || 0;
  const stateGlowIntensity = state.glowIntensity || 0;

  // 속도 보간 (더 부드럽게)
  _i.tunnelSpeed += (stateTargetSpeed - _i.tunnelSpeed) * 0.08;

  // 조명 강도 감쇠
  _i.glowIntensity = Math.max(
    _i.glowIntensity * 0.95,
    stateGlowIntensity * 0.95,
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
  // warp
  createCosmicWarp,
  updateCosmicWarp,
  // aurora
  createAurora,
  updateAuroraAnimation,
  createGlowTexture,
};
