/**
 * @file src/lib/ai/context/glossary-store.ts
 * @description AI 용어사전 CRUD — data/ai-config.json 기반 + LLM 프롬프트 포매팅.
 *
 * 초보자 가이드:
 * - listTerms: 우선순위 높은 상위 N개 — 시스템 프롬프트에 주입
 * - createTerm/updateTerm/deleteTerm: 설정 페이지에서 호출
 * - formatTermsForPrompt: 마크다운 포맷으로 변환
 */

import { getAiConfig, saveAiConfig, type GlossaryTerm } from '@/lib/ai-config';
import { randomUUID } from 'crypto';

export type { GlossaryTerm };

export async function listTerms(opts: { topN?: number; activeOnly?: boolean } = {}): Promise<GlossaryTerm[]> {
  const topN = opts.topN ?? 100;
  const activeOnly = opts.activeOnly ?? true;
  const config = await getAiConfig();
  let list = config.glossary;
  if (activeOnly) list = list.filter((t) => t.isActive);
  list.sort((a, b) => b.priority - a.priority || a.term.localeCompare(b.term));
  return list.slice(0, topN);
}

export async function createTerm(input: Omit<GlossaryTerm, 'termId'>): Promise<string> {
  const config = await getAiConfig();
  const termId = `g_${randomUUID().slice(0, 8)}`;
  config.glossary.push({ termId, ...input });
  await saveAiConfig(config);
  return termId;
}

export async function updateTerm(termId: string, input: Partial<Omit<GlossaryTerm, 'termId'>>): Promise<void> {
  const config = await getAiConfig();
  const t = config.glossary.find((x) => x.termId === termId);
  if (!t) return;
  if (input.category !== undefined) t.category = input.category;
  if (input.term !== undefined) t.term = input.term;
  if (input.definition !== undefined) t.definition = input.definition;
  if (input.exampleSql !== undefined) t.exampleSql = input.exampleSql;
  if (input.priority !== undefined) t.priority = input.priority;
  if (input.isActive !== undefined) t.isActive = input.isActive;
  await saveAiConfig(config);
}

export async function deleteTerm(termId: string): Promise<void> {
  const config = await getAiConfig();
  config.glossary = config.glossary.filter((x) => x.termId !== termId);
  await saveAiConfig(config);
}

export function formatTermsForPrompt(terms: GlossaryTerm[]): string {
  if (terms.length === 0) return '';
  const byCategory: Record<string, GlossaryTerm[]> = {};
  for (const t of terms) {
    (byCategory[t.category] ??= []).push(t);
  }
  const sections: string[] = [];
  for (const [cat, items] of Object.entries(byCategory)) {
    const lines = items.map((t) =>
      `- **${t.term}**: ${t.definition}${t.exampleSql ? `\n  예: \`${t.exampleSql.replace(/\n+/g, ' ')}\`` : ''}`
    );
    sections.push(`### ${cat}\n${lines.join('\n')}`);
  }
  return sections.join('\n\n');
}
