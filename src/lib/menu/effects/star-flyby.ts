/**
 * @file src/lib/menu/effects/star-flyby.ts
 * @description 별 날아오기 효과 (아바타 클릭 시)
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 왼쪽 상단에서 별이 날아와 화면을 가로질러 사라짐
 * 2. **사용 방법**: `import { createStarFlyby } from './star-flyby'`
 * 3. **의존성**: gsap
 *
 * 원본: mydesktop/js/effects/star-flyby.js (App.Effects.createStarFlyby)
 * 변경점: `App.Effects.xxx` -> named export
 */

import gsap from 'gsap';

/**
 * 별 날아오기 효과
 */
export function createStarFlyby(): void {
  const container = document.createElement('div');
  container.className = 'star-flyby-container';
  container.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
    z-index: 10000;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  const star = document.createElement('div');
  const color = '#FFD700';

  star.innerHTML = `
    <svg viewBox="0 0 24 24" fill="${color}" style="width:100%;height:100%;filter:drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color});">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  `;

  star.style.cssText = `
    position: absolute;
    left: -50px;
    top: -50px;
    width: 20px;
    height: 20px;
    opacity: 0;
  `;

  container.appendChild(star);

  const endX = window.innerWidth + 100;
  const endY = window.innerHeight + 100;

  const timeline = gsap.timeline();

  // Phase 1: 왼쪽 상단에서 나타남
  timeline.to(star, {
    left: 50,
    top: 50,
    opacity: 0.5,
    width: 15,
    height: 15,
    duration: 0.3,
    ease: 'power1.out',
  });

  // Phase 2: 화면 중앙으로 다가오면서 커짐
  timeline.to(star, {
    left: window.innerWidth * 0.4,
    top: window.innerHeight * 0.4,
    opacity: 1,
    width: 60,
    height: 60,
    rotation: 180,
    duration: 1.5,
    ease: 'power1.in',
  });

  // Phase 3: 빠르게 지나쳐서 오른쪽 하단으로 사라짐
  timeline.to(star, {
    left: endX,
    top: endY,
    opacity: 0,
    width: 150,
    height: 150,
    rotation: 360,
    duration: 0.5,
    ease: 'power2.in',
  });

  timeline.eventCallback('onComplete', () => {
    setTimeout(() => container.remove(), 100);
  });
}
