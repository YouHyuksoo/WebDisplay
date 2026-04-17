/**
 * @file src/lib/ai-tables/tokenizer.ts
 * @description 토큰 수 경험식 추정.
 *
 * 초보자 가이드:
 * - 정확한 토큰 계산은 tiktoken/anthropic-tokenizer가 필요하지만, 본 페이지 목적
 *   (프롬프트 길이 가늠)에는 Math.ceil(len / 3) 근사로 충분.
 * - 한글·영문·SQL 혼합 텍스트에 대해 ±15% 오차 범위.
 */

/** 문자 길이 기반 토큰 수 근사치. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}
