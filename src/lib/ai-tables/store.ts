/**
 * @file src/lib/ai-tables/store.ts
 * @description tables.json / column-domains.json 읽기·쓰기 + 메모리 캐시 + 파일 락.
 *
 * 초보자 가이드:
 * - `loadTables()`, `loadDomains()`는 첫 호출 시 파일을 읽어 메모리에 캐시한다.
 * - 캐시 무효화는 `invalidate*Cache()` 호출 또는 `save*()` 후 자동.
 * - `save*()`는 updatedAt을 자동 갱신하고 withLock으로 직렬화한다.
 * - 이 파일은 `/ai-chat` 런타임과 `/settings/ai-tables` CRUD 양쪽에서 모두 사용된다.
 */

import fs from 'fs/promises';
import { PATHS } from './paths';
import { withLock } from './mutex';
import type { AiTablesFile, ColumnDomainsFile } from './types';

let _tablesCache: AiTablesFile | null = null;
let _domainsCache: ColumnDomainsFile | null = null;

/** tables.json 로드 (메모리 캐시). */
export async function loadTables(): Promise<AiTablesFile> {
  if (_tablesCache) return _tablesCache;
  const raw = await fs.readFile(PATHS.tablesJson, 'utf-8');
  _tablesCache = JSON.parse(raw) as AiTablesFile;
  return _tablesCache;
}

/** tables.json 저장 + updatedAt 갱신 + 캐시 갱신. */
export async function saveTables(data: AiTablesFile): Promise<void> {
  await withLock(PATHS.tablesJson, async () => {
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(PATHS.tablesJson, JSON.stringify(data, null, 2), 'utf-8');
    _tablesCache = data;
  });
}

/** tables.json 메모리 캐시 무효화. 파일을 외부에서 수정했을 때 호출. */
export function invalidateTablesCache(): void {
  _tablesCache = null;
}

/** column-domains.json 로드 (메모리 캐시). */
export async function loadDomains(): Promise<ColumnDomainsFile> {
  if (_domainsCache) return _domainsCache;
  const raw = await fs.readFile(PATHS.columnDomains, 'utf-8');
  _domainsCache = JSON.parse(raw) as ColumnDomainsFile;
  return _domainsCache;
}

/** column-domains.json 저장 + updatedAt 갱신 + 캐시 갱신. */
export async function saveDomains(data: ColumnDomainsFile): Promise<void> {
  await withLock(PATHS.columnDomains, async () => {
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(PATHS.columnDomains, JSON.stringify(data, null, 2), 'utf-8');
    _domainsCache = data;
  });
}

/** column-domains.json 메모리 캐시 무효화. */
export function invalidateDomainsCache(): void {
  _domainsCache = null;
}
