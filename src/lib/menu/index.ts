/**
 * @file src/lib/menu/index.ts
 * @description MES 디스플레이 메뉴 시스템 배럴(barrel) 내보내기
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 메뉴 모듈의 모든 공개 API를 한 곳에서 re-export
 * 2. **사용 방법**: `import { GLOW_THEMES, state, Storage } from '@/lib/menu'` 처럼 사용
 * 3. **구조**:
 *    - types.ts      → 타입/인터페이스 정의
 *    - config.ts     → 상수 및 기본 설정값
 *    - state.ts      → 런타임 전역 상태
 *    - storage.ts    → localStorage 영속화 함수
 *    - cards.ts      → 카드 생성/렌더링
 *    - carousel.ts   → 캐러셀 레이아웃 (가상화)
 *    - sections.ts   → 섹션 전환/깊이 관리
 *    - lanes.ts      → X축 레인 전환 (LEFT/CENTER/RIGHT)
 *    - categories.ts → 카테고리 CRUD 및 UI
 *    - ui-stub.ts    → UI placeholder (ui.ts 포팅 전까지)
 */

export * from './types';
export * from './config';
export { state } from './state';
export * as Storage from './storage';
export * as Cards from './cards';
export * as Carousel from './carousel';
export * as Sections from './sections';
export * as Lanes from './lanes';
export * as Categories from './categories';
