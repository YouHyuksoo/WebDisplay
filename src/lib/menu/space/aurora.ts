/**
 * @file src/lib/menu/space/aurora.ts
 * @description Three.js 공간 효과 - 오로라 모듈
 *
 * 초보자 가이드:
 * 1. **주요 개념**: Sprite 기반의 부드러운 발광 효과로 오로라를 표현
 * 2. **사용 방법**: `import { createAurora, updateAuroraAnimation } from './aurora'`
 * 3. **동작 흐름**:
 *    - `createGlowTexture()`: Canvas 2D로 그라데이션 텍스처 생성
 *    - `createAurora()`: 큰/작은/배경 스프라이트를 배치
 *    - `updateAuroraAnimation()`: 매 프레임 색상 변화, 위치 이동, 크기 맥동 처리
 * 4. **의존성**: Three.js, core.ts의 `_i` 공유 상태
 *
 * 원본: mydesktop/js/space/aurora.js (App.Space.createAurora 등)
 * 변경점:
 *   - `App.Space._internal` → `import { _i } from './core'`
 *   - `App.Config.GLOW_THEMES` → `import { GLOW_THEMES } from '../config'`
 *   - `App.State` → `import { state } from '../state'`
 */

import * as THREE from 'three';
import { state } from '../state';
import { GLOW_THEMES } from '../config';
import { _i, clearSpace } from './core';

// ---------------------------------------------------------------------------
// 텍스처 생성
// ---------------------------------------------------------------------------

/**
 * 부드러운 빛 텍스처 생성 (그라데이션)
 *
 * Canvas 2D API로 중앙에서 퍼져나가는 원형 그라데이션을 그려
 * Three.js CanvasTexture로 반환. 오로라 스프라이트의 맵으로 사용.
 *
 * @param color - 빛 색상 (THREE.Color)
 * @returns 그라데이션 텍스처
 */
export function createGlowTexture(color: THREE.Color): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // 중앙에서 퍼져나가는 부드러운 그라데이션
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
 */
export function createAurora(): void {
  // 기존 요소 제거
  clearSpace();

  if (!_i.scene) return;

  // state에서 테마 읽기
  const currentTheme = state.glowTheme || _i.glowTheme;

  // 오로라 모드용 fog 제거 (빛이 잘 보이도록)
  _i.scene.fog = new THREE.Fog(0x020208, 500, 3000);

  const themeColors = GLOW_THEMES[currentTheme];
  const primaryColor = new THREE.Color(
    themeColors ? themeColors.primary : '#ffd700',
  );
  const secondaryColor = new THREE.Color(
    themeColors ? themeColors.secondary : '#ff8c00',
  );

  // 큰 빛 덩어리들 (Sprite 사용 - 외각선 없음)
  for (let i = 0; i < 12; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(primaryColor, secondaryColor, t);
    const texture = createGlowTexture(color);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.4 + Math.random() * 0.3,
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
    sprite.userData.colorT = t;

    _i.scene.add(sprite);
  }

  // 작은 빛 입자들 (더 부드러운 느낌)
  const smallGlowCount = 30;
  for (let i = 0; i < smallGlowCount; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(primaryColor, secondaryColor, t);
    const texture = createGlowTexture(color);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
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
    sprite.userData.colorT = t;

    _i.scene.add(sprite);
  }

  // 희미한 배경 빛 (매우 큰 스프라이트)
  for (let i = 0; i < 4; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(primaryColor, secondaryColor, t);
    const texture = createGlowTexture(color);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
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
    sprite.userData.colorT = t;

    _i.scene.add(sprite);
  }
}

// ---------------------------------------------------------------------------
// 오로라 애니메이션
// ---------------------------------------------------------------------------

/**
 * 오로라 애니메이션 업데이트 (매 프레임 호출)
 *
 * 3종류의 스프라이트 각각에 대해:
 * - 위치 이동 (부드러운 sin/cos 기반 떠다님)
 * - 색상 변화 (primaryColor ↔ secondaryColor 보간)
 * - 투명도/크기 맥동
 * - FOV 미세 변화 (몽환적 효과)
 */
export function updateAuroraAnimation(): void {
  _i.auroraTime += 0.003;

  const currentTheme = state.glowTheme || _i.glowTheme;
  const themeColors = GLOW_THEMES[currentTheme];
  const primaryColor = new THREE.Color(
    themeColors ? themeColors.primary : '#ffd700',
  );
  const secondaryColor = new THREE.Color(
    themeColors ? themeColors.secondary : '#ff8c00',
  );

  if (!_i.scene) return;

  // 모든 오로라 스프라이트들의 움직임과 색상 변화
  _i.scene.children.forEach(function (child) {
    // 큰 빛 덩어리들
    if (child.userData.isAuroraGlow) {
      const phase = child.userData.phase as number;
      const speed = child.userData.speed as number;
      const baseScale = child.userData.baseScale as number;

      // 부드러운 떠다니는 움직임
      child.position.y =
        (child.userData.baseY as number) +
        Math.sin(_i.auroraTime * speed + phase) * 40;
      child.position.x =
        (child.userData.baseX as number) +
        Math.cos(_i.auroraTime * speed * 0.7 + phase) * 30;

      // Z축 천천히 이동 (휠 반응)
      child.position.z += _i.tunnelSpeed * 0.3;
      if (child.position.z > 100) child.position.z = -1200;
      if (child.position.z < -1200) child.position.z = 100;

      // 색상 변화 - 텍스처 업데이트
      const colorPhase =
        Math.sin(_i.auroraTime * 0.4 + phase) * 0.5 + 0.5;
      const newColor = new THREE.Color().lerpColors(
        primaryColor,
        secondaryColor,
        colorPhase,
      );
      (child as THREE.Sprite).material.map = createGlowTexture(newColor);
      (child as THREE.Sprite).material.map!.needsUpdate = true;

      // 투명도 맥동 (auroraBrightness 적용)
      (child as THREE.Sprite).material.opacity =
        (0.3 +
        Math.sin(_i.auroraTime * 0.5 + phase) * 0.15 +
        _i.glowIntensity * 0.2) * state.auroraBrightness;

      // 크기 맥동 (부드럽게 숨쉬는 느낌)
      const scalePulse = 1 + Math.sin(_i.auroraTime * 0.3 + phase) * 0.15;
      const finalScale = baseScale * scalePulse;
      child.scale.set(finalScale, finalScale, 1);
    }

    // 작은 빛 입자들
    if (child.userData.isAuroraSmall) {
      const phase = child.userData.phase as number;
      const speed = child.userData.speed as number;
      const baseScale = child.userData.baseScale as number;

      // 더 활발한 움직임
      child.position.y =
        (child.userData.baseY as number) +
        Math.sin(_i.auroraTime * speed + phase) * 25;

      // Z축 이동
      child.position.z += _i.tunnelSpeed * 0.5;
      if (child.position.z > 100) child.position.z = -1300;
      if (child.position.z < -1300) child.position.z = 100;

      // 색상 변화
      const colorPhase =
        Math.sin(_i.auroraTime * 0.6 + phase) * 0.5 + 0.5;
      const newColor = new THREE.Color().lerpColors(
        primaryColor,
        secondaryColor,
        colorPhase,
      );
      (child as THREE.Sprite).material.map = createGlowTexture(newColor);
      (child as THREE.Sprite).material.map!.needsUpdate = true;

      // 깜빡임 효과 (auroraBrightness 적용)
      (child as THREE.Sprite).material.opacity =
        (0.15 +
        Math.sin(_i.auroraTime * speed + phase) * 0.1 +
        _i.glowIntensity * 0.15) * state.auroraBrightness;
    }

    // 배경 빛
    if (child.userData.isAuroraBackground) {
      const phase = child.userData.phase as number;

      // 아주 천천히 색상 변화
      const colorPhase =
        Math.sin(_i.auroraTime * 0.2 + phase) * 0.5 + 0.5;
      const newColor = new THREE.Color().lerpColors(
        primaryColor,
        secondaryColor,
        colorPhase,
      );
      (child as THREE.Sprite).material.map = createGlowTexture(newColor);
      (child as THREE.Sprite).material.map!.needsUpdate = true;

      // 미세한 투명도 변화 (auroraBrightness 적용)
      (child as THREE.Sprite).material.opacity =
        (0.1 +
        Math.sin(_i.auroraTime * 0.15 + phase) * 0.05 +
        _i.glowIntensity * 0.08) * state.auroraBrightness;
    }
  });

  // FOV 부드러운 변화 (몽환적인 느낌)
  if (_i.camera) {
    const targetFov = 75 + Math.sin(_i.auroraTime * 0.15) * 2;
    _i.camera.fov += (targetFov - _i.camera.fov) * 0.01;
    _i.camera.updateProjectionMatrix();
  }
}
