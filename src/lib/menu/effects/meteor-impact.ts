/**
 * @file src/lib/menu/effects/meteor-impact.ts
 * @description 유성 화면 충돌 시스템 - 화면이 깨지는 효과
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 유성이 멀리서 날아와 화면에 충돌하면 깨짐 효과
 * 2. **사용 방법**: `import { startMeteorImpacts } from './meteor-impact'`
 * 3. **의존성**: gsap, showToast
 *
 * 원본: mydesktop/js/effects/meteor-impact.js (App.Effects.startMeteorImpacts)
 * 변경점: `App.Effects.xxx` -> named export, `App.showToast` -> import
 */

import gsap from 'gsap';
import { showToast } from '../ui';

/**
 * 유성 화면 충돌 이벤트 시작 (랜덤 간격)
 */
export function startMeteorImpacts(): void {
  function scheduleNextImpact(): void {
    const delay = 240000 + Math.random() * 240000;
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        createMeteorImpact();
      }
      scheduleNextImpact();
    }, delay);
  }
  setTimeout(scheduleNextImpact, 180000);
}

/**
 * 유성이 화면에 부딪히는 이벤트
 */
export function createMeteorImpact(): void {
  const impactX = window.innerWidth * (0.3 + Math.random() * 0.4);
  const impactY = window.innerHeight * (0.3 + Math.random() * 0.4);

  const meteor = document.createElement('div');
  meteor.className = 'meteor-impact';

  const startX = impactX + (Math.random() > 0.5 ? 1 : -1) * (window.innerWidth * 1.5);
  const startY = impactY - window.innerHeight * 1.2;
  const angle = Math.atan2(impactY - startY, impactX - startX);

  meteor.style.cssText = `
    left: ${startX}px;
    top: ${startY}px;
    width: 20px;
    height: 20px;
    transform: rotate(${angle}rad);
  `;

  const tailLength = Math.sqrt(
    Math.pow(impactX - startX, 2) + Math.pow(impactY - startY, 2),
  ) * 0.8;
  meteor.innerHTML = `
    <div class="meteor-body"></div>
    <div class="meteor-tail" style="width: ${tailLength}px;"></div>
  `;

  document.body.appendChild(meteor);

  // 화면 어두워지기
  const darkOverlay = document.createElement('div');
  darkOverlay.style.cssText = `
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: radial-gradient(circle at ${impactX}px ${impactY}px, transparent 0%, rgba(0,0,0,0.3) 100%);
    z-index: 99997;
    pointer-events: none;
    opacity: 0;
  `;
  document.body.appendChild(darkOverlay);

  const tl = gsap.timeline();

  tl.to(darkOverlay, { opacity: 1, duration: 1.5, ease: 'power2.in' }, 0);

  tl.to(meteor, {
    left: impactX,
    top: impactY,
    width: 150,
    height: 150,
    duration: 2,
    ease: 'power2.in',
  }, 0);

  tl.add(() => {
    meteor.remove();
    darkOverlay.remove();
    createScreenCrack(impactX, impactY);
  });
}

/**
 * 화면 깨짐 효과 생성
 */
export function createScreenCrack(impactX: number, impactY: number): void {
  const overlay = document.createElement('div');
  overlay.className = 'screen-crack-overlay';
  overlay.style.setProperty('--impact-x', impactX + 'px');
  overlay.style.setProperty('--impact-y', impactY + 'px');
  document.body.appendChild(overlay);

  const flash = document.createElement('div');
  flash.className = 'impact-flash';
  overlay.appendChild(flash);

  document.body.classList.add('screen-shaking');
  setTimeout(() => document.body.classList.remove('screen-shaking'), 500);

  const shockwave = document.createElement('div');
  shockwave.className = 'shockwave';
  shockwave.style.left = impactX + 'px';
  shockwave.style.top = impactY + 'px';
  overlay.appendChild(shockwave);
  setTimeout(() => shockwave.remove(), 1000);

  // SVG 깨짐 패턴
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.classList.add('crack-svg');
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);
  overlay.appendChild(svg);

  const mainCracks = 8 + Math.floor(Math.random() * 4);
  const crackElements: SVGElement[] = [];

  for (let i = 0; i < mainCracks; i++) {
    const crackAngle = (i / mainCracks) * Math.PI * 2 + Math.random() * 0.5;
    const length = 200 + Math.random() * 300;
    const endX = impactX + Math.cos(crackAngle) * length;
    const endY = impactY + Math.sin(crackAngle) * length;

    const midX = impactX + Math.cos(crackAngle + (Math.random() - 0.5) * 0.3) * (length * 0.5);
    const midY = impactY + Math.sin(crackAngle + (Math.random() - 0.5) * 0.3) * (length * 0.5);

    const path = document.createElementNS(svgNS, 'path');
    path.classList.add('crack-line');
    path.setAttribute('d', `M ${impactX} ${impactY} Q ${midX} ${midY} ${endX} ${endY}`);
    path.setAttribute('stroke-dasharray', '1000');
    path.setAttribute('stroke-dashoffset', '1000');
    path.style.animationDelay = (i * 0.05) + 's';
    svg.appendChild(path);
    crackElements.push(path);

    // 2차 균열
    const subCracks = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < subCracks; j++) {
      const subProgress = 0.3 + Math.random() * 0.5;
      const subStartX = impactX + (endX - impactX) * subProgress;
      const subStartY = impactY + (endY - impactY) * subProgress;
      const subAngle = crackAngle + (Math.random() - 0.5) * 1.5;
      const subLength = 50 + Math.random() * 100;
      const subEndX = subStartX + Math.cos(subAngle) * subLength;
      const subEndY = subStartY + Math.sin(subAngle) * subLength;

      const subPath = document.createElementNS(svgNS, 'path');
      subPath.classList.add('crack-line', 'secondary');
      subPath.setAttribute('d', `M ${subStartX} ${subStartY} L ${subEndX} ${subEndY}`);
      subPath.setAttribute('stroke-dasharray', '500');
      subPath.setAttribute('stroke-dashoffset', '500');
      subPath.style.animationDelay = (i * 0.05 + 0.2 + j * 0.03) + 's';
      svg.appendChild(subPath);
      crackElements.push(subPath);

      // 3차 균열
      if (Math.random() > 0.5) {
        const terStartX = subStartX + (subEndX - subStartX) * 0.5;
        const terStartY = subStartY + (subEndY - subStartY) * 0.5;
        const terAngle = subAngle + (Math.random() - 0.5) * 1;
        const terLength = 20 + Math.random() * 40;
        const terEndX = terStartX + Math.cos(terAngle) * terLength;
        const terEndY = terStartY + Math.sin(terAngle) * terLength;

        const terPath = document.createElementNS(svgNS, 'path');
        terPath.classList.add('crack-line', 'tertiary');
        terPath.setAttribute('d', `M ${terStartX} ${terStartY} L ${terEndX} ${terEndY}`);
        terPath.setAttribute('stroke-dasharray', '200');
        terPath.setAttribute('stroke-dashoffset', '200');
        terPath.style.animationDelay = (i * 0.05 + 0.3) + 's';
        svg.appendChild(terPath);
        crackElements.push(terPath);
      }
    }
  }

  createImpactSparks(impactX, impactY, overlay);
  createGlassShards(impactX, impactY, overlay);
  createDebris(impactX, impactY, overlay);

  showToast('\uD83D\uDCA5 유성 충돌! 화면이 깨졌습니다!');

  // 5초 후 복구
  setTimeout(() => {
    healScreenCrack(overlay, crackElements);
  }, 5000);
}

/** 충격 스파크 생성 */
function createImpactSparks(x: number, y: number, container: HTMLElement): void {
  const sparkCount = 30 + Math.floor(Math.random() * 20);

  for (let i = 0; i < sparkCount; i++) {
    const spark = document.createElement('div');
    spark.className = 'impact-spark';

    const size = 2 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 200;
    const duration = 0.3 + Math.random() * 0.5;
    const colors = ['#ff8800', '#ff4400', '#ffaa00', '#ffffff', '#ffdd88'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    spark.style.cssText = `
      left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px;
      background: ${color};
      box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color};
    `;

    container.appendChild(spark);

    gsap.to(spark, {
      left: x + Math.cos(angle) * distance,
      top: y + Math.sin(angle) * distance,
      opacity: 0,
      scale: 0,
      duration,
      ease: 'power2.out',
      onComplete: () => spark.remove(),
    });
  }
}

/** 유리 파편 생성 */
function createGlassShards(x: number, y: number, container: HTMLElement): void {
  const shardCount = 15 + Math.floor(Math.random() * 10);

  for (let i = 0; i < shardCount; i++) {
    const shard = document.createElement('div');
    shard.className = 'glass-shard';

    const size = 10 + Math.random() * 30;
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 150;

    const shapes = [
      'polygon(50% 0%, 100% 100%, 0% 100%)',
      'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
      'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
      'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    ];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    shard.style.cssText = `
      left: ${x}px; top: ${y}px;
      width: ${size}px; height: ${size}px;
      clip-path: ${shape};
    `;

    container.appendChild(shard);

    const tl = gsap.timeline();
    tl.to(shard, {
      left: x + Math.cos(angle) * distance,
      top: y + Math.sin(angle) * distance,
      rotation: Math.random() * 720 - 360,
      duration: 0.5 + Math.random() * 0.5,
      ease: 'power2.out',
    });

    tl.to(shard, {
      top: y + Math.sin(angle) * distance + 100 + Math.random() * 200,
      opacity: 0,
      duration: 1 + Math.random() * 0.5,
      ease: 'power2.in',
      onComplete: () => shard.remove(),
    });
  }
}

/** 먼지/잔해 생성 */
function createDebris(x: number, y: number, container: HTMLElement): void {
  const debrisCount = 20 + Math.floor(Math.random() * 15);

  for (let i = 0; i < debrisCount; i++) {
    const debris = document.createElement('div');
    debris.className = 'debris';

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 150;

    debris.style.left = x + 'px';
    debris.style.top = y + 'px';

    container.appendChild(debris);

    gsap.to(debris, {
      left: x + Math.cos(angle) * distance,
      top: y + Math.sin(angle) * distance + 50 + Math.random() * 100,
      opacity: 0,
      scale: 0,
      duration: 1 + Math.random() * 0.5,
      ease: 'power2.out',
      onComplete: () => debris.remove(),
    });
  }
}

/** 화면 깨짐 복구 */
function healScreenCrack(overlay: HTMLElement, crackElements: SVGElement[]): void {
  crackElements.forEach((crack, index) => {
    setTimeout(() => {
      crack.classList.add('heal-line');
    }, index * 30);
  });

  showToast('\u2728 화면이 복구됩니다...');

  setTimeout(() => {
    gsap.to(overlay, {
      opacity: 0,
      duration: 0.5,
      onComplete: () => overlay.remove(),
    });
  }, crackElements.length * 30 + 600);
}
