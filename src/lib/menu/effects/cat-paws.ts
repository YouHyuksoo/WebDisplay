/**
 * @file src/lib/menu/effects/cat-paws.ts
 * @description 고양이 발자국 시스템
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 화면에 고양이 발자국이 나타났다 사라짐
 * 2. **사용 방법**: `import { startCatPaws } from './cat-paws'`
 * 3. **의존성**: gsap
 *
 * 원본: mydesktop/js/effects/cat-paws.js (App.Effects.startCatPaws)
 * 변경점: `App.Effects.xxx` -> named export
 */

import gsap from 'gsap';

/**
 * 고양이 발자국 이벤트 시작
 */
export function startCatPaws(): void {
  function scheduleNextCat(): void {
    const delay = 120000 + Math.random() * 180000;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        createCatPawEvent();
      }
      scheduleNextCat();
    }, delay);
  }
  setTimeout(scheduleNextCat, 90000);
}

/**
 * 고양이 발자국 이벤트 생성 - 화면을 가로질러 걸어감
 */
export function createCatPawEvent(): void {
  const patterns: Array<'horizontal' | 'diagonal-down' | 'diagonal-up'> =
    ['horizontal', 'diagonal-down', 'diagonal-up'];
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];

  const fromLeft = Math.random() > 0.5;
  let startX: number, startY: number, endX: number, endY: number;

  if (pattern === 'horizontal') {
    startX = fromLeft ? -80 : window.innerWidth + 80;
    startY = 150 + Math.random() * (window.innerHeight - 400);
    endX = fromLeft ? window.innerWidth + 80 : -80;
    endY = startY + (Math.random() - 0.5) * 100;
  } else if (pattern === 'diagonal-down') {
    startX = fromLeft ? -80 : window.innerWidth + 80;
    startY = 50 + Math.random() * 150;
    endX = fromLeft ? window.innerWidth + 80 : -80;
    endY = window.innerHeight - 100 - Math.random() * 150;
  } else {
    startX = fromLeft ? -80 : window.innerWidth + 80;
    startY = window.innerHeight - 150 - Math.random() * 150;
    endX = fromLeft ? window.innerWidth + 80 : -80;
    endY = 50 + Math.random() * 150;
  }

  createPawPrints(startX, startY, endX, endY, fromLeft);
}

/**
 * 발자국 경로 생성 - 랜덤하게 화면에 찍힘
 */
function createPawPrints(
  _startX: number,
  _startY: number,
  _endX: number,
  _endY: number,
  _fromLeft: boolean,
): void {
  const pawCount = 15;
  let currentPaw = 0;

  function createNextPaw(): void {
    if (currentPaw >= pawCount) return;

    const x = 100 + Math.random() * (window.innerWidth - 200);
    const y = 100 + Math.random() * (window.innerHeight - 200);
    const angle = Math.random() * 360;

    createSinglePaw(x, y, angle, 0);

    currentPaw++;
    setTimeout(createNextPaw, 200 + Math.random() * 300);
  }

  createNextPaw();
}

/**
 * 단일 발자국 생성
 * @param x - X 좌표
 * @param y - Y 좌표
 * @param angle - 회전 각도
 * @param delay - 지연 시간 (ms)
 */
function createSinglePaw(x: number, y: number, angle: number, delay: number): void {
  // 반짝이는 빛 효과
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    left: ${x + 25}px;
    top: ${y + 30}px;
    width: 10px;
    height: 10px;
    background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 30%, transparent 70%);
    border-radius: 50%;
    z-index: 9999;
    pointer-events: none;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(flash);

  gsap.fromTo(flash,
    { scale: 0, opacity: 1 },
    {
      scale: 8,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => flash.remove(),
    },
  );

  // 발자국
  const paw = document.createElement('div');
  paw.className = 'cat-paw-print';
  paw.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    width: 50px;
    height: 60px;
    opacity: 0;
    z-index: 9998;
    pointer-events: none;
    transform: rotate(${angle}deg);
  `;

  paw.innerHTML = `
    <svg viewBox="0 0 50 60" fill="rgba(255,255,255,0.5)" style="filter: drop-shadow(0 0 10px rgba(255,255,255,0.8));">
      <!-- 메인 패드 -->
      <ellipse cx="25" cy="38" rx="14" ry="16"/>
      <!-- 발가락 패드들 -->
      <ellipse cx="12" cy="15" rx="8" ry="10"/>
      <ellipse cx="25" cy="8" rx="7" ry="9"/>
      <ellipse cx="38" cy="15" rx="8" ry="10"/>
    </svg>
  `;
  document.body.appendChild(paw);

  gsap.to(paw, {
    opacity: 0.6,
    duration: 0.15,
    delay: delay / 1000,
    ease: 'power2.out',
    onComplete: () => {
      gsap.to(paw, {
        opacity: 0,
        duration: 2,
        delay: 0.5,
        ease: 'power2.in',
        onComplete: () => paw.remove(),
      });
    },
  });
}
