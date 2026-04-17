/**
 * @file src/lib/ai-tables/slot-extractor.ts
 * @description Example.slots 의 aliases 를 이용한 간단 슬롯 값 추출 (스텁).
 *
 * 초보자 가이드:
 * - v1: 정규식으로 `<alias>\s*[:=]?\s*(\S+)` 캡처.
 * - v2: 소형 LLM 호출로 대체 예정. 현재는 Stage 1 cascade 배선을 위한 stub.
 */

import type { Example } from './types';

/**
 * 질문 문자열에서 예제의 slot 기본값/별칭 기반 값을 추출.
 */
export async function extractSlots(
  question: string,
  ex: Example,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const slot of ex.slots ?? []) {
    if (slot.default) out[slot.name] = slot.default;
    for (const alias of slot.aliases ?? []) {
      // alias 자체를 정규식 특수문자 이스케이프
      const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = question.match(new RegExp(`${esc}\\s*[:=]?\\s*(\\S+)`, 'i'));
      if (m) out[slot.name] = m[1];
    }
  }
  return out;
}
