/**
 * @file src/lib/menu/effects/ufo-alien.ts
 * @description UFO & 문어 우주인 시스템
 *
 * 초보자 가이드:
 * 1. **주요 개념**: UFO가 날아와 카드 위에 떠있고, 문어 우주인이 내려와 걸어다님
 * 2. **사용 방법**: `import { startUfoVisits } from './ufo-alien'`
 * 3. **의존성**: gsap
 *
 * 원본: mydesktop/js/effects/ufo-alien.js (App.Effects.startUfoVisits)
 * 변경점: `App.Effects.xxx` -> named export
 */

import gsap from 'gsap';

/**
 * UFO 이벤트 시작 (랜덤 간격으로 발생)
 */
export function startUfoVisits(): void {
  function scheduleNextUfo(): void {
    const delay = 120000 + Math.random() * 180000;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        createUfoEvent();
      }
      scheduleNextUfo();
    }, delay);
  }
  setTimeout(scheduleNextUfo, 120000);
}

/**
 * UFO 이벤트 생성
 */
export function createUfoEvent(): void {
  const activeSection = document.querySelector('.section-cards.active');
  if (!activeSection) return;

  const cards = activeSection.querySelectorAll('.shortcut-card');
  if (cards.length === 0) return;

  const targetCard = cards[Math.floor(Math.random() * cards.length)] as HTMLElement;
  const cardRect = targetCard.getBoundingClientRect();

  const targetX = cardRect.left + cardRect.width / 2;
  const targetY = cardRect.top - 80;

  const ufoContainer = document.createElement('div');
  ufoContainer.className = 'ufo-container';
  ufoContainer.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
  `;
  document.body.appendChild(ufoContainer);

  const ufo = document.createElement('div');
  ufo.className = 'ufo';
  ufo.innerHTML = `
    <div class="ufo-body">
      <div class="ufo-dome"></div>
      <div class="ufo-ring"></div>
      <div class="ufo-lights">
        <span></span><span></span><span></span><span></span>
      </div>
    </div>
  `;
  ufoContainer.appendChild(ufo);

  const beam = document.createElement('div');
  beam.className = 'ufo-beam';
  ufoContainer.appendChild(beam);

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -100 : window.innerWidth + 100;
  const startY = targetY - 50;

  gsap.set(ufoContainer, { left: startX, top: startY });

  // Phase 1: UFO가 카드 위로 날아옴
  gsap.to(ufoContainer, {
    left: targetX - 40,
    top: targetY,
    duration: 2,
    ease: 'power2.out',
    onComplete: () => {
      // Phase 2: 빔 켜기 + 문어 내려오기
      beam.classList.add('active');

      setTimeout(() => {
        spawnAlien(targetCard, cardRect, () => {
          beam.classList.remove('active');

          const exitX = fromLeft ? window.innerWidth + 100 : -100;
          gsap.to(ufoContainer, {
            left: exitX,
            top: startY - 100,
            duration: 2,
            ease: 'power2.in',
            onComplete: () => ufoContainer.remove(),
          });
        });
      }, 500);
    },
  });

  // UFO 떠다니는 애니메이션
  gsap.to(ufo, {
    y: -5,
    duration: 0.5,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });
}

/**
 * 문어 우주인 생성
 * @param _targetCard - 대상 카드
 * @param cardRect - 카드 위치 정보
 * @param onComplete - 완료 콜백
 */
function spawnAlien(_targetCard: HTMLElement, cardRect: DOMRect, onComplete: () => void): void {
  const alien = document.createElement('div');
  alien.className = 'space-alien';
  alien.innerHTML = `
    <div class="alien-body">
      <div class="alien-head">
        <div class="alien-eye left"></div>
        <div class="alien-eye right"></div>
      </div>
      <div class="alien-tentacles">
        <div class="tentacle t1"></div>
        <div class="tentacle t2"></div>
        <div class="tentacle t3"></div>
        <div class="tentacle t4"></div>
      </div>
    </div>
  `;
  document.body.appendChild(alien);

  const startX = cardRect.left + cardRect.width / 2;
  const startAlienY = cardRect.top - 100;
  const walkY = cardRect.top + 10;

  gsap.set(alien, { left: startX, top: startAlienY, opacity: 0, scale: 0.3 });

  gsap.to(alien, {
    top: walkY,
    opacity: 1,
    scale: 1,
    duration: 1,
    ease: 'bounce.out',
    onComplete: () => {
      walkOnCard(alien, cardRect, () => {
        gsap.to(alien, {
          top: startAlienY,
          opacity: 0,
          scale: 0.3,
          duration: 0.8,
          ease: 'power2.in',
          onComplete: () => {
            alien.remove();
            onComplete();
          },
        });
      });
    },
  });
}

/**
 * 카드 위를 걸어다니는 애니메이션
 * @param alien - 문어 우주인 요소
 * @param cardRect - 카드 위치 정보
 * @param onComplete - 완료 콜백
 */
function walkOnCard(alien: HTMLElement, cardRect: DOMRect, onComplete: () => void): void {
  const leftBound = cardRect.left + 10;
  const rightBound = cardRect.left + cardRect.width - 30;

  const tentacles = alien.querySelectorAll('.tentacle');
  tentacles.forEach((t, i) => {
    gsap.to(t, {
      rotation: i % 2 === 0 ? 15 : -15,
      duration: 0.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  });

  const timeline = gsap.timeline({
    onComplete: () => {
      gsap.killTweensOf(tentacles);
      onComplete();
    },
  });

  timeline.to(alien, {
    left: rightBound,
    duration: 1.5,
    ease: 'sine.inOut',
    onStart: () => alien.classList.remove('flip'),
  });

  timeline.to(alien, {
    left: leftBound,
    duration: 1.5,
    ease: 'sine.inOut',
    onStart: () => alien.classList.add('flip'),
  });

  timeline.to(alien, {
    left: rightBound,
    duration: 1.5,
    ease: 'sine.inOut',
    onStart: () => alien.classList.remove('flip'),
  });

  timeline.to(alien, {
    left: cardRect.left + cardRect.width / 2,
    duration: 0.8,
    ease: 'sine.inOut',
  });
}
