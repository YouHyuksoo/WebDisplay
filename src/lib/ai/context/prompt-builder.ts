/**
 * @file src/lib/ai/context/prompt-builder.ts
 * @description Stage(sql_generation/analysis)별 시스템 프롬프트를 3계층 조립.
 *
 * 초보자 가이드:
 * - 매 LLM 호출마다 호출 → 글로서리 변경 즉시 반영
 * - Stage 1(SQL): 도메인 + 규칙 + 스키마 + 컨텍스트
 * - Stage 2(Analysis): 페르소나 prepend + 분석 정체성
 */

import {
  CORE_GLOSSARY,
  CORE_SQL_IDENTITY_PROMPT,
  CORE_ANALYSIS_IDENTITY_PROMPT,
} from './domain-glossary';
import { SQL_RULES } from './sql-rules';
import { listTerms, formatTermsForPrompt } from './glossary-store';
import { buildSchemaSection } from '@/lib/ai/schema-context';

export interface BuildPromptOpts {
  stage: 'sql_generation' | 'analysis';
  personaPrompt?: string;
  selectedTables?: string[];
  currentContext: { today: string; serverShift: 'A' | 'B'; userTz: string };
  customSqlPrompt?: string;
  customAnalysisPrompt?: string;
}

export async function buildSystemPrompt(opts: BuildPromptOpts): Promise<string> {
  const sections: string[] = [];

  // 1. 코어 정체성 (커스텀 우선, 없으면 기본)
  if (opts.stage === 'sql_generation') {
    sections.push(opts.customSqlPrompt || CORE_SQL_IDENTITY_PROMPT);
  } else {
    sections.push(opts.customAnalysisPrompt || CORE_ANALYSIS_IDENTITY_PROMPT);
  }

  // 2. 도메인 용어사전 (코드 상수 — 항상)
  sections.push('# 도메인 용어\n' + CORE_GLOSSARY);

  // 3. 동적 용어 (DB AI_GLOSSARY_TERM)
  const dynamicTerms = await listTerms({ topN: 30 });
  const formatted = formatTermsForPrompt(dynamicTerms);
  if (formatted) sections.push('# 추가 용어\n' + formatted);

  // 4. SQL 규칙 (Stage 1만)
  if (opts.stage === 'sql_generation') {
    sections.push('# SQL 규칙\n' + SQL_RULES);
  }

  // 5. 화이트리스트 스키마 (Stage 1만)
  if (opts.stage === 'sql_generation') {
    sections.push('# 사용 가능한 테이블\n' + buildSchemaSection(opts.selectedTables));
  }

  // 6. 현재 컨텍스트
  sections.push(
    `# 현재 시점\n- 작업일: ${opts.currentContext.today}\n` +
      `- 현재 시프트: ${opts.currentContext.serverShift}\n- 시간대: ${opts.currentContext.userTz}`,
  );

  // 7. 페르소나 (Stage 2만, 맨 앞에 prepend)
  if (opts.stage === 'analysis' && opts.personaPrompt) {
    sections.unshift(opts.personaPrompt);
  }

  return sections.join('\n\n');
}
