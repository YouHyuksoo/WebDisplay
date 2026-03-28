/**
 * @file src/lib/menu/space/aurora.ts
 * @description Three.js 공간 효과 - 오로라 모듈
 *
 * 초보자 가이드:
 * 1. **주요 개념**: Sprite 기반의 부드러운 발광 효과로 오로라를 표현
 * 2. **사용 방법**: `import { createAurora, updateAuroraAnimation } from './aurora'`
 * 3. **동작 흐름**:
 *    - `createGlowTexture()`: Canvas 2D로 그라데이션 텍스처 생성 (초기화 시 1회)
 *    - `createAurora()`: 큰/작은/배경 스프라이트를 배치
 *    - `updateAuroraAnimation()`: 매 프레임 색상 변화, 위치 이동, 크기 맥동 처리
 * 4. **성능 최적화**:
 *    - 화이트 공유 텍스처 1개 + material.color로 색조 변경 (매 프레임 Canvas 재생성 제거)
 *    - THREE.Color 객체 풀링 (매 프레임 new 연산 제거)
 * 5. **의존성**: Three.js, core.ts의 `_i` 공유 상태
 *
 * 원본: mydesktop/js/space/aurora.js (App.Space.createAurora 등)
 */

import * as THREE from 'three';
import { state } from '../state';
import { GLOW_THEMES } from '../config';
import { _i, clearSpace } from './core';

// ---------------------------------------------------------------------------
// 텍스처 생성
// ---------------------------------------------------------------------------

/** 공유 화이트 글로우 텍스처 (1회 생성, 전체 스프라이트가 재사용) */
let _sharedGlowTexture: THREE.CanvasTexture | null = null;

/**
 * 공유 화이트 글로우 텍스처를 가져온다 (없으면 생성).
 * 모든 스프라이트가 이 텍스처를 공유하고, material.color로 색조를 변경한다.
 */
function getSharedGlowTexture(): THREE.CanvasTexture {
  if (_sharedGlowTexture) return _sharedGlowTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  _sharedGlowTexture = new THREE.CanvasTexture(canvas);
  _sharedGlowTexture.needsUpdate = true;
  return _sharedGlowTexture;
}

/**
 * 부드러운 빛 텍스처 생성 (그라데이션)
 * 외부 호출 호환을 위해 유지. 내부에서는 getSharedGlowTexture 사용.
 *
 * @param color - 빛 색상 (THREE.Color)
 * @returns 그라데이션 텍스처
 */
export function createGlowTexture(color: THREE.Color): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  const r = Math.floor(color.r * 255);
  const g = Math.floor(color.g * 255);
  const b = Math.floor(color.b * 255);

  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
  gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, 0.6)`);
  gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.3)`);
  gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.1)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * 공유 텍스처 해제 (dispose 시 호출)
 */
export function disposeSharedTexture(): void {
  if (_sharedGlowTexture) {
    _sharedGlowTexture.dispose();
    _sharedGlowTexture = null;
  }
}

// ---------------------------------------------------------------------------
// 오로라 생성
// ---------------------------------------------------------------------------

/**
 * 오로라 효과 생성
 *
 * scene을 클리어한 후 3종류의 스프라이트를 배치:
 * 1. 큰 빛 덩어리 (12개) - 메인 오로라 표현
 * 2. 작은 빛 입자 (30개) - 디테일
 * 3. 희미한 배경 빛 (4개) - 분위기 연출
 *
 * 각 스프라이트는 userData에 애니메이션 파라미터(phase, speed 등)를 저장.
 * 성능 최적화: 공유 화이트 텍스처 + material.color로 색조 변경.
 */
export function createAurora(): void {
  clearSpace();
  if (!_i.scene) return;

  const currentTheme = state.glowTheme || _i.glowTheme;
  _i.scene.fog = new THREE.Fog(0x020208, 500, 3000);

  const themeColors = GLOW_THEMES[currentTheme];
  const primaryColor = new THREE.Color(themeColors ? themeColors.primary : '#ffd700');
  const secondaryColor = new THREE.Color(themeColors ? themeColors.secondary : '#ff8c00');

  const sharedTexture = getSharedGlowTexture();

  // 큰 빛 덩어리들 (12개) — opacity 낮춰서 카드 뒤 반짝임 감소
  for (let i = 0; i < 12; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(primaryColor, secondaryColor, t);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: sharedTexture,
      color,
      transparent: true,
      opacity: 0.25 + Math.random() * 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const scale = 200 + Math.random() * 400;
    sprite.scale.set(scale, scale, 1);

    sprite.position.set(
      (Math.random() - 0.5) * 1200,
      (Math.random() - 0.5) * 600,
      -200 - Math.random() * 1000,
    );

    sprite.userData.isAuroraGlow = true;
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.baseX = sprite.position.x;
    sprite.userData.phase = Math.random() * Math.PI * 2;
    sprite.userData.speed = 0.2 + Math.random() * 0.4;
    sprite.userData.baseScale = scale;

    _i.scene.add(sprite);
  }

  // 작은 빛 입자들 (30개)
  for (let i = 0; i < 30; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(primaryColor, secondaryColor, t);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: sharedTexture,
      color,
      transparent: true,
      opacity: 0.2 + Math.random() * 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const scale = 50 + Math.random() * 100;
    sprite.scale.set(scale, scale, 1);

    sprite.position.set(
      (Math.random() - 0.5) * 1500,
      (Math.random() - 0.5) * 800,
      -100 - Math.random() * 1200,
    );

    sprite.userData.isAuroraSmall = true;
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.phase = Math.random() * Math.PI * 2;
    sprite.userData.speed = 0.5 + Math.random() * 0.8;
    sprite.userData.baseScale = scale;

    _i.scene.add(sprite);
  }

  // 희미한 배경 빛 (4개)
  for (let i = 0; i < 4; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(primaryColor, secondaryColor, t);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: sharedTexture,
      color,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMaterial);
    const scale = 800 + Math.random() * 600;
    sprite.scale.set(scale, scale, 1);

    sprite.position.set(
      (Math.random() - 0.5) * 800,
      (Math.random() - 0.5) * 400,
      -800 - Math.random() * 500,
    );

    sprite.userData.isAuroraBackground = true;
    sprite.userData.phase = Math.random() * Math.PI * 2;

    _i.scene.add(sprite);
  }
}

// ---------------------------------------------------------------------------
// 오로라 애니메이션 (최적화 버전)
// ---------------------------------------------------------------------------

/** 재사용 Color 객체 — 매 프레임 new 방지 */
const _reusePrimary = new THREE.Color();
const _reuseSecondary = new THREE.Color();
const _reuseColor = new THREE.Color();

/**
 * 오로라 애니메이션 업데이트 (매 프레임 호출)
 *
 * 3종류의 스프라이트 각각에 대해:
 * - 위치 이동 (부드러운 sin/cos 기반 떠다님)
 * - 색상 변화 (material.color 보간 — Canvas 재생성 없음)
 * - 투명도/크기 맥동
 * - FOV 미세 변화 (몽환적 효과)
 */
export function updateAuroraAnimation(): void {
  _i.auroraTime += 0.003;

  const currentTheme = state.glowTheme || _i.glowTheme;
  const themeColors = GLOW_THEMES[currentTheme];
  _reusePrimary.set(themeColors ? themeColors.primary : '#ffd700');
  _reuseSecondary.set(themeColors ? themeColors.secondary : '#ff8c00');

  if (!_i.scene) return;

  const children = _i.scene.children;
  for (let i = 0, len = children.length; i < len; i++) {
    const child = children[i];

    // 큰 빛 덩어리들
    if (child.userData.isAuroraGlow) {
      const phase = child.userData.phase as number;
      const speed = child.userData.speed as number;
      const baseScale = child.userData.baseScale as number;
      const mat = (child as THREE.Sprite).material;

      // 부드러운 떠다니는 움직임
      child.position.y = (child.userData.baseY as number) + Math.sin(_i.auroraTime * speed + phase) * 40;
      child.position.x = (child.userData.baseX as number) + Math.cos(_i.auroraTime * speed * 0.7 + phase) * 30;

      // Z축 이동 (휠 반응)
      child.position.z += _i.tunnelSpeed * 0.3;
      if (child.position.z > 100) child.position.z = -1200;
      if (child.position.z < -1200) child.position.z = 100;

      // 색상 변화 — material.color만 변경 (텍스처 재생성 없음)
      const colorPhase = Math.sin(_i.auroraTime * 0.4 + phase) * 0.5 + 0.5;
      _reuseColor.lerpColors(_reusePrimary, _reuseSecondary, colorPhase);
      mat.color.copy(_reuseColor);

      // 투명도 맥동 — 변화폭 줄여서 카드 뒤 깜빡임 감소
      mat.opacity = (0.2 + Math.sin(_i.auroraTime * 0.3 + phase) * 0.08 + _i.glowIntensity * 0.15) * state.auroraBrightness;

      // 크기 맥동 — 변화폭 줄임
      const scalePulse = 1 + Math.sin(_i.auroraTime * 0.2 + phase) * 0.08;
      const finalScale = baseScale * scalePulse;
      child.scale.set(finalScale, finalScale, 1);
    }

    // 작은 빛 입자들
    else if (child.userData.isAuroraSmall) {
      const phase = child.userData.phase as number;
      const speed = child.userData.speed as number;
      const mat = (child as THREE.Sprite).material;

      child.position.y = (child.userData.baseY as number) + Math.sin(_i.auroraTime * speed + phase) * 25;

      child.position.z += _i.tunnelSpeed * 0.5;
      if (child.position.z > 100) child.position.z = -1300;
      if (child.position.z < -1300) child.position.z = 100;

      // 색상 변화 — material.color만 변경
      const colorPhase = Math.sin(_i.auroraTime * 0.6 + phase) * 0.5 + 0.5;
      _reuseColor.lerpColors(_reusePrimary, _reuseSecondary, colorPhase);
      mat.color.copy(_reuseColor);

      mat.opacity = (0.1 + Math.sin(_i.auroraTime * speed * 0.5 + phase) * 0.05 + _i.glowIntensity * 0.1) * state.auroraBrightness;
    }

    // 배경 빛
    else if (child.userData.isAuroraBackground) {
      const phase = child.userData.phase as number;
      const mat = (child as THREE.Sprite).material;

      const colorPhase = Math.sin(_i.auroraTime * 0.2 + phase) * 0.5 + 0.5;
      _reuseColor.lerpColors(_reusePrimary, _reuseSecondary, colorPhase);
      mat.color.copy(_reuseColor);

      mat.opacity = (0.1 + Math.sin(_i.auroraTime * 0.15 + phase) * 0.05 + _i.glowIntensity * 0.08) * state.auroraBrightness;
    }
  }

  // FOV 부드러운 변화 (변화량이 미미하면 행렬 재계산 스킵)
  if (_i.camera) {
    const targetFov = 75 + Math.sin(_i.auroraTime * 0.15) * 2;
    const fovDelta = (targetFov - _i.camera.fov) * 0.01;
    if (Math.abs(fovDelta) > 0.005) {
      _i.camera.fov += fovDelta;
      _i.camera.updateProjectionMatrix();
    }
  }
}
