/**
 * @file src/lib/menu/effects/meteor.ts
 * @description 유성 샤워 시스템 - 카드에 유성이 충돌하는 효과
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 유성이 랜덤 카드에 충돌하면 카드가 흔들림
 * 2. **사용 방법**: `import { startMeteorShower } from './meteor'`
 * 3. **의존성**: gsap
 *
 * 원본: mydesktop/js/effects/meteor.js (App.Effects.startMeteorShower)
 * 변경점: `App.Effects.xxx` -> named export
 */

import gsap from 'gsap';

/**
 * 유성 샤워 시작
 */
export function startMeteorShower(): void {
  function scheduleNextMeteor(): void {
    const delay = 5000 + Math.random() * 10000;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        createMeteor();
      }
      scheduleNextMeteor();
    }, delay);
  }
  scheduleNextMeteor();
}

/**
 * 유성 생성
 */
export function createMeteor(): void {
  const activeSection = document.querySelector('.section-cards.active');
  if (!activeSection) return;

  const cards = activeSection.querySelectorAll('.shortcut-card');
  if (cards.length === 0) return;

  const targetCard = cards[Math.floor(Math.random() * cards.length)] as HTMLElement;
  const cardRect = targetCard.getBoundingClientRect();

  const targetX = cardRect.left + cardRect.width / 2;
  const targetY = cardRect.top + cardRect.height / 2;

  // 유성 시작 위치 (화면 밖 랜덤)
  const side = Math.floor(Math.random() * 3);
  let startX: number;
  let startY: number;

  if (side === 0) {
    startX = Math.random() * window.innerWidth;
    startY = -50;
  } else if (side === 1) {
    startX = window.innerWidth + 50;
    startY = Math.random() * window.innerHeight * 0.5;
  } else {
    startX = window.innerWidth * 0.5 + Math.random() * window.innerWidth * 0.5;
    startY = -50;
  }

  const meteor = document.createElement('div');
  meteor.className = 'meteor';
  meteor.style.left = startX + 'px';
  meteor.style.top = startY + 'px';

  const angle = Math.atan2(targetY - startY, targetX - startX);
  meteor.style.transform = `rotate(${angle}rad)`;

  document.body.appendChild(meteor);

  const duration = 0.8 + Math.random() * 0.4;

  gsap.to(meteor, {
    left: targetX,
    top: targetY,
    duration,
    ease: 'power2.in',
    onComplete: () => {
      meteor.remove();
      createImpactEffect(targetX, targetY);
      shakeCard(targetCard);
      // 유성 맞으면 잠에서 깨움 (lazy import)
      import('./card-sleep').then((mod) => {
        if (mod.wakeUpCard) {
          mod.wakeUpCard(targetCard);
        }
      });
    },
  });
}

/**
 * 충돌 효과
 * @param x - 충돌 X 좌표
 * @param y - 충돌 Y 좌표
 */
export function createImpactEffect(x: number, y: number): void {
  const spark = document.createElement('div');
  spark.className = 'impact-spark';
  spark.style.left = x + 'px';
  spark.style.top = y + 'px';
  document.body.appendChild(spark);

  const particleCount = 8;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'spark-particle';
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 30 + Math.random() * 40;

    spark.appendChild(particle);

    gsap.fromTo(particle,
      { x: 0, y: 0, scale: 1, opacity: 1 },
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      },
    );
  }

  setTimeout(() => spark.remove(), 600);
}

/**
 * 카드 흔들기
 * @param card - 흔들 카드 요소
 */
export function shakeCard(card: HTMLElement): void {
  if (card.classList.contains('shake')) return;
  card.classList.add('shake');
  setTimeout(() => card.classList.remove('shake'), 600);
}
