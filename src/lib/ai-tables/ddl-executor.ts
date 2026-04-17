/**
 * @file src/lib/ai-tables/ddl-executor.ts
 * @description COMMENT ON TABLE/COLUMN DDL 검증 + 실행 + 이력 파일 생성.
 *
 * 초보자 가이드:
 * - AI Tables 페이지에서 "DDL 미리보기 → 확인 실행" 2단계 흐름을 지원한다.
 * - 허용 DDL은 오직 `COMMENT ON TABLE` / `COMMENT ON COLUMN` 하나 뿐.
 *   다른 SQL(DROP, INSERT, UPDATE, SELECT 등)은 regex 단계에서 거부한다.
 * - 여러 문장은 금지 (세미콜론 구분자로 2개 이상이면 에러).
 * - 실행 성공 시 `scripts/sql/comment-history/` 아래에 BEFORE/AFTER + OS user +
 *   timestamp가 포함된 .sql 파일을 남긴다.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { executeDml, executeQuery } from '@/lib/db';
import { PATHS } from './paths';

/**
 * COMMENT ON TABLE|COLUMN 만 허용하는 정규식.
 * - 선두 공백 허용
 * - TABLE 뒤에는 `SCHEMA.TABLE` 혹은 `TABLE` 식별자
 * - COLUMN 뒤에는 `TABLE.COLUMN` 혹은 `SCHEMA.TABLE.COLUMN` 식별자
 * - IS '..' (작은따옴표 이스케이프 '' 포함, 여러 줄 허용)
 * - 마지막 세미콜론 optional
 */
const COMMENT_DDL_REGEX =
  /^\s*COMMENT\s+ON\s+(TABLE|COLUMN)\s+[A-Z0-9_."]+(?:\.[A-Z0-9_."]+)*\s+IS\s+'(?:[^']|'')*'\s*;?\s*$/i;

/**
 * DDL 문자열이 안전한 COMMENT ON 문인지 검증.
 * 실패 시 Error throw — 호출 측에서 잡아 사용자에게 메시지 표시.
 */
export function validateCommentDdl(ddl: string): void {
  if (!ddl || typeof ddl !== 'string') {
    throw new Error('DDL 문자열이 비어 있습니다');
  }
  // 다중 문장 차단: 세미콜론 뒤에 실제 content가 있으면 reject
  const trimmed = ddl.trim();
  const semiSplit = trimmed.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
  if (semiSplit.length > 1) {
    throw new Error('다중 문장은 허용되지 않습니다 (COMMENT ON ... 한 문장만)');
  }
  if (!COMMENT_DDL_REGEX.test(trimmed)) {
    throw new Error('COMMENT ON TABLE|COLUMN 문만 허용됩니다');
  }
}

export interface CommentChange {
  table: string;
  column?: string;               // undefined = 테이블 코멘트
  before: string | null;
  after: string;
}

/**
 * 변경 요청을 받아 DDL 문자열을 생성.
 * 작은따옴표는 '' 로 이스케이프.
 */
export async function previewCommentDdl(
  change: CommentChange,
): Promise<{ ddl: string }> {
  const target = change.column
    ? `${change.table}.${change.column}`
    : change.table;
  const kind = change.column ? 'COLUMN' : 'TABLE';
  const escaped = (change.after ?? '').replace(/'/g, "''");
  const ddl = `COMMENT ON ${kind} ${target} IS '${escaped}'`;
  validateCommentDdl(ddl);
  return { ddl };
}

/**
 * DDL을 실제로 실행 + 이력 파일 기록.
 * @returns 작성된 history 파일 경로
 */
export async function executeCommentDdl(
  change: CommentChange,
  ddl: string,
): Promise<{ historyFile: string }> {
  validateCommentDdl(ddl);
  await executeDml(ddl, {});

  // 이력 파일 이름: YYYYMMDD_HHMMSS_TABLE[_COLUMN].sql
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const ts =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

  const safe = (s: string) => s.replace(/[^A-Z0-9_]/gi, '_');
  const filename =
    `${ts}_${safe(change.table)}${
      change.column ? `_${safe(change.column)}` : ''
    }.sql`;
  const filepath = path.join(PATHS.historyDir, filename);

  const user = os.userInfo().username || 'unknown';
  const lines = [
    `-- AI Tables Page — Comment History`,
    `-- table: ${change.table}`,
    change.column ? `-- column: ${change.column}` : '',
    `-- user: ${user}`,
    `-- timestamp: ${d.toISOString()}`,
    `-- change type: ${change.column ? 'column' : 'table'}`,
    '',
    `-- BEFORE`,
    `-- ${change.before ?? '(null)'}`,
    '',
    `-- AFTER`,
    `-- ${change.after}`,
    '',
    ddl.trimEnd().endsWith(';') ? ddl.trimEnd() : `${ddl.trimEnd()};`,
    '',
  ].filter((l) => l !== '');

  await fs.mkdir(PATHS.historyDir, { recursive: true });
  await fs.writeFile(filepath, lines.join('\n'), 'utf-8');
  return { historyFile: filepath };
}

/**
 * Oracle 현재 주석 조회 (USER_TAB_COMMENTS / USER_COL_COMMENTS).
 * 메인 풀(executeQuery)만 사용 — 사이트 프로필은 Phase 3b에서 확장.
 */
export async function getCurrentComment(
  tableName: string,
  columnName?: string,
): Promise<string | null> {
  if (columnName) {
    const rows = await executeQuery<{ COMMENTS: string | null }>(
      `SELECT COMMENTS
         FROM USER_COL_COMMENTS
        WHERE TABLE_NAME = :t AND COLUMN_NAME = :c`,
      { t: tableName.toUpperCase(), c: columnName.toUpperCase() },
    );
    return rows[0]?.COMMENTS ?? null;
  }
  const rows = await executeQuery<{ COMMENTS: string | null }>(
    `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName.toUpperCase() },
  );
  return rows[0]?.COMMENTS ?? null;
}
