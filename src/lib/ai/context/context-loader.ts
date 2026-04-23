/**
 * @file src/lib/ai/context/context-loader.ts
 * @description Stage 0 카탈로그 로더. WIKI + schema-cache 기반.
 *
 * 초보자 가이드:
 * - `loadCatalog()`: 테이블 선택기(heuristic/LLM) 가 사용할 후보 목록.
 *   - schema-cache.json 의 모든 테이블이 후보 풀.
 *   - WIKI MD 등록된 테이블은 더 풍부한 summary·tags 를 MD 에서 우선.
 * - `catalogToPrompt()`: Stage 0 LLM 에게 보여줄 프롬프트 문자열.
 *   - query 주면 로컬 prefilter 로 상위 30개만 렌더링.
 */

import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import { loadAiChatContext } from '@/lib/ai/context/md-loader';
import { buildStage0Prompt } from '@/lib/ai-tables/merged-context';
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
 * schema-cache.json 의 **전체 테이블**을 후보 풀로.
 * WIKI MD 에 등록된 테이블은 summary·tags 를 MD frontmatter 에서 우선 사용.
 */
export async function loadCatalog(): Promise<Catalog> {
  const [schema, ctx] = await Promise.all([
    loadSchemaCache(),
    loadAiChatContext(),
  ]);

  const catTables: CatalogTable[] = [];
  const siteKeys = new Set<string>();

  for (const [site, siteData] of Object.entries(schema.sites)) {
    siteKeys.add(site);
    for (const [name, schemaMeta] of Object.entries(siteData.tables)) {
      const wikiMd = ctx.tables[name];
      const fmSummary =
        typeof wikiMd?.fm.summary === 'string'
          ? (wikiMd.fm.summary as string).trim()
          : undefined;
      const summary = fmSummary || schemaMeta.tableComment || '';

      const tags = Array.isArray(wikiMd?.fm.tags)
        ? (wikiMd.fm.tags as string[])
        : [];

      catTables.push({ name, site, summary, tags });
    }
  }

  siteKeys.add('default');
  const sites: CatalogSite[] = [...siteKeys].map((key) => ({
    key,
    description: key === 'default' ? '기본 사이트' : key,
    note: '',
  }));

  return { tables: catTables, domains: [], sites };
}

/**
 * Stage 0 프롬프트 문자열.
 * @param site 대상 사이트 키.
 * @param query 사용자 질의 — 주어지면 로컬 prefilter 로 상위 30개만 렌더링.
 */
export async function catalogToPrompt(
  site: SiteKey = 'default',
  query?: string,
): Promise<string> {
  return buildStage0Prompt(site, { query });
}
