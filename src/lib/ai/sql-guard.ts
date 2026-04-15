/**
 * @file src/lib/ai/sql-guard.ts
 * @description LLM이 생성한 SQL의 안전성 검증·재작성·비용 평가.
 *
 * 초보자 가이드:
 * - validate: 정규식으로 SELECT/WITH만 통과, DML/DDL 차단
 * - injectLimit: ROWNUM 또는 FETCH 절이 없으면 자동 추가
 * - evaluate: EXPLAIN PLAN으로 cost/cardinality 추정, 임계치 초과 시 needsConfirmation=true
 */

import { explainPlan } from '@/lib/db';

export interface SqlGuardResult {
  safe: boolean;
  rewritten: string;
  reason?: string;
  estimatedCost?: number;
  estimatedRows?: number;
  needsConfirmation: boolean;
}

const ROW_LIMIT = 1000;
const COST_THRESHOLD = 1_000_000;
const ROWS_THRESHOLD = 10_000;

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'TRUNCATE', 'DROP', 'ALTER',
  'GRANT', 'REVOKE', 'CREATE', 'COMMIT', 'ROLLBACK', 'SAVEPOINT',
  'EXEC', 'EXECUTE', 'CALL',
];

function stripCommentsAndStrings(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/'(?:[^']|'')*'/g, "''");
}

function validateSyntax(sql: string): { safe: boolean; reason?: string } {
  const cleaned = stripCommentsAndStrings(sql).trim().toUpperCase();

  if (cleaned.length === 0) return { safe: false, reason: '빈 SQL' };

  const semicolons = cleaned.match(/;/g);
  if (semicolons && semicolons.length > 1) {
    return { safe: false, reason: '다중 세미콜론은 차단됨' };
  }
  const cleanedNoTrailingSemi = cleaned.replace(/;\s*$/, '');
  if (cleanedNoTrailingSemi.includes(';')) {
    return { safe: false, reason: '문장 중간 세미콜론은 차단됨' };
  }

  const firstWord = cleanedNoTrailingSemi.split(/\s+/)[0];
  if (firstWord !== 'SELECT' && firstWord !== 'WITH') {
    return { safe: false, reason: `SELECT/WITH만 허용. 입력: ${firstWord}` };
  }

  for (const kw of FORBIDDEN_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`);
    if (re.test(cleanedNoTrailingSemi)) {
      return { safe: false, reason: `금지 키워드 발견: ${kw}` };
    }
  }

  return { safe: true };
}

function injectLimit(sql: string): string {
  const cleaned = stripCommentsAndStrings(sql).toUpperCase();
  if (/\bROWNUM\s*<=?\s*\d+/.test(cleaned)) return sql;
  if (/\bFETCH\s+(FIRST|NEXT)\s+\d+\s+ROWS?\s+ONLY\b/.test(cleaned)) return sql;

  const trimmed = sql.trim().replace(/;\s*$/, '');
  return `${trimmed}\nFETCH FIRST ${ROW_LIMIT} ROWS ONLY`;
}

export async function guardSql(rawSql: string): Promise<SqlGuardResult> {
  const validation = validateSyntax(rawSql);
  if (!validation.safe) {
    return { safe: false, rewritten: rawSql, reason: validation.reason, needsConfirmation: false };
  }

  const rewritten = injectLimit(rawSql);

  let cost = 0, rows = 0;
  try {
    const plan = await explainPlan(rewritten);
    cost = plan.cost;
    rows = plan.cardinality;
  } catch (e) {
    // EXPLAIN PLAN 실패 시 안전 측 처리: 사용자 확인 필요
    return {
      safe: true,
      rewritten,
      estimatedCost: -1,
      estimatedRows: -1,
      needsConfirmation: true,
      reason: `EXPLAIN PLAN 실패 (${e instanceof Error ? e.message : String(e)}). 신중하게 확인 후 실행`,
    };
  }

  const dangerous = cost >= COST_THRESHOLD || rows >= ROWS_THRESHOLD;
  return {
    safe: true,
    rewritten,
    estimatedCost: cost,
    estimatedRows: rows,
    needsConfirmation: dangerous,
    reason: dangerous ? `cost=${cost}, rows=${rows} — 임계치 초과` : undefined,
  };
}

/**
 * LLM 응답 텍스트에서 첫 번째 SQL 코드블록 추출.
 * - ```sql ... ``` 또는 ``` ... ``` 펜스
 */
export function extractSqlFromResponse(text: string): string | null {
  const match = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  return match ? match[1].trim() : null;
}
