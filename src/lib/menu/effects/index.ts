/**
 * @file src/lib/menu/effects/index.ts
 * @description 이펙트 모듈 통합 - 모든 시각 효과 초기화
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 이 파일은 모든 이펙트 모듈을 통합하여 init()으로 시작
 * 2. **사용 방법**: `import * as Effects from './effects'; Effects.init();`
 * 3. **모듈 목록**:
 *    - click-effects.ts  : 클릭 리플/파티클
 *    - meteor.ts         : 유성 샤워 (카드 충돌)
 *    - crow.ts           : 까마귀 카드 도둑
 *    - cat-paws.ts       : 고양이 발자국
 *    - card-sleep.ts     : 카드 잠들기 시스템
 *    - ufo-alien.ts      : UFO & 문어 우주인
 *    - star-flyby.ts     : 별 날아오기
 *    - dragon.ts         : 드래곤 습격
 *    - wolf.ts           : 늑대 등장
 *    - meteor-impact.ts  : 유성 화면 충돌
 *
 * 원본: mydesktop/js/effects/index.js (App.Effects.init)
 * 변경점: `App.Effects.init` -> named export `init`
 */

import { startMeteorShower } from './meteor';
import { startCrowAttacks } from './crow';
import { startCatPaws } from './cat-paws';
import { startCardSleepSystem } from './card-sleep';
import { startUfoVisits } from './ufo-alien';
import { startDragonAttacks } from './dragon';
import { startMeteorImpacts } from './meteor-impact';

// Re-export 개별 이펙트 함수들
export { createClickEffect } from './click-effects';
export { startMeteorShower, createMeteor, createImpactEffect, shakeCard } from './meteor';
export { startCrowAttacks, createCrowAttack } from './crow';
export { startCatPaws, createCatPawEvent } from './cat-paws';
export { startCardSleepSystem, wakeUpCard, resetAllCardTimers } from './card-sleep';
export { startUfoVisits, createUfoEvent } from './ufo-alien';
export { createStarFlyby } from './star-flyby';
export { startDragonAttacks, createDragonAttack } from './dragon';
export { createWolfAppear } from './wolf';
export { startMeteorImpacts, createMeteorImpact, createScreenCrack } from './meteor-impact';

/**
 * 모든 자동 이펙트 시스템 초기화
 */
export function init(): void {
  startMeteorShower();
  startCrowAttacks();
  startCatPaws();
  startCardSleepSystem();
  startUfoVisits();
  startDragonAttacks();
  startMeteorImpacts();

  console.log('[Effects] All effect systems initialized');
}
