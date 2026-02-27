/**
 * @file src/lib/menu/effects/click-effects.ts
 * @description 클릭 리플 및 파티클 효과
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 클릭 시 리플 효과와 버스트 파티클 생성
 * 2. **사용 방법**: `import { createClickEffect } from './click-effects'` 후 호출
 * 3. **의존성**: gsap
 *
 * 원본: mydesktop/js/effects/click-effects.js (App.Effects.createClickEffect)
 * 변경점: `App.Effects.createClickEffect` -> named export
 */

import gsap from 'gsap';

/**
 * 클릭 효과 생성
 * @param x - 클릭 X 좌표
 * @param y - 클릭 Y 좌표
 */
export function createClickEffect(x: number, y: number): void {
  // 리플 효과
  const ripple = document.createElement('div');
  ripple.className = 'click-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.width = '100px';
  ripple.style.height = '100px';
  document.body.appendChild(ripple);

  // 버스트 파티클
  const burst = document.createElement('div');
  burst.className = 'click-burst';
  burst.style.left = x + 'px';
  burst.style.top = y + 'px';
  document.body.appendChild(burst);

  const particleCount = 6;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'burst-particle';
    burst.appendChild(particle);

    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 30 + Math.random() * 20;

    gsap.fromTo(particle,
      { x: 0, y: 0, scale: 1, opacity: 1 },
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0,
        opacity: 0,
        duration: 0.6,
        ease: 'power2.out',
      },
    );
  }

  // 근처 카드 빛나게
  const cards = document.querySelectorAll('.shortcut-card');
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    const dist = Math.sqrt(Math.pow(x - cardCenterX, 2) + Math.pow(y - cardCenterY, 2));

    if (dist < 200) {
      gsap.to(card, {
        boxShadow: '0 0 40px var(--card-glow)',
        duration: 0.2,
        yoyo: true,
        repeat: 1,
      });
    }
  });

  // 글로우 인텐시티 증가
  const glowOrbs = document.querySelectorAll('.glow-orb');
  glowOrbs.forEach((orb) => {
    gsap.to(orb, {
      scale: 1.2,
      opacity: 0.9,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        gsap.to(orb, {
          scale: 1,
          opacity: 0.6,
          duration: 0.5,
        });
      },
    });
  });

  // 정리
  setTimeout(() => {
    ripple.remove();
    burst.remove();
  }, 1000);
}
