/**
 * @file src/lib/menu/space/tunnel.ts
 * @description Three.js 공간 효과 - 클래식 터널 모듈
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 다양한 모양(삼각형, 원, 사각형 등)의 터널 효과를 생성
 * 2. **사용 방법**: `import { createTunnel, updateTunnelAnimation } from './tunnel'`
 * 3. **동작 흐름**:
 *    - `createTunnel()`: 링 지오메트리 + 파티클로 터널 구성
 *    - `updateTunnelAnimation()`: 매 프레임 링과 파티클 이동/밝기 처리
 *    - `pulseRings()`: gsap으로 링에 펄스(반짝임) 효과 적용
 * 4. **의존성**: Three.js, GSAP, core.ts의 `_i` 공유 상태
 *
 * 원본: mydesktop/js/space/tunnel.js (App.Space.createTunnel 등)
 * 변경점:
 *   - `App.Space._internal` → `import { _i } from './core'`
 *   - `App.Config.TUNNEL` → `import { TUNNEL } from '../config'`
 *   - `App.State` → `import { state } from '../state'`
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { state } from '../state';
import { TUNNEL, GLOW_THEMES } from '../config';
import { _i, clearSpace } from './core';

// ---------------------------------------------------------------------------
// 터널 모양 버텍스 계산
// ---------------------------------------------------------------------------

/**
 * 터널 모양에 따른 버텍스 좌표 계산
 *
 * 각 모양(triangle, circle, square, hexagon, star, infinity)에 맞는
 * 3D 좌표 배열을 반환하여 LineLoop 지오메트리에 사용
 *
 * @param shape  - 모양 타입
 * @param radius - 반지름
 * @param index  - 링 인덱스 (현재 미사용이지만 확장성을 위해 유지)
 * @returns 버텍스 좌표 배열 [x, y, z, x, y, z, ...]
 */
export function getShapeVertices(
  shape: string,
  radius: number,
  index: number,
): number[] {
  const vertices: number[] = [];
  let sides: number;
  let rotation: number;

  switch (shape) {
    case 'triangle':
      sides = 3;
      rotation = -Math.PI / 2;
      break;
    case 'square':
      sides = 4;
      rotation = Math.PI / 4;
      break;
    case 'hexagon':
      sides = 6;
      rotation = 0;
      break;
    case 'circle':
      sides = 32;
      rotation = 0;
      break;
    case 'star':
      // 별 모양 - 5개 꼭지점
      for (let j = 0; j <= 10; j++) {
        const angle = (j / 10) * Math.PI * 2 - Math.PI / 2;
        const r = j % 2 === 0 ? radius : radius * 0.5;
        vertices.push(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      }
      return vertices;
    case 'infinity':
      // 무한대 모양 (8자)
      for (let j = 0; j <= 64; j++) {
        const t = (j / 64) * Math.PI * 2;
        const scale = radius * 0.6;
        const x =
          (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
        const y =
          (scale * Math.sin(t) * Math.cos(t)) /
          (1 + Math.sin(t) * Math.sin(t));
        vertices.push(x * 1.8, y * 1.5, 0);
      }
      return vertices;
    default:
      sides = 3;
      rotation = -Math.PI / 2;
  }

  for (let j = 0; j <= sides; j++) {
    const angle = (j / sides) * Math.PI * 2 + rotation;
    vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  }
  return vertices;
}

// ---------------------------------------------------------------------------
// 터널 생성
// ---------------------------------------------------------------------------

/**
 * 클래식 터널 생성
 *
 * 현재 scene을 클리어한 후 tunnelShape에 맞는 링들과 파티클을 배치.
 * state에서 현재 tunnelShape과 glowTheme을 읽어 적용.
 */
export function createTunnel(): void {
  // 기존 요소 제거
  clearSpace();

  if (!_i.scene) return;

  // state에서 설정 읽기
  const currentShape = state.tunnelShape || _i.tunnelShape;
  const currentTheme = state.glowTheme || _i.glowTheme;

  const config = TUNNEL;

  // 터널 모드용 fog
  _i.scene.fog = new THREE.Fog(0x050508, 100, 1500);

  const themeColors = GLOW_THEMES[currentTheme];
  const primaryColor = new THREE.Color(
    themeColors ? themeColors.primary : '#ffd700',
  );

  for (let i = 0; i < config.RING_COUNT; i++) {
    const radius = 300 + Math.sin(i * 0.3) * 50;
    const vertices = getShapeVertices(currentShape, radius, i);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3),
    );

    const material = new THREE.LineBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.6,
    });

    const ring = new THREE.LineLoop(geometry, material);
    ring.position.z = -i * config.RING_SPACING;
    ring.rotation.z = i * 0.05;
    ring.userData.baseZ = ring.position.z;

    _i.scene.add(ring);
    _i.tunnelRings.push(ring);
  }

  // 파티클 추가
  const particleCount = 300;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 100 + Math.random() * 200;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = -Math.random() * config.LENGTH;
  }

  particleGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );

  const particleMaterial = new THREE.PointsMaterial({
    color: primaryColor,
    size: 2,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.userData.isParticle = true;
  _i.scene.add(particles);
}

// ---------------------------------------------------------------------------
// 터널 애니메이션
// ---------------------------------------------------------------------------

/**
 * 터널 애니메이션 업데이트 (매 프레임 호출)
 *
 * 링과 파티클을 tunnelSpeed에 따라 이동시키고,
 * 카메라 뒤로 간 오브젝트는 앞으로 순환 배치.
 * glowIntensity에 따라 밝기(opacity) 변동.
 */
export function updateTunnelAnimation(): void {
  const config = TUNNEL;

  // 링 이동
  _i.tunnelRings.forEach(function (ring) {
    ring.position.z += _i.tunnelSpeed;
    ring.rotation.z += 0.002;

    // 링이 카메라 뒤로 가면 앞으로 이동
    if (ring.position.z > 100) {
      ring.position.z -= config.LENGTH;
    }
    if (ring.position.z < -config.LENGTH + 100) {
      ring.position.z += config.LENGTH;
    }

    // 거리에 따른 밝기 + 휠 반응
    const dist = Math.abs(ring.position.z);
    const baseOpacity = Math.max(0.1, 0.8 - dist / 1500);
    const glowBoost = _i.glowIntensity * (1 - dist / 1500) * 0.5;
    (ring.material as THREE.LineBasicMaterial).opacity = Math.min(
      1,
      baseOpacity + glowBoost,
    );
  });

  // 파티클 이동
  if (_i.scene) {
    _i.scene.children.forEach(function (child) {
      if (child.userData.isParticle) {
        const positions = (
          (child as THREE.Points).geometry as THREE.BufferGeometry
        ).attributes.position.array as Float32Array;
        for (let i = 0; i < positions.length / 3; i++) {
          positions[i * 3 + 2] += _i.tunnelSpeed;
          if (positions[i * 3 + 2] > 100) {
            positions[i * 3 + 2] -= config.LENGTH;
          }
          if (positions[i * 3 + 2] < -config.LENGTH + 100) {
            positions[i * 3 + 2] += config.LENGTH;
          }
        }
        (
          (child as THREE.Points).geometry as THREE.BufferGeometry
        ).attributes.position.needsUpdate = true;

        // 파티클 밝기도 휠에 반응
        ((child as THREE.Points).material as THREE.PointsMaterial).opacity =
          0.5 + _i.glowIntensity * 0.3;
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 펄스 효과
// ---------------------------------------------------------------------------

/**
 * 터널 링에 펄스 효과 적용
 * gsap을 사용해 각 링의 opacity를 순차적으로 깜빡이게 함
 */
export function pulseRings(): void {
  _i.tunnelRings.forEach(function (ring, i) {
    const delay = i * 0.02;
    gsap.to(ring.material, {
      opacity: 1,
      duration: 0.1,
      delay: delay,
      onComplete: function () {
        gsap.to(ring.material, {
          opacity: 0.6,
          duration: 0.5,
        });
      },
    });
  });
}
