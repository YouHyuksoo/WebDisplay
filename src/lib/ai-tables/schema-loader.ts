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
