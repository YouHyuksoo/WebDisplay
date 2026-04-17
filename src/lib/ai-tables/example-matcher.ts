/**
 * @file src/lib/ai-tables/example-matcher.ts
 * @description 자연어 질문과 저장된 Example.question 간 단순 단어 overlap 매칭.
 *
 * 초보자 가이드:
 * - 질문을 공백 분리 후 2글자 이상 토큰으로 정규화.
 * - 예제 질문 토큰과 겹치는 단어 비율을 score (0~1)로.
 * - v2 에서 형태소/임베딩으로 대체 예정. v1은 로깅·디버깅 용도.
 */

import type { Example, TableMeta } from './types';

export interface MatchResult {
  example: Example;
  score: number;
  tableName: string;
}

/**
 * 질문과 테이블 내 예제들을 매칭해 score 내림차순으로 반환.
 */
export function matchExamples(
  question: string,
  tables: Array<{ name: string; meta: TableMeta }>,
): MatchResult[] {
  const qWords = question
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (qWords.length === 0) return [];

  const out: MatchResult[] = [];
  for (const { name, meta } of tables) {
    const examples = meta?.examples ?? [];
    for (const ex of examples) {
      const exWords = ex.question.toLowerCase().split(/\s+/);
      const overlap = qWords.filter((w) =>
        exWords.some((e) => e.includes(w) || w.includes(e)),
      ).length;
      const score = overlap / Math.max(qWords.length, 1);
      if (score > 0) out.push({ example: ex, score, tableName: name });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
