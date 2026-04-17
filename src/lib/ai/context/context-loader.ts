/**
 * @file src/lib/ai/context/context-loader.ts
 * @description AI 챗 컨텍스트 로더 (Phase 4 이후 신규 ai-tables 런타임 래퍼).
 *
 * 초보자 가이드:
 * - `loadCatalog()` / `catalogToPrompt()` 는 `data/ai-context/tables.json`
 *   (+ schema-cache.json / column-domains.json) 을 읽어 기존 Catalog 형태로 변환한다.
 * - `loadSelectedContext()` 는 Phase 4 에서 레거시 MD 로더를 제거하고
 *   `buildStage1Prompt(site, tables)` 로 완전히 치환됐다.
 * - 외부 시그니처 호환: 모든 함수는 `async` 이며, 시그니처 유지 목적으로
 *   여기에 얇은 래퍼만 둔다. 신규 코드는 가급적 `@/lib/ai-tables/merged-context`
 *   를 직접 사용할 것.
 */
import { loadTables } from '@/lib/ai-tables/store';
import {
  buildStage0Prompt,
  buildStage1Prompt,
} from '@/lib/ai-tables/merged-context';
import type { SiteKey } from '@/lib/ai-tables/types';

export interface CatalogTable {
  name: string;
  site: string;
  summary: string;
  tags: string[];
}

export interface CatalogDomain {
  name: string;
  summary: string;
  tags: string[];
}

export interface CatalogSite {
  key: string;
  description: string;
  note: string;
}

export interface Catalog {
  tables: CatalogTable[];
  domains: CatalogDomain[];
  sites: CatalogSite[];
}

/**
 * 신규 `tables.json` 을 읽어 기존 `Catalog` 형태로 변환 반환.
 * enabled === false 인 테이블은 자동 제외 → 호출부에서 별도 필터 불필요.
 * domains 는 과도기적으로 빈 배열 (column-domains 는 Stage 1 렌더에서 흡수됨).
 */
export async function loadCatalog(): Promise<Catalog> {
  const tables = await loadTables();

  const catTables: CatalogTable[] = [];
  const siteKeys = new Set<string>();

  for (const [site, st] of Object.entries(tables.sites)) {
    siteKeys.add(site);
    for (const [name, meta] of Object.entries(st.tables)) {
      if (!meta.enabled) continue;
      catTables.push({
        name,
        site,
        summary: meta.summary ?? '',
        tags: meta.tags ?? [],
      });
    }
  }

  // sites: tables.json 에 실제로 등장한 site 만 반환. default 는 항상 포함.
  siteKeys.add('default');
  const sites: CatalogSite[] = [...siteKeys].map((key) => ({
    key,
    description: key === 'default' ? '기본 사이트' : key,
    note: '',
  }));

  return { tables: catTables, domains: [], sites };
}

/** 메모리 캐시 초기화 — invalidate 대체용 외부 인터페이스. */
export function resetCatalogCache(): void {
  // store.ts 의 invalidateTablesCache 로 위임.
  // 순환 참조 피하기 위해 동적 import (런타임 비용 거의 0).
  void import('@/lib/ai-tables/store').then((m) => m.invalidateTablesCache());
}

/**
 * Stage 0 프롬프트 문자열. 내부적으로 compact 포맷을 사용한다.
 * @param site 대상 사이트 키. 미지정 시 'default'.
 */
export async function catalogToPrompt(
  site: SiteKey = 'default',
): Promise<string> {
  return buildStage0Prompt(site);
}

/**
 * 선택된 테이블들의 compact 컨텍스트 블록 반환.
 * `/ai-chat` stream route 에서 Stage 1 SQL 생성 프롬프트 보강에 사용.
 *
 * Phase 4 이후: 내부적으로 `buildStage1Prompt` 를 호출. 레거시 tables/*.md
 * 읽기는 삭제됨. `domains` 파라미터는 column-domains 가 Stage 1 렌더러
 * (resolveColumn) 에서 자동 흡수되므로 무시된다 (호출부 호환을 위해 유지).
 *
 * @param tables 선택된 테이블명 배열
 * @param _domains (deprecated) column-domains 는 자동 흡수됨 — 사용 안 함
 * @param site 사이트 키. 미지정 시 'default'.
 */
export async function loadSelectedContext(
  tables: string[],
  _domains: string[] = [],
  site: SiteKey = 'default',
): Promise<string> {
  if (!tables.length) return '';
  return buildStage1Prompt(site, tables);
}
