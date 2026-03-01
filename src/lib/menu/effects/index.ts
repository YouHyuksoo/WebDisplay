/**
 * @file src/lib/menu/effects/index.ts
 * @description 이펙트 모듈 통합 - 수동 트리거 모드
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 이 파일은 모든 이펙트 모듈을 통합 export
 * 2. **사용 방법**: `import { createMeteor } from './effects';` 로 개별 함수 사용
 * 3. **트리거 방식**: 자동 실행 없음 - 모든 이펙트는 사용자 클릭으로 수동 실행
 * 4. **모듈 목록**:
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
 * 변경점: 자동 타이머 제거 → 수동 트리거 전용 (GPU 최적화)
 */

// Re-export 개별 이펙트 함수들
export { createClickEffect } from './click-effects';
export { createMeteor, createImpactEffect, shakeCard } from './meteor';
export { createCrowAttack } from './crow';
export { createCatPawEvent } from './cat-paws';
export { startCardSleepSystem, wakeUpCard, resetAllCardTimers } from './card-sleep';
export { createUfoEvent } from './ufo-alien';
export { createStarFlyby } from './star-flyby';
export { createDragonAttack } from './dragon';
export { createWolfAppear } from './wolf';
export { createMeteorImpact, createScreenCrack } from './meteor-impact';

/**
 * 이펙트 시스템 초기화 (자동 실행 없음 - 모든 이펙트는 수동 클릭으로 실행)
 */
export function init(): void {
  console.log('[Effects] Effect system ready (manual trigger mode)');
}
