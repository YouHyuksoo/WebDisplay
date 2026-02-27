/**
 * @file src/lib/menu/space/core.ts
 * @description Three.js 공간 효과 - 코어 모듈 (초기화, 공유 변수, 기본 함수)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: Three.js의 Scene, Camera, Renderer를 초기화하고 관리하는 핵심 모듈
 * 2. **사용 방법**: `import { initCore, clearSpace, ... } from './core'` 로 가져와 사용
 * 3. **공유 변수**: `_i` 객체에 Three.js 객체들과 애니메이션 상태를 저장
 *    - 다른 space 모듈(tunnel, warp, aurora)에서 `_i`를 import해서 사용
 * 4. **의존성**: Three.js (`three` 패키지), state.ts, config.ts
 *
 * 원본: mydesktop/js/space/core.js (App.Space._internal + App.Space 함수들)
 * 변경점:
 *   - `App.Space._internal` → named export `_i`
 *   - `App.Space.xxx` → named export 함수
 *   - `App.Config.GLOW_THEMES` → `import { GLOW_THEMES } from '../config'`
 *   - Three.js를 ES 모듈로 import
 */

import * as THREE from 'three';
import { state } from '../state';
import { GLOW_THEMES } from '../config';

// 순환 참조 방지를 위한 지연 import용 콜백 등록
// index.ts에서 createTunnel/createCosmicWarp/createAurora를 등록
let _createTunnel: (() => void) | null = null;
let _createCosmicWarp: (() => void) | null = null;
let _createAurora: (() => void) | null = null;

/**
 * 순환 참조 방지를 위해 생성 함수를 등록
 * index.ts에서 호출하여 tunnel/warp/aurora 생성 함수를 등록
 *
 * @param creators - 생성 함수 맵
 */
export function registerCreators(creators: {
  createTunnel: () => void;
  createCosmicWarp: () => void;
  createAurora: () => void;
}): void {
  _createTunnel = creators.createTunnel;
  _createCosmicWarp = creators.createCosmicWarp;
  _createAurora = creators.createAurora;
}

// ---------------------------------------------------------------------------
// 공유 내부 상태 (다른 space 모듈에서 import하여 접근)
// ---------------------------------------------------------------------------

/**
 * 내부 공유 변수 (다른 space 모듈에서 접근)
 *
 * Three.js 객체들과 애니메이션 상태를 보관하는 모듈 스코프 객체.
 * tunnel.ts, warp.ts, aurora.ts, index.ts 에서 import하여 사용.
 */
export const _i = {
  // Three.js 객체들
  scene: null as THREE.Scene | null,
  camera: null as THREE.PerspectiveCamera | null,
  renderer: null as THREE.WebGLRenderer | null,

  // 터널 관련
  tunnelRings: [] as THREE.LineLoop[],

  // 코스믹 워프 관련
  starField: null as THREE.Points | null,

  // 오로라 관련
  auroraMesh: null as THREE.Mesh | null,
  auroraParticles: null as THREE.Points | null,
  auroraTime: 0,

  // 애니메이션 상태
  tunnelSpeed: 0,
  targetSpeed: 0,
  glowIntensity: 0,

  // 설정
  spaceType: 'tunnel' as string,
  tunnelShape: 'triangle' as string,
  glowTheme: 'gold' as string,
};

// ---------------------------------------------------------------------------
// Core 함수들
// ---------------------------------------------------------------------------

/**
 * Three.js 초기화
 * scene, camera, renderer 생성 및 DOM에 추가
 */
export function initCore(): void {
  _i.scene = new THREE.Scene();
  _i.scene.fog = new THREE.Fog(0x050508, 100, 1500);

  _i.camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1,
    2000,
  );
  _i.camera.position.z = 0;

  _i.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  _i.renderer.setSize(window.innerWidth, window.innerHeight);
  _i.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const container = document.getElementById('canvas-container');
  if (container) {
    container.appendChild(_i.renderer.domElement);
  }
}

/**
 * 공간 클리어 (터널/워프/오로라 요소 제거)
 * 현재 scene에서 모든 space 관련 오브젝트를 제거
 */
export function clearSpace(): void {
  if (!_i.scene) return;

  // 터널 링 제거
  _i.tunnelRings.forEach(function (ring) {
    _i.scene!.remove(ring);
  });
  _i.tunnelRings = [];

  // 파티클 제거
  _i.scene.children
    .filter(function (c) {
      return c.userData.isParticle;
    })
    .forEach(function (p) {
      _i.scene!.remove(p);
    });

  // 별 필드 제거
  if (_i.starField) {
    _i.scene.remove(_i.starField);
    _i.starField = null;
  }

  // 오로라 파티클 제거 (레거시)
  if (_i.auroraParticles) {
    _i.scene.remove(_i.auroraParticles);
    _i.auroraParticles = null;
  }

  // 오로라 스프라이트들 제거
  _i.scene.children
    .filter(function (c) {
      return (
        c.userData.isAuroraGlow ||
        c.userData.isAuroraSmall ||
        c.userData.isAuroraBackground ||
        c.userData.isAuroraSphere
      );
    })
    .forEach(function (s) {
      _i.scene!.remove(s);
    });

  // 배경 별 제거
  _i.scene.children
    .filter(function (c) {
      return c.userData.isBackgroundStar;
    })
    .forEach(function (s) {
      _i.scene!.remove(s);
    });
}

/**
 * 창 크기 변경 처리
 * camera aspect ratio와 renderer 크기를 윈도우에 맞게 조정
 */
export function handleResize(): void {
  if (!_i.camera || !_i.renderer) return;

  _i.camera.aspect = window.innerWidth / window.innerHeight;
  _i.camera.updateProjectionMatrix();
  _i.renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * 공간 타입 변경
 * @param type - 'tunnel', 'warp', 또는 'aurora'
 */
export function setSpaceType(type: string): void {
  _i.spaceType = type;
  if (type === 'warp') {
    _createCosmicWarp?.();
  } else if (type === 'aurora') {
    _createAurora?.();
  } else {
    _createTunnel?.();
  }
}

/**
 * 터널 모양 변경
 * @param shape - triangle, circle, square, hexagon, star, infinity
 */
export function setShape(shape: string): void {
  _i.tunnelShape = shape;
  if (_i.spaceType === 'tunnel') {
    _createTunnel?.();
  }
}

/**
 * 글로우 테마 변경 시 색상 업데이트
 * 기존 오브젝트들의 material color를 새 테마 색상으로 변경
 *
 * @param theme - 테마 이름 (gold, purple, cyan 등)
 */
export function updateThemeColors(theme: string): void {
  _i.glowTheme = theme;
  const themeColors = GLOW_THEMES[theme];
  if (!themeColors) return;

  const threeColor = new THREE.Color(themeColors.primary);

  // 터널 링 색상
  _i.tunnelRings.forEach(function (ring) {
    (ring.material as THREE.LineBasicMaterial).color = threeColor;
  });

  // 파티클 색상 업데이트
  if (_i.scene) {
    _i.scene.children.forEach(function (child) {
      if (child.userData.isParticle) {
        ((child as THREE.Points).material as THREE.PointsMaterial).color =
          threeColor;
      }
    });
  }

  // 코스믹 워프 별 색상 업데이트
  if (_i.starField) {
    (_i.starField.material as THREE.PointsMaterial).color = threeColor;
  }
}

/**
 * 속도 설정
 * @param speed - 목표 속도
 */
export function setTargetSpeed(speed: number): void {
  _i.targetSpeed = speed;
}

/**
 * 글로우 강도 설정
 * @param intensity - 강도 (0~1.5)
 */
export function setGlowIntensity(intensity: number): void {
  _i.glowIntensity = Math.min(1.5, intensity);
}

/**
 * 글로우 강도 증가
 * @param amount - 증가량
 */
export function addGlowIntensity(amount: number): void {
  _i.glowIntensity = Math.min(1.5, _i.glowIntensity + amount);
}
