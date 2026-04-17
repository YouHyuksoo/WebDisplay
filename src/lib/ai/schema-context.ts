/**
 * @file src/lib/ai/schema-context.ts
 * @description Phase 4 이후 런타임 전용 스키마 API 래퍼.
 *
 * 초보자 가이드:
 * - 과거 이 파일은 1494줄짜리 하드코딩 `SCHEMA` const 를 포함했었다. Phase 4 에서
 *   해당 const 는 제거됐고, 모든 스키마는 런타임에 `data/ai-context/schema-cache.json`
 *   에서 동적으로 로드된다 (`@/lib/ai-tables/schema-loader`).
 * - 기존 호출부가 의존하던 `ColumnSpec` / `TableSpec` 타입은 Stage 1 컴패트 포맷
 *   렌더러 등과의 형 호환을 위해 그대로 유지한다.
 * - 신규 코드는 가급적 `@/lib/ai-tables/schema-loader` 를 직접 사용할 것.
 */

import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

export interface ColumnSpec {
  type: string;
  nullable: boolean;
  comment: string | null;
}

export interface TableSpec {
  description: string;
  columns: Record<string, ColumnSpec>;
  sampleQueries?: string[];
  enums?: Record<string, Record<string, string>>;
}

/**
 * 런타임에 `data/ai-context/schema-cache.json` 에서 동적으로 스키마를 가져온다.
 * 반환 형태는 과거 `SCHEMA` const 와 동일한 `Record<테이블명, TableSpec>` — 호환 유지.
 *
 * @param site 사이트 키 (default | 멕시코전장내부 | ...)
 */
export async function getSchema(
  site: SiteKey = 'default',
): Promise<Record<string, TableSpec>> {
  const cache = await loadSchemaCache();
  const siteTables = cache.sites[site]?.tables ?? {};
  const out: Record<string, TableSpec> = {};
  for (const [name, ts] of Object.entries(siteTables)) {
    out[name] = {
      description: ts.tableComment ?? '',
      columns: Object.fromEntries(
        ts.columns.map((c) => [
          c.name,
          { type: c.type, nullable: c.nullable, comment: c.comment },
        ]),
      ),
    };
  }
  return out;
}
