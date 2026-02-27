/**
 * @file src/lib/menu/effects/card-sleep.ts
 * @description 카드 잠들기 시스템
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 10분간 마우스오버 없으면 카드가 잠듦
 * 2. **사용 방법**: `import { startCardSleepSystem, wakeUpCard } from './card-sleep'`
 * 3. **의존성**: gsap
 *
 * 원본: mydesktop/js/effects/card-sleep.js (App.Effects.startCardSleepSystem)
 * 변경점: `App.Effects.xxx` -> named export
 */

import gsap from 'gsap';

/** 잠들기까지 대기 시간 (10분) */
const SLEEP_TIMEOUT = 600000;

/** 카드별 타이머 저장 */
const sleepTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * 카드 잠들기 시스템 시작
 */
export function startCardSleepSystem(): void {
  document.addEventListener('mouseover', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest('.shortcut-card') as HTMLElement | null;
    if (card) wakeUpCard(card);
  });

  setInterval(checkSleepingCards, 5000);
  resetAllCardTimers();
}

/**
 * 모든 카드 타이머 리셋
 */
export function resetAllCardTimers(): void {
  const cards = document.querySelectorAll('.shortcut-card');
  cards.forEach((card) => {
    resetCardTimer(card as HTMLElement);
  });
}

/**
 * 개별 카드 타이머 리셋
 * @param card - 카드 요소
 */
function resetCardTimer(card: HTMLElement): void {
  const cardId = card.dataset.id;
  if (!cardId) return;

  if (sleepTimers.has(cardId)) {
    clearTimeout(sleepTimers.get(cardId));
  }

  const timer = setTimeout(() => {
    makeCardSleep(card);
  }, SLEEP_TIMEOUT);

  sleepTimers.set(cardId, timer);
}

/**
 * 카드 잠들게 하기
 * @param card - 카드 요소
 */
function makeCardSleep(card: HTMLElement): void {
  if (!card || !document.body.contains(card)) return;
  if (card.classList.contains('sleeping')) return;

  card.classList.add('sleeping');

  const zzz = document.createElement('div');
  zzz.className = 'sleep-bubble';
  zzz.innerHTML = `
    <span class="z z1">Z</span>
    <span class="z z2">z</span>
    <span class="z z3">z</span>
  `;
  card.appendChild(zzz);

  gsap.to(card, {
    rotation: -3,
    scale: 0.98,
    duration: 0.5,
    ease: 'power2.out',
  });
}

/**
 * 카드 깨우기
 * @param card - 카드 요소
 */
export function wakeUpCard(card: HTMLElement): void {
  if (!card.classList.contains('sleeping')) {
    resetCardTimer(card);
    return;
  }

  card.classList.remove('sleeping');

  const bubble = card.querySelector('.sleep-bubble');
  if (bubble) {
    gsap.to(bubble, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      onComplete: () => bubble.remove(),
    });
  }

  gsap.timeline()
    .to(card, {
      rotation: 0,
      scale: 1.05,
      duration: 0.2,
      ease: 'power2.out',
    })
    .to(card, {
      scale: 1,
      duration: 0.3,
      ease: 'elastic.out(1, 0.5)',
    });

  gsap.to(card, {
    boxShadow: '0 0 30px var(--accent)',
    duration: 0.2,
    yoyo: true,
    repeat: 1,
  });

  resetCardTimer(card);
}

/**
 * 잠든 카드 체크 (섹션 변경 시 등)
 */
function checkSleepingCards(): void {
  const activeSection = document.querySelector('.section-cards.active');
  if (!activeSection) return;

  const cards = activeSection.querySelectorAll('.shortcut-card');
  cards.forEach((card) => {
    const el = card as HTMLElement;
    const cardId = el.dataset.id;
    if (cardId && !sleepTimers.has(cardId)) {
      resetCardTimer(el);
    }
  });
}
