/**
 * @file src/lib/ai-tables/prompt-renderer.ts
 * @description AI 주입용 compact 포맷 렌더.
 *
 * 초보자 가이드:
 * - 저장 구조(tables.json + schema-cache.json + column-domains.json)는 관리 편의를
 *   위해 장황하지만, LLM 주입 직전 이 모듈에서 압축 포맷으로 변환한다.
 *
 * 주요 함수:
 * - `renderCatalogForStage0` → 45개 테이블 한 줄씩 요약 (~1300 토큰)
 * - `renderTableForStage1`   → 선택된 테이블 하나의 compact 블록 (~500 토큰/테이블)
 */

import type {
  AiTablesFile,
  TableMeta,
  CachedTableSchema,
  ColumnDomain,
  SiteKey,
  ColumnDecode,
} from './types';
import { resolveColumn } from './domain-resolver';

/**
 * Stage 0 카탈로그 렌더.
 * enabled === true 인 테이블만 한 줄씩 출력.
 * 형식: `  TABLE_NAME: summary [tag1,tag2]`
 */
export function renderCatalogForStage0(
  tables: AiTablesFile,
  site: SiteKey,
): string {
  const siteTables = tables.sites[site]?.tables ?? {};
  const lines: string[] = [`${site}:`];
  for (const [name, meta] of Object.entries(siteTables)) {
    if (!meta.enabled) continue;
    const tagStr = meta.tags.length ? ` [${meta.tags.join(',')}]` : '';
    lines.push(`  ${name}: ${meta.summary ?? ''}${tagStr}`);
  }
  return lines.join('\n');
}

/**
 * Stage 1 테이블 compact 블록 렌더.
 * excludeFromPrompt=true 컬럼은 제외. 도메인 단위 제외는 별도 주석으로 표시.
 */
export function renderTableForStage1(
  tableName: string,
  meta: TableMeta,
  schema: CachedTableSchema,
  domains: ColumnDomain[],
): string {
  const resolved = schema.columns.map((c) => resolveColumn(c, meta, domains));
  const key = resolved.filter((r) => !r.excludeFromPrompt && r.priority === 'key');
  const common = resolved.filter(
    (r) => !r.excludeFromPrompt && r.priority === 'common',
  );
  const excludedDomainIds = new Set(
    resolved
      .filter((r) => r.excludeFromPrompt && r.domainId)
      .map((r) => r.domainId!),
  );
  const excludedIndividual = resolved
    .filter((r) => r.excludeFromPrompt && !r.domainId)
    .map((r) => r.name);

  const lines: string[] = [];
  const headline = `${tableName} (${schema.tableComment ?? meta.summary ?? ''})`;
  lines.push(
    meta.tags.length ? `${headline}  # tags=${meta.tags.join(',')}` : headline,
  );
  if (meta.keywords?.length) {
    lines.push(`keywords: ${meta.keywords.join(', ')}`);
  }
  if (schema.pkColumns.length) {
    lines.push(`PK: ${schema.pkColumns.join(', ')}`);
  }

  if (key.length) {
    lines.push('key:');
    for (const c of key) {
      const decodeStr = formatDecode(c.decode);
      const decodePart = decodeStr ? `  ${decodeStr}` : '';
      const hintPart = c.hint ? `  # ${c.hint}` : '';
      lines.push(`  ${c.name}${decodePart}${hintPart}`);
    }
  }
  if (common.length) {
    lines.push(`common: ${common.map((c) => c.name).join(', ')}`);
  }

  if (meta.defaultFilters?.length) {
    lines.push(
      `default_filters: ${meta.defaultFilters.map((f) => f.sql).join(' AND ')}`,
    );
  }
  if (meta.joinPatterns?.length) {
    lines.push('joins:');
    for (const j of meta.joinPatterns) {
      lines.push(
        `  ${tableName} a JOIN ${j.withTable} b ON ${j.onClause}  # ${j.purpose}`,
      );
    }
  }

  if (excludedDomainIds.size) {
    lines.push(`# excluded domains: ${[...excludedDomainIds].join(', ')}`);
  }
  if (excludedIndividual.length) {
    lines.push(`# excluded cols: ${excludedIndividual.join(', ')}`);
  }

  if (meta.examples.length) {
    lines.push('ex:');
    for (const ex of meta.examples.slice(0, 3)) {
      lines.push(`  [${ex.kind}] Q: ${ex.question}`);
      if (ex.sql) lines.push(`    SQL: ${ex.sql.replace(/\n/g, ' ')}`);
      if (ex.sqlTemplate)
        lines.push(`    SQL: ${ex.sqlTemplate.replace(/\n/g, ' ')}`);
    }
  }

  return lines.join('\n');
}

/** decode 전략을 한 줄 표기로. Stage 1 프롬프트에 직접 삽입된다. */
function formatDecode(d: ColumnDecode): string {
  switch (d.kind) {
    case 'basecode':
      return `basecode('${d.codeType}')`;
    case 'enum': {
      const pairs = Object.entries(d.values)
        .map(([k, v]) => `${k}→${v}`)
        .join('|');
      return `enum{${pairs}}`;
    }
    case 'master':
      return `master(${d.table}.${d.keyCol}→${d.valCol})`;
    case 'flag':
      return `flag(${d.trueValue}/${d.falseValue ?? 'else'})`;
    case 'date':
      return `date${d.format ? `(${d.format})` : ''}`;
    case 'raw':
    default:
      return '';
  }
}
