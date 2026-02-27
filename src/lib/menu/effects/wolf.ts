/**
 * @file src/lib/menu/effects/wolf.ts
 * @description 늑대 등장 시스템 (Lottie 애니메이션)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 늑대가 화면 하단에서 올라옴
 * 2. **사용 방법**: `import { createWolfAppear } from './wolf'`
 * 3. **의존성**: gsap, dotlottie-wc (웹 컴포넌트)
 *
 * 원본: mydesktop/js/effects/wolf.js (App.Effects.createWolfAppear)
 * 변경점: `App.Effects.xxx` -> named export
 */

import gsap from 'gsap';

/**
 * 늑대 등장 이벤트
 */
export function createWolfAppear(): void {
  const wolf = document.createElement('div');
  wolf.className = 'wolf-lottie';
  wolf.style.cssText = `
    position: fixed;
    left: ${window.innerWidth / 2 - 150}px;
    top: ${window.innerHeight + 100}px;
    z-index: 9999;
    pointer-events: none;
  `;

  // dotlottie-wc 웹 컴포넌트 생성
  const lottiePlayer = document.createElement('dotlottie-wc');
  lottiePlayer.setAttribute('src', 'https://lottie.host/5fe0b40b-f7b8-48bd-87d0-f9105d67220e/H0SQFFQhn9.lottie');
  lottiePlayer.setAttribute('autoplay', '');
  lottiePlayer.setAttribute('loop', '');
  lottiePlayer.style.cssText = 'width: 300px; height: 300px;';
  wolf.appendChild(lottiePlayer);
  document.body.appendChild(wolf);

  const timeline = gsap.timeline();
  const wolfHeight = 300;

  // Phase 1: 하단에서 올라옴
  timeline.to(wolf, {
    top: window.innerHeight - wolfHeight,
    duration: 1.5,
    ease: 'power2.out',
  });

  // Phase 2: 잠시 머무르기
  timeline.to(wolf, {
    y: -20,
    duration: 0.5,
    yoyo: true,
    repeat: 2,
    ease: 'sine.inOut',
  });

  // Phase 3: 다시 내려감
  timeline.to(wolf, {
    top: window.innerHeight + 100,
    duration: 1.5,
    delay: 1,
    ease: 'power2.in',
    onComplete: () => wolf.remove(),
  });
}
