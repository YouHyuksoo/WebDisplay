/**
 * @file src/lib/ai/context/glossary-store.ts
 * @description AI_GLOSSARY_TERM 테이블 CRUD + LLM에 주입할 마크다운 포매팅.
 *
 * 초보자 가이드:
 * - listTerms(topN): 우선순위 높은 상위 N개 — 시스템 프롬프트에 주입
 * - createTerm/updateTerm/deleteTerm: 설정 페이지에서 호출
 */

import { executeQuery, executeDml } from '@/lib/db';
import { randomUUID } from 'crypto';
import type oracledb from 'oracledb';

export interface GlossaryTerm {
  termId:     string;
  category:   'abbreviation' | 'code' | 'rule' | 'example';
  term:       string;
  definition: string;
  exampleSql: string | null;
  priority:   number;
  isActive:   boolean;
  createdAt:  string;
  updatedAt:  string | null;
}

interface DbRow {
  TERM_ID: string;
  CATEGORY: string;
  TERM: string;
  DEFINITION: string;
  EXAMPLE_SQL: string | null;
  PRIORITY: number;
  IS_ACTIVE: number;
  CREATED_AT: Date;
  UPDATED_AT: Date | null;
}

function rowToTerm(r: DbRow): GlossaryTerm {
  return {
    termId: r.TERM_ID,
    category: r.CATEGORY as GlossaryTerm['category'],
    term: r.TERM,
    definition: r.DEFINITION,
    exampleSql: r.EXAMPLE_SQL,
    priority: r.PRIORITY,
    isActive: r.IS_ACTIVE === 1,
    createdAt: r.CREATED_AT.toISOString(),
    updatedAt: r.UPDATED_AT ? r.UPDATED_AT.toISOString() : null,
  };
}

export async function listTerms(opts: { topN?: number; activeOnly?: boolean } = {}): Promise<GlossaryTerm[]> {
  const topN = opts.topN ?? 100;
  const activeOnly = opts.activeOnly ?? true;
  const sql = `
    SELECT * FROM (
      SELECT TERM_ID, CATEGORY, TERM, DEFINITION, EXAMPLE_SQL, PRIORITY, IS_ACTIVE, CREATED_AT, UPDATED_AT
        FROM AI_GLOSSARY_TERM
       WHERE (:activeOnly = 0 OR IS_ACTIVE = 1)
       ORDER BY PRIORITY DESC, TERM
    ) WHERE ROWNUM <= :topN`;
  const rows = await executeQuery<DbRow>(sql, { topN, activeOnly: activeOnly ? 1 : 0 });
  return rows.map(rowToTerm);
}

export async function createTerm(input: Omit<GlossaryTerm, 'termId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const termId = `g_${randomUUID().slice(0, 8)}`;
  await executeDml(
    `INSERT INTO AI_GLOSSARY_TERM (TERM_ID,CATEGORY,TERM,DEFINITION,EXAMPLE_SQL,PRIORITY,IS_ACTIVE,CREATED_AT)
     VALUES (:termId,:category,:term,:definition,:exampleSql,:priority,:isActive,SYSTIMESTAMP)`,
    {
      termId, category: input.category, term: input.term,
      definition: input.definition, exampleSql: input.exampleSql,
      priority: input.priority, isActive: input.isActive ? 1 : 0,
    },
  );
  return termId;
}

export async function updateTerm(termId: string, input: Partial<Omit<GlossaryTerm, 'termId' | 'createdAt'>>): Promise<void> {
  const fields: string[] = [];
  const binds: oracledb.BindParameters = { termId };
  if (input.category !== undefined) { fields.push('CATEGORY = :category'); binds.category = input.category; }
  if (input.term !== undefined) { fields.push('TERM = :term'); binds.term = input.term; }
  if (input.definition !== undefined) { fields.push('DEFINITION = :definition'); binds.definition = input.definition; }
  if (input.exampleSql !== undefined) { fields.push('EXAMPLE_SQL = :exampleSql'); binds.exampleSql = input.exampleSql; }
  if (input.priority !== undefined) { fields.push('PRIORITY = :priority'); binds.priority = input.priority; }
  if (input.isActive !== undefined) { fields.push('IS_ACTIVE = :isActive'); binds.isActive = input.isActive ? 1 : 0; }
  if (fields.length === 0) return;
  fields.push('UPDATED_AT = SYSTIMESTAMP');
  await executeDml(`UPDATE AI_GLOSSARY_TERM SET ${fields.join(', ')} WHERE TERM_ID = :termId`, binds);
}

export async function deleteTerm(termId: string): Promise<void> {
  await executeDml('DELETE FROM AI_GLOSSARY_TERM WHERE TERM_ID = :termId', { termId });
}

/**
 * 시스템 프롬프트에 주입할 마크다운 포맷.
 */
export function formatTermsForPrompt(terms: GlossaryTerm[]): string {
  if (terms.length === 0) return '';
  const byCategory: Record<string, GlossaryTerm[]> = {};
  for (const t of terms) {
    (byCategory[t.category] ??= []).push(t);
  }
  const sections: string[] = [];
  for (const [cat, items] of Object.entries(byCategory)) {
    const lines = items.map((t) => `- **${t.term}**: ${t.definition}${t.exampleSql ? `\n  예: \`${t.exampleSql.replace(/\n+/g, ' ')}\`` : ''}`);
    sections.push(`### ${cat}\n${lines.join('\n')}`);
  }
  return sections.join('\n\n');
}
