/**
 * @file src/lib/ai-tables/sql-table-parser.ts
 * @description SQL 문자열에서 FROM/JOIN 절의 테이블 이름을 추출한다.
 *
 * 초보자 가이드:
 * - 주석(`-- ...`, `/* ... *\/`)은 무시한다.
 * - 식별자는 `[A-Z_][A-Z0-9_]*` 패턴만 (스키마 접두어·quoted identifier 미지원 — v1 스펙).
 * - 반환값은 대문자 Set → 배열. 중복 제거 + 정렬 없이 원본 순서 유지.
 */

/**
 * SQL에서 FROM/JOIN 다음에 나오는 테이블 이름 추출.
 * 주석 제거 후 정규식 매칭, 대문자화하여 Set으로 중복 제거.
 */
export function extractTableNames(sql: string): string[] {
  if (!sql) return [];
  // 라인 주석 + 블록 주석 제거
  const clean = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const matches = [
    ...clean.matchAll(/\b(?:FROM|JOIN)\s+([A-Z_][A-Z0-9_]*)/gi),
  ];
  const set = new Set(matches.map((m) => m[1].toUpperCase()));
  return [...set];
}
