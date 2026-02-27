/**
 * @file src/lib/menu/index.ts
 * @description MES 디스플레이 메뉴 시스템 배럴(barrel) 내보내기
 *
 * 초보자 가이드:
 * 1. **주요 개념**: 메뉴 모듈의 모든 공개 API를 한 곳에서 re-export
 * 2. **사용 방법**: `import { GLOW_THEMES, state, Storage } from '@/lib/menu'` 처럼 사용
 * 3. **구조**:
 *    - types.ts  → 타입/인터페이스 정의
 *    - config.ts → 상수 및 기본 설정값
 *    - state.ts  → 런타임 전역 상태
 *    - storage.ts → localStorage 영속화 함수
 */

export * from './types';
export * from './config';
export { state } from './state';
export * as Storage from './storage';
