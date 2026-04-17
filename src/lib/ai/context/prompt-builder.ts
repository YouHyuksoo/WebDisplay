/**
 * @file src/lib/ai/context/prompt-builder.ts
 * @description Builds stage-specific system prompts for SQL generation and analysis.
 */

import {
  CORE_GLOSSARY,
  CORE_SQL_IDENTITY_PROMPT,
  CORE_ANALYSIS_IDENTITY_PROMPT,
} from './domain-glossary';
import { SQL_RULES } from './sql-rules';
import { listTerms, formatTermsForPrompt } from './glossary-store';
import { getSchema } from '@/lib/ai/schema-context';
import type { SiteKey } from '@/lib/ai-tables/types';

/**
 * schema-cache.json 기반 fallback 섹션.
 * Stage 0 선택이 실패하여 selectedContextDocs 가 비었을 때만 사용.
 * SCHEMA const 제거(Phase 4) 이후 전용 진입점.
 */
async function buildSchemaFallbackSection(
  site: SiteKey,
  selectedTables?: string[],
): Promise<string> {
  const schema = await getSchema(site);
  const names =
    selectedTables && selectedTables.length > 0
      ? selectedTables.filter((t) => schema[t])
      : Object.keys(schema);

  if (names.length === 0) {
    return '_(화이트리스트 테이블이 아직 등록되지 않았습니다.)_';
  }

  return names
    .map((tableName) => {
      const spec = schema[tableName];
      const cols = Object.entries(spec.columns)
        .map(
          ([name, c]) =>
            `| ${name} | ${c.type} | ${c.nullable ? 'Y' : 'N'} | ${c.comment ?? ''} |`,
        )
        .join('\n');
      return `## ${tableName}\n${spec.description}\n\n| 컬럼 | 타입 | NULL | 코멘트 |\n|---|---|---|---|\n${cols}`;
    })
    .join('\n\n');
}

export interface BuildPromptOpts {
  stage: 'sql_generation' | 'analysis';
  personaPrompt?: string;
  selectedTables?: string[];
  currentContext: { today: string; serverShift: 'A' | 'B'; userTz: string };
  customSqlPrompt?: string;
  customAnalysisPrompt?: string;
  selectedContextDocs?: string;
  selectedSite?: string;
}

export async function buildSystemPrompt(opts: BuildPromptOpts): Promise<string> {
  const sections: string[] = [];

  // 1) Core identity
  if (opts.stage === 'sql_generation') {
    sections.push(opts.customSqlPrompt || CORE_SQL_IDENTITY_PROMPT);
  } else {
    sections.push(opts.customAnalysisPrompt || CORE_ANALYSIS_IDENTITY_PROMPT);
  }

  // 2) Domain glossary
  sections.push('# 도메인 용어\n' + CORE_GLOSSARY);

  // 3) Dynamic glossary from DB
  const dynamicTerms = await listTerms({ topN: 30 });
  const formatted = formatTermsForPrompt(dynamicTerms);
  if (formatted) sections.push('# 추가 용어\n' + formatted);

  // 4) SQL rules for SQL generation only
  if (opts.stage === 'sql_generation') {
    sections.push('# SQL 규칙\n' + SQL_RULES);
  }

  // 5) Schema/context section for SQL generation only
  if (opts.stage === 'sql_generation') {
    if (opts.selectedContextDocs) {
      sections.push('# 관련 테이블/도메인 상세\n' + opts.selectedContextDocs);
    } else {
      const site = (opts.selectedSite ?? 'default') as SiteKey;
      sections.push(
        '# 사용 가능한 테이블\n' +
          (await buildSchemaFallbackSection(site, opts.selectedTables)),
      );
    }
  }

  // 6) Selected site info (only when non-default)
  if (opts.stage === 'sql_generation' && opts.selectedSite && opts.selectedSite !== 'default') {
    sections.push(`# DB 사이트\n현재 쿼리 대상 사이트: ${opts.selectedSite}`);
  }

  // 7) Current runtime context
  sections.push(
    `# 현재 시점\n- 작업일: ${opts.currentContext.today}\n` +
      `- 현재 시프트: ${opts.currentContext.serverShift}\n- 시간대: ${opts.currentContext.userTz}`,
  );

  // 8) Persona prompt should be prepended for analysis stage
  if (opts.stage === 'analysis' && opts.personaPrompt) {
    sections.unshift(opts.personaPrompt);
  }

  return sections.join('\n\n');
}
