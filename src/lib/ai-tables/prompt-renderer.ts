/**
 * @file src/lib/ai-tables/prompt-renderer.ts
 * @description Stage 0 카탈로그 렌더링.
 *
 * 초보자 가이드:
 * - Stage 1(SQL 생성 단계 테이블 상세) 은 WIKI MD 본문을 prompt-builder 가 직접 주입하므로 별도 렌더링 불필요.
 * - 이 모듈은 Stage 0 (테이블 선별 단계) 카탈로그 한 줄 요약만 담당.
 */

import type {
  CachedTableSchema,
  SiteKey,
  SchemaCacheFile,
} from './types';

/**
 * Stage 0 카탈로그 렌더. schema-cache 의 전체 테이블을 대상.
 * 형식: `  TABLE_NAME: {category} summary [tag1,tag2] cols(PK*,COL_A,...)`
 *
 * 우선순위:
 *   1. WIKI MD 에 등록된 테이블 → frontmatter summary/tags/category 우선
 *   2. 없으면 schema.tableComment
 */
export function renderCatalogForStage0(
  schema: SchemaCacheFile,
  site: SiteKey,
  options?: {
    wikiTables?: Record<string, { fm: Record<string, unknown>; body: string }>;
    /** 지정된 테이블만 렌더링 (prefilter 결과 주입용). 미지정이면 전체. */
    onlyNames?: string[];
  },
): string {
  const siteSchema = schema.sites[site]?.tables ?? {};
  const wikiTables = options?.wikiTables ?? {};

  const lines: string[] = [`${site}:`];
  const names = options?.onlyNames
    ? options.onlyNames.filter((n) => siteSchema[n])
    : Object.keys(siteSchema).sort();

  for (const name of names) {
    const schemaMeta = siteSchema[name];
    const wikiMd = wikiTables[name];

    const rawSummary =
      pickWikiSummary(wikiMd) ?? schemaMeta.tableComment ?? '';
    const summary = trimSummary(rawSummary);

    const category = wikiMd?.fm?.category as string | undefined;
    const catStr = category ? ` {${category}}` : '';

    const tags = Array.isArray(wikiMd?.fm?.tags)
      ? (wikiMd.fm.tags as string[])
      : [];
    const tagStr = tags.length ? ` [${tags.join(',')}]` : '';

    const colsPart = buildColsPreview(schemaMeta);

    lines.push(`  ${name}:${catStr} ${summary}${tagStr}${colsPart}`);
  }
  return lines.join('\n');
}

/**
 * Stage 0 summary 축약. tableComment 의 ` | PB화면: ...` 같은 잔재 제거 + 120자 컷.
 */
function trimSummary(s: string): string {
  if (!s) return '';
  let trimmed = s;
  const pipeIdx = trimmed.indexOf(' | ');
  if (pipeIdx > 0) trimmed = trimmed.slice(0, pipeIdx);
  if (trimmed.length > 120) trimmed = trimmed.slice(0, 117) + '...';
  return trimmed.trim();
}

/**
 * WIKI MD frontmatter summary 또는 "## 개요" 첫 줄을 사용.
 */
function pickWikiSummary(
  wikiMd: { fm: Record<string, unknown>; body: string } | undefined,
): string | undefined {
  if (!wikiMd) return undefined;
  const fmSummary = wikiMd.fm.summary;
  if (typeof fmSummary === 'string' && fmSummary.trim()) return fmSummary.trim();

  const match = wikiMd.body.match(/##\s*개요\s*\n([^\n]+)/);
  if (match) {
    const firstLine = match[1].trim();
    if (firstLine && !firstLine.startsWith('(')) return firstLine;
  }
  return undefined;
}

/**
 * Stage 0 용 컬럼 미리보기: PK(표식 *) + 물리 순서 상위 컬럼. 최대 6개.
 * LLM 이 "이 테이블에 LINE_CODE 가 있나" 수준 판단 가능하도록 핵심 컬럼 앞쪽에.
 */
function buildColsPreview(tSchema: CachedTableSchema | undefined): string {
  if (!tSchema) return '';
  const pkSet = new Set(tSchema.pkColumns);
  const preview: string[] = tSchema.pkColumns.map((pk) => `${pk}*`);

  for (const col of tSchema.columns) {
    if (preview.length >= 6) break;
    if (pkSet.has(col.name)) continue;
    preview.push(col.name);
  }

  return preview.length ? ` cols(${preview.join(',')})` : '';
}
