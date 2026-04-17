/**
 * @file src/lib/ai-tables/merged-context.ts
 * @description tables.json + schema-cache + domains 3개 파일을 병합해
 *   `/ai-chat` context-loader에 제공하는 상위 API.
 *
 * 초보자 가이드:
 * - `loadMergedContext()`: 3파일을 병렬로 읽어 한 번에 반환.
 * - `buildStage0Prompt()`: Stage 0 (선택기) 프롬프트 문자열.
 * - `buildStage1Prompt()`: Stage 1 (SQL 생성) 프롬프트 문자열.
 *
 * 이 모듈은 기존 `src/lib/ai/context/context-loader.ts` 의
 * `loadCatalog()` + `catalogToPrompt()` 를 대체하되, 외부 시그니처는
 * context-loader.ts 쪽에서 호환 래퍼로 유지한다 (Phase 2 요건).
 */

import { loadTables, loadDomains } from './store';
import { loadSchemaCache } from './schema-loader';
import {
  renderCatalogForStage0,
  renderTableForStage1,
} from './prompt-renderer';
import type { SiteKey } from './types';

/** 3파일 병렬 로드 결과 묶음. */
export async function loadMergedContext(site: SiteKey = 'default') {
  const [tables, domains, schema] = await Promise.all([
    loadTables(),
    loadDomains(),
    loadSchemaCache(),
  ]);
  return { tables, domains, schema, site };
}

/** Stage 0 프롬프트: 테이블 카탈로그 한 줄씩. */
export async function buildStage0Prompt(
  site: SiteKey = 'default',
): Promise<string> {
  const { tables } = await loadMergedContext(site);
  return renderCatalogForStage0(tables, site);
}

/**
 * Stage 1 프롬프트: 선택된 테이블들의 compact 블록을 이어 붙임.
 * enabled=false 또는 schema-cache 에 없는 테이블은 조용히 스킵.
 */
export async function buildStage1Prompt(
  site: SiteKey,
  tableNames: string[],
): Promise<string> {
  const { tables, domains, schema } = await loadMergedContext(site);
  const blocks: string[] = [];
  for (const name of tableNames) {
    const meta = tables.sites[site]?.tables[name];
    const sch = schema.sites[site]?.tables[name];
    if (!meta || !sch || !meta.enabled) continue;
    blocks.push(renderTableForStage1(name, meta, sch, domains.domains));
  }
  return blocks.join('\n\n');
}
