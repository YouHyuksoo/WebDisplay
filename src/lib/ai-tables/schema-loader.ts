/**
 * @file src/lib/ai-tables/schema-loader.ts
 * @description schema-cache.json 읽기 전용 로더.
 *
 * 초보자 가이드:
 * - 쓰기는 `scripts/migrate-to-tables-json.mjs` 또는 Phase 3의 sync API에서 별도 처리.
 * - 런타임에서는 읽기만 하며, 메모리 캐시로 반복 읽기를 피한다.
 */

import fs from 'fs/promises';
import { PATHS } from './paths';
import { withLock } from './mutex';
import { executeQuery, executeQueryByProfile } from '@/lib/db';
import {
  fetchTableSchemaFromDb,
  fetchManyTableSchemasFromDb,
} from './db-schema';
import type { SchemaCacheFile, CachedTableSchema, SiteKey } from './types';

let _cache: SchemaCacheFile | null = null;

/** schema-cache.json 로드 (메모리 캐시). */
export async function loadSchemaCache(): Promise<SchemaCacheFile> {
  if (_cache) return _cache;
  const raw = await fs.readFile(PATHS.schemaCache, 'utf-8');
  _cache = JSON.parse(raw) as SchemaCacheFile;
  return _cache;
}

/** schema-cache.json 메모리 캐시 무효화. */
export function invalidateSchemaCache(): void {
  _cache = null;
}

/** 특정 사이트·테이블의 스키마 조회. 없으면 null. */
export async function getTableSchema(
  site: SiteKey,
  tableName: string,
): Promise<CachedTableSchema | null> {
  const cache = await loadSchemaCache();
  return cache.sites[site]?.tables[tableName] ?? null;
}

/** schema-cache.json을 디스크에 저장. Phase 3의 sync API가 사용. */
export async function saveSchemaCache(data: SchemaCacheFile): Promise<void> {
  data.refreshedAt = new Date().toISOString();
  await fs.writeFile(PATHS.schemaCache, JSON.stringify(data, null, 2), 'utf-8');
  _cache = data;
}

// ─────────────────────────────────────────────────────────────────────────────
// syncFromDb — schema-cache.json 전체 갱신 + 신규/제거/변경 테이블 diff 반환
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncDiff {
  added: string[];
  removed: string[];
  modified: Array<{
    table: string;
    columns: { added: string[]; removed: string[] };
  }>;
}

/**
 * 단일 테이블의 스키마를 DB에서 다시 긁어 schema-cache.json에 반영.
 * DDL로 주석을 바꾼 직후 부분 갱신에 사용한다.
 */
export async function syncSingleTable(
  site: SiteKey,
  tableName: string,
): Promise<CachedTableSchema | null> {
  const profile = site === 'default' ? undefined : site;
  const schema = await fetchTableSchemaFromDb(tableName, profile);
  if (!schema) return null;

  await withLock(PATHS.schemaCache, async () => {
    const cache = await loadSchemaCache();
    if (!cache.sites[site]) cache.sites[site] = { tables: {} };
    cache.sites[site].tables[tableName.toUpperCase()] = schema;
    cache.refreshedAt = new Date().toISOString();
    await fs.writeFile(
      PATHS.schemaCache,
      JSON.stringify(cache, null, 2),
      'utf-8',
    );
    _cache = cache;
  });

  return schema;
}

/**
 * 사이트 전체 테이블 목록을 DB와 동기화.
 * - USER_TABLES에서 현재 테이블 목록 조회
 * - 추가/삭제/컬럼 변경을 diff로 반환
 * - schema-cache.json은 withLock으로 원자적으로 갱신
 */
export async function syncFromDb(site: SiteKey): Promise<SyncDiff> {
  const profile = site === 'default' ? undefined : site;

  // 현재 DB 테이블 목록
  const runTables = async () =>
    profile
      ? await executeQueryByProfile<{ TABLE_NAME: string }>(
          profile,
          `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`,
          {},
        )
      : await executeQuery<{ TABLE_NAME: string }>(
          `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`,
          {},
        );
  const tableRows = await runTables();
  const currentTables = new Set(tableRows.map((r) => r.TABLE_NAME));

  const cache = await loadSchemaCache();
  const beforeSite = cache.sites[site]?.tables ?? {};
  const beforeTables = new Set(Object.keys(beforeSite));

  const added: string[] = [...currentTables].filter((n) => !beforeTables.has(n));
  const removed: string[] = [...beforeTables].filter((n) => !currentTables.has(n));
  const modified: SyncDiff['modified'] = [];

  // 전체 테이블 스키마 재조회 (작은 프로젝트 규모 — 수십 개)
  const freshSchemas = await fetchManyTableSchemasFromDb(
    [...currentTables],
    profile,
  );

  // 컬럼 단위 diff
  for (const tableName of currentTables) {
    const prev = beforeSite[tableName];
    const next = freshSchemas[tableName];
    if (!prev || !next) continue;
    const prevCols = new Set(prev.columns.map((c) => c.name));
    const nextCols = new Set(next.columns.map((c) => c.name));
    const colAdded = [...nextCols].filter((n) => !prevCols.has(n));
    const colRemoved = [...prevCols].filter((n) => !nextCols.has(n));
    if (colAdded.length || colRemoved.length) {
      modified.push({
        table: tableName,
        columns: { added: colAdded, removed: colRemoved },
      });
    }
  }

  await withLock(PATHS.schemaCache, async () => {
    const current = await loadSchemaCache();
    current.sites[site] = { tables: freshSchemas };
    current.refreshedAt = new Date().toISOString();
    await fs.writeFile(
      PATHS.schemaCache,
      JSON.stringify(current, null, 2),
      'utf-8',
    );
    _cache = current;
  });

  return { added, removed, modified };
}
