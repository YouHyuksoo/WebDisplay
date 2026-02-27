/**
 * @file src/lib/menu/effects/crow.ts
 * @description 까마귀 카드 도둑 시스템
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 까마귀가 날아와 카드를 물고 감
 * 2. **사용 방법**: `import { startCrowAttacks } from './crow'`
 * 3. **의존성**: gsap, showToast
 *
 * 원본: mydesktop/js/effects/crow.js (App.Effects.startCrowAttacks)
 * 변경점: `App.Effects.xxx` -> named export, `App.showToast` -> import
 */

import gsap from 'gsap';
import { showToast } from '../ui';

/**
 * 까마귀 습격 시스템 시작
 */
export function startCrowAttacks(): void {
  function scheduleNextCrow(): void {
    const delay = 120000 + Math.random() * 180000;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        createCrowAttack();
      }
      scheduleNextCrow();
    }, delay);
  }
  setTimeout(scheduleNextCrow, 60000);
}

/**
 * 까마귀 습격 이벤트
 */
export function createCrowAttack(): void {
  const activeSection = document.querySelector('.section-cards.active');
  if (!activeSection) return;

  const cards = activeSection.querySelectorAll('.shortcut-card:not(.stolen)');
  if (cards.length === 0) return;

  const targetCard = cards[Math.floor(Math.random() * cards.length)] as HTMLElement;
  const cardRect = targetCard.getBoundingClientRect();

  // 까마귀 생성
  const crow = document.createElement('div');
  crow.className = 'crow';
  crow.innerHTML = `
    <div class="crow-body">
      <div class="crow-head">
        <div class="crow-beak"></div>
        <div class="crow-eye"></div>
      </div>
      <div class="crow-wing left"></div>
      <div class="crow-wing right"></div>
      <div class="crow-tail"></div>
    </div>
  `;
  document.body.appendChild(crow);

  const fromLeft = Math.random() > 0.5;
  const startX = fromLeft ? -100 : window.innerWidth + 100;
  const startY = -50;

  gsap.set(crow, { left: startX, top: startY, scale: 0.8 });
  crow.style.pointerEvents = 'auto';
  crow.style.cursor = 'pointer';

  let isStolen = false;
  let cardClone: HTMLElement | null = null;

  // 까마귀 클릭하면 카드 되찾기
  crow.addEventListener('click', () => {
    if (!isStolen) return;

    crow.classList.add('scared');
    gsap.to(crow, {
      top: -200,
      left: fromLeft ? -200 : window.innerWidth + 200,
      rotation: fromLeft ? -30 : 30,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => crow.remove(),
    });

    if (cardClone) {
      const originalRect = targetCard.getBoundingClientRect();
      gsap.to(cardClone, {
        left: originalRect.left,
        top: originalRect.top,
        rotation: 0,
        scale: 1,
        duration: 0.5,
        ease: 'back.out(1.7)',
        onComplete: () => {
          if (cardClone) cardClone.remove();
          targetCard.classList.remove('stolen');
          targetCard.style.visibility = 'visible';
          createRecoverEffect(targetCard);
        },
      });
    }
  });

  // Phase 1: 까마귀가 카드 위로 날아옴
  const timeline = gsap.timeline();

  timeline.to(crow, {
    left: cardRect.left + cardRect.width / 2 - 25,
    top: cardRect.top - 60,
    duration: 1.5,
    ease: 'power2.out',
  });

  timeline.to(crow, {
    left: cardRect.left + cardRect.width - 20,
    top: cardRect.top - 40,
    duration: 0.4,
    ease: 'sine.inOut',
  });

  timeline.to(crow, {
    left: cardRect.left - 10,
    top: cardRect.top - 50,
    duration: 0.4,
    ease: 'sine.inOut',
  });

  // Phase 2: 카드 낚아채기
  timeline.to(crow, {
    left: cardRect.left + cardRect.width / 2 - 25,
    top: cardRect.top,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      isStolen = true;
      targetCard.classList.add('stolen');

      cardClone = targetCard.cloneNode(true) as HTMLElement;
      cardClone.className = 'shortcut-card stolen-card';

      const crowLeft = gsap.getProperty(crow, 'left') as number;
      const crowTop = gsap.getProperty(crow, 'top') as number;

      cardClone.style.cssText = `
        position: fixed;
        left: ${crowLeft + 10}px;
        top: ${crowTop + 40}px;
        width: ${cardRect.width}px;
        height: ${cardRect.height}px;
        z-index: 9999;
        pointer-events: none;
        transform: scale(0.7);
      `;
      document.body.appendChild(cardClone);
      targetCard.style.visibility = 'hidden';
    },
  });

  // Phase 2.5: 카드 물고 잠깐 멈칫
  timeline.to(crow, {
    y: -10,
    duration: 0.3,
    ease: 'power2.out',
    onUpdate() {
      if (cardClone && isStolen) {
        const crowLeft = gsap.getProperty(crow, 'left') as number;
        const crowTop = gsap.getProperty(crow, 'top') as number;
        gsap.set(cardClone, { left: crowLeft + 10, top: crowTop + 40 });
      }
    },
  });

  timeline.to(crow, {
    y: 0,
    duration: 0.2,
    ease: 'power2.in',
    onUpdate() {
      if (cardClone && isStolen) {
        const crowLeft = gsap.getProperty(crow, 'left') as number;
        const crowTop = gsap.getProperty(crow, 'top') as number;
        gsap.set(cardClone, { left: crowLeft + 10, top: crowTop + 40 });
      }
    },
  });

  // Phase 3: 카드 들고 천천히 날아가기
  timeline.to(crow, {
    left: fromLeft ? window.innerWidth + 200 : -200,
    top: -100,
    rotation: fromLeft ? 15 : -15,
    duration: 4,
    ease: 'power1.inOut',
    onUpdate() {
      if (cardClone && isStolen) {
        const crowLeft = gsap.getProperty(crow, 'left') as number;
        const crowTop = gsap.getProperty(crow, 'top') as number;
        const crowRotation = gsap.getProperty(crow, 'rotation') as number;
        gsap.set(cardClone, {
          left: crowLeft + 10,
          top: crowTop + 40,
          rotation: crowRotation * 0.5,
        });
      }
    },
    onComplete: () => {
      crow.remove();
      if (cardClone && isStolen) {
        setTimeout(() => {
          if (cardClone && document.body.contains(cardClone)) {
            cardClone.remove();
            targetCard.classList.remove('stolen');
            targetCard.style.visibility = 'visible';

            gsap.fromTo(targetCard,
              { scale: 0, rotation: 360 },
              { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.7)' },
            );
          }
        }, 3000);
      }
    },
  });

  // 날개짓 애니메이션
  const wings = crow.querySelectorAll('.crow-wing');
  gsap.to(wings, {
    rotation: (_i: number) => _i === 0 ? -30 : 30,
    duration: 0.15,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });
}

/**
 * 카드 되찾기 보너스 이펙트
 * @param card - 되찾은 카드
 */
function createRecoverEffect(card: HTMLElement): void {
  const rect = card.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 12; i++) {
    const star = document.createElement('div');
    star.innerHTML = '\u2B50'; // ⭐
    star.style.cssText = `
      position: fixed;
      left: ${centerX}px;
      top: ${centerY}px;
      font-size: 20px;
      pointer-events: none;
      z-index: 10000;
    `;
    document.body.appendChild(star);

    const angle = (i / 12) * Math.PI * 2;
    const distance = 80 + Math.random() * 40;

    gsap.to(star, {
      left: centerX + Math.cos(angle) * distance,
      top: centerY + Math.sin(angle) * distance,
      opacity: 0,
      scale: 0,
      rotation: 360,
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => star.remove(),
    });
  }

  gsap.to(card, {
    boxShadow: '0 0 50px gold, 0 0 100px gold',
    duration: 0.3,
    yoyo: true,
    repeat: 3,
    ease: 'power2.inOut',
  });

  showToast('\uD83C\uDF89 카드를 되찾았다!');
}
