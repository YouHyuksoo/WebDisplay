/**
 * @file src/lib/ai-tables/merged-context.ts
 * @description Stage 0 프롬프트 빌더. schema-cache + WIKI MD 기반.
 *
 * 초보자 가이드:
 * - Stage 1 은 prompt-builder 가 WIKI MD 본문을 직접 주입 — 이 모듈은 Stage 0 만 담당.
 * - query 가 주어지면 로컬 prefilter 로 상위 topN 테이블만 렌더링.
 */

import { loadSchemaCache } from './schema-loader';
import { renderCatalogForStage0 } from './prompt-renderer';
import type { SiteKey } from './types';

/**
 * Stage 0 프롬프트.
 *   query 가 주어지면 로컬 prefilter 로 상위 topN 테이블만 렌더링.
 *   query 없거나 prefilter 매칭 0개면 "사용함" 테이블 전체 fallback,
 *   "사용함" 도 0개면 schema 전체 fallback.
 */
export async function buildStage0Prompt(
  site: SiteKey = 'default',
  opts: { query?: string; topN?: number } = {},
): Promise<string> {
  const schema = await loadSchemaCache();
  const { loadAiChatContext } = await import('@/lib/ai/context/md-loader');
  const { prefilterTables } = await import('./table-prefilter');
  const ctx = await loadAiChatContext();

  const wikiTables: Record<
    string,
    { fm: Record<string, unknown>; body: string }
  > = {};
  for (const [objectName, md] of Object.entries(ctx.tables)) {
    wikiTables[objectName] = { fm: md.fm, body: md.body };
  }

  // "사용함" 테이블 집합 — md-loader 가 이미 enabled=true 만 로드.
  const enabledOnly = new Set(Object.keys(ctx.tables));

  let onlyNames: string[] | undefined;
  if (opts.query) {
    const pref = prefilterTables({
      query: opts.query,
      site,
      schema,
      wikiTables,
      topN: opts.topN ?? 30,
      enabledOnly: enabledOnly.size > 0 ? enabledOnly : undefined,
    });
    if (pref.tables.length > 0) {
      onlyNames = pref.tables;
    } else if (enabledOnly.size > 0) {
      // 사용함은 있는데 키워드 매칭 실패 → 사용함 전체로 fallback
      onlyNames = [...enabledOnly];
    }
    // 사용함 0개 + 매칭 0개 → onlyNames undefined → schema 전체 fallback
  } else if (enabledOnly.size > 0) {
    onlyNames = [...enabledOnly];
  }

  return renderCatalogForStage0(schema, site, { wikiTables, onlyNames });
}
