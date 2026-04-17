/**
 * @file src/lib/ai-tables/db-schema.ts
 * @description Oracle USER_TAB_COLUMNS / USER_COL_COMMENTS / USER_TAB_COMMENTS / PK 조회.
 *
 * 초보자 가이드:
 * - `scripts/migrate-to-tables-json.mjs` 의 `fetchTableSchema` 를 런타임(TS)로 이식.
 * - `fetchTableSchemaFromDb()` 는 Phase 3의 sync API에서 사용 (신규 테이블 추가 시).
 * - 프로필 지정이 없으면 메인 풀(`executeQuery`)을 사용. 멕시코전장 등 보조 사이트는
 *   `profile` 인자로 전환 (현재 Phase 2 런타임은 `default`만 사용).
 */

import type oracledb from 'oracledb';
import { executeQuery, executeQueryByProfile } from '@/lib/db';
import type { CachedTableSchema, CachedColumn } from './types';

interface RawColumnRow {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number | null;
  DATA_PRECISION: number | null;
  DATA_SCALE: number | null;
  NULLABLE: 'Y' | 'N';
}
interface CommentRow {
  COLUMN_NAME: string;
  COMMENTS: string | null;
}
interface TabCommentRow {
  COMMENTS: string | null;
}
interface PkRow {
  COLUMN_NAME: string;
}

/** Oracle DATA_TYPE + 길이/정밀도 → 사람이 읽는 표기. */
function formatType(c: RawColumnRow): string {
  const { DATA_TYPE: t, DATA_LENGTH: len, DATA_PRECISION: p, DATA_SCALE: s } = c;
  if (t === 'NUMBER') {
    if (p == null) return 'NUMBER';
    return (s ?? 0) > 0 ? `NUMBER(${p},${s})` : `NUMBER(${p})`;
  }
  if (t === 'VARCHAR2' || t === 'CHAR' || t === 'NVARCHAR2' || t === 'NCHAR') {
    return `${t}(${len})`;
  }
  return t;
}

async function runQuery<T>(
  profile: string | undefined,
  sql: string,
  binds: oracledb.BindParameters,
): Promise<T[]> {
  if (profile && profile !== 'default') {
    return executeQueryByProfile<T>(profile, sql, binds);
  }
  return executeQuery<T>(sql, binds);
}

/**
 * 테이블 하나의 스키마를 DB에서 긁어 `CachedTableSchema` 형태로 반환.
 * 테이블이 없으면 null.
 */
export async function fetchTableSchemaFromDb(
  tableName: string,
  profile?: string,
): Promise<CachedTableSchema | null> {
  const upper = tableName.toUpperCase();

  const cols = await runQuery<RawColumnRow>(
    profile,
    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE, NULLABLE
       FROM USER_TAB_COLUMNS
      WHERE TABLE_NAME = :t
      ORDER BY COLUMN_ID`,
    { t: upper },
  );
  if (cols.length === 0) return null;

  const [cmtRows, tabCmtRows, pkRows] = await Promise.all([
    runQuery<CommentRow>(
      profile,
      `SELECT COLUMN_NAME, COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t`,
      { t: upper },
    ),
    runQuery<TabCommentRow>(
      profile,
      `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`,
      { t: upper },
    ),
    runQuery<PkRow>(
      profile,
      `SELECT cols.COLUMN_NAME
         FROM USER_CONSTRAINTS c
         JOIN USER_CONS_COLUMNS cols ON c.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
        WHERE c.TABLE_NAME = :t AND c.CONSTRAINT_TYPE = 'P'
        ORDER BY cols.POSITION`,
      { t: upper },
    ),
  ]);

  const cmap = new Map<string, string | null>();
  for (const r of cmtRows) cmap.set(r.COLUMN_NAME, r.COMMENTS);

  const columns: CachedColumn[] = cols.map((c) => ({
    name: c.COLUMN_NAME,
    type: formatType(c),
    nullable: c.NULLABLE === 'Y',
    comment: cmap.get(c.COLUMN_NAME) ?? null,
    // ISYS_DUAL_LANGUAGE 매핑은 v2로 보류 (types.ts 주석 참조).
    labels: {},
  }));

  return {
    tableComment: tabCmtRows[0]?.COMMENTS ?? null,
    pkColumns: pkRows.map((r) => r.COLUMN_NAME),
    refreshedAt: new Date().toISOString(),
    columns,
  };
}

/**
 * 여러 테이블을 순차적으로 긁어 객체 맵으로 반환. DB 커넥션 수를 절약하기 위해 순차.
 * Phase 3의 syncFromDb 가 호출.
 */
export async function fetchManyTableSchemasFromDb(
  tableNames: string[],
  profile?: string,
): Promise<Record<string, CachedTableSchema>> {
  const out: Record<string, CachedTableSchema> = {};
  for (const name of tableNames) {
    const schema = await fetchTableSchemaFromDb(name, profile);
    if (schema) out[name.toUpperCase()] = schema;
  }
  return out;
}
