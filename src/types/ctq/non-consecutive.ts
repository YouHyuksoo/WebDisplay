/**
 * @file src/types/ctq/non-consecutive.ts
 * @description CTQ 비연속 동일위치 불량 모니터링 타입 (repeatability 타입 재사용)
 *
 * 초보자 가이드:
 * - B급: 동일위치 비연속불량 (같은 Location 2건+이지만 연속은 아님)
 * - 반복성(repeatability) 타입을 그대로 재사용
 */

export type {
  RepeatProcessType,
  RepeatGrade,
  NgDetailRecord,
  RepeatProcessStatus,
  RepeatLineCardData,
  RepeatabilityResponse,
} from "./repeatability";
