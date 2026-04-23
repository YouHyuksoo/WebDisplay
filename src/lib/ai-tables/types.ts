/**
 * @file src/lib/ai-tables/types.ts
 * @description schema-cache.json 타입 정의. WIKI 전환 후 남은 최소 타입.
 *
 * 초보자 가이드:
 * - 구 tables.json / column-domains.json / basecode-cache.json 타입은 삭제됨.
 * - 현재는 schema-cache.json (DB 스키마 스냅샷) 구조만 정의.
 * - 함수·프로시저 메타는 `db-object-extractor.ts` 내부에 자체 interface 로.
 */

/** 지원 사이트 — config/database.json 의 profiles 이름과 일치. */
export type SiteKey = 'default' | '멕시코전장내부' | '멕시코VD외부' | '베트남VD외부';

// ────────────────────────────────────────────────────────────────────────────
// schema-cache.json
// ────────────────────────────────────────────────────────────────────────────

export interface SchemaCacheFile {
  version: 1;
  refreshedAt: string;
  sites: Record<SiteKey, { tables: Record<string, CachedTableSchema> }>;
}

export interface CachedTableSchema {
  tableComment: string | null;
  pkColumns: string[];
  columns: CachedColumn[];
  refreshedAt: string;
}

export interface CachedColumn {
  name: string;
  type: string; // 'VARCHAR2(50)' 가공 완료
  nullable: boolean;
  comment: string | null;
  /** ISYS_DUAL_LANGUAGE 라벨. 현재 비어 있을 수 있음. */
  labels: { ko?: string; en?: string; es?: string };
}
