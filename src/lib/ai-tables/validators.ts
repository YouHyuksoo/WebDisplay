/**
 * @file src/lib/ai-tables/validators.ts
 * @description Example 검증 로직 — kind 별 필수 필드 + SELECT/WITH 전용 가드.
 *
 * 초보자 가이드:
 * - `validateExample(ex)` 는 POST/PATCH 시 서버에서 호출.
 * - kind 에 따라 필수 필드가 다름:
 *   - `exact`    → sql 필수
 *   - `template` → sqlTemplate 필수
 *   - `skeleton` → dialog(≥1) + sqlTemplate 필수
 * - SQL 은 SELECT/WITH 로 시작해야 함 (DML 차단).
 */

import type { Example } from './types';

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

/**
 * Example 부분 객체를 검증.
 * PATCH 의 경우도 merge 후 완성된 객체로 호출하는 것을 권장.
 */
export function validateExample(ex: Partial<Example>): ValidationResult {
  if (!ex.kind || !['exact', 'template', 'skeleton'].includes(ex.kind)) {
    return { ok: false, error: 'invalid kind' };
  }
  if (!ex.question?.trim()) {
    return { ok: false, error: 'question required' };
  }
  if (ex.kind === 'exact' && !ex.sql?.trim()) {
    return { ok: false, error: 'sql required for exact' };
  }
  if (ex.kind === 'template' && !ex.sqlTemplate?.trim()) {
    return { ok: false, error: 'sqlTemplate required for template' };
  }
  if (
    ex.kind === 'skeleton' &&
    (!ex.dialog?.length || !ex.sqlTemplate?.trim())
  ) {
    return { ok: false, error: 'dialog+sqlTemplate required for skeleton' };
  }
  // SELECT/WITH 만 허용 (간단 prefix 검사)
  const sql = (ex.sql || ex.sqlTemplate || '').trim().toUpperCase();
  if (sql && !/^(SELECT|WITH)\b/.test(sql)) {
    return { ok: false, error: 'SELECT/WITH only' };
  }
  return { ok: true };
}
