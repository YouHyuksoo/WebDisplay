/**
 * @file src/lib/ai-tables/feedback-queue.ts
 * @description /ai-chat 좋아요 피드백을 각 테이블의 meta.feedbackQueue 에 적립·승격·기각.
 *
 * 초보자 가이드:
 * - `enqueueFeedback(candidate)` : SQL을 파싱해 참조 테이블마다 queue에 push.
 *   - site 를 별도로 받지 않고 모든 사이트를 순회하며 해당 테이블이 존재하는 곳에 push.
 *     MessageBubble 이 site 를 전송하지 않기 때문. 테이블 이름이 유니크하면 정확히 매칭.
 * - `promoteFeedback(site, table, fbId, example)` : 큐에서 꺼내 examples[] 에 추가.
 * - `rejectFeedback(site, table, fbId)` : 큐에서 제거.
 * - 중복 방지: 같은 `id` (= messageId) 가 이미 있으면 스킵.
 * - 오래된 tables.json 엔트리에 feedbackQueue 가 없을 수 있으므로 방어적으로 초기화.
 */

import { loadTables, saveTables } from './store';
import { extractTableNames } from './sql-table-parser';
import type { FeedbackCandidate, Example, SiteKey } from './types';

/**
 * 후보 피드백을 SQL에서 참조된 테이블들의 큐에 적립.
 *
 * @param candidate - tablesReferenced 는 내부에서 계산하므로 생략 가능.
 */
export async function enqueueFeedback(
  candidate: Omit<FeedbackCandidate, 'tablesReferenced'> & {
    tablesReferenced?: string[];
  },
): Promise<{ enqueued: number }> {
  const tablesReferenced =
    candidate.tablesReferenced && candidate.tablesReferenced.length > 0
      ? candidate.tablesReferenced
      : extractTableNames(candidate.sql);
  if (tablesReferenced.length === 0) return { enqueued: 0 };

  const data = await loadTables();
  let enqueued = 0;
  for (const siteKey of Object.keys(data.sites) as SiteKey[]) {
    const siteTables = data.sites[siteKey]?.tables ?? {};
    for (const t of tablesReferenced) {
      const meta = siteTables[t];
      if (!meta) continue;
      meta.feedbackQueue ??= [];
      if (meta.feedbackQueue.find((f) => f.id === candidate.id)) continue;
      meta.feedbackQueue.push({ ...candidate, tablesReferenced });
      enqueued++;
    }
  }
  if (enqueued > 0) await saveTables(data);
  return { enqueued };
}

/**
 * 큐에서 꺼내 examples[] 로 승격.
 * example 에는 kind/question/sql 등 저장할 내용이 포함되어 있어야 한다.
 */
export async function promoteFeedback(
  site: SiteKey,
  table: string,
  fbId: string,
  example: Partial<Example>,
): Promise<{ ok: true; example: Example }> {
  const data = await loadTables();
  const meta = data.sites[site]?.tables[table];
  if (!meta) throw new Error('table not found');
  meta.feedbackQueue ??= [];
  meta.examples ??= [];
  const fb = meta.feedbackQueue.find((f) => f.id === fbId);
  if (!fb) throw new Error('feedback not found');

  const promoted: Example = {
    id: fbId,
    kind: (example.kind ?? 'exact') as Example['kind'],
    question: example.question ?? fb.question,
    why: example.why ?? '(승격됨)',
    sql: example.sql ?? fb.sql,
    sqlTemplate: example.sqlTemplate,
    slots: example.slots,
    dialog: example.dialog,
    whyInPrompt: example.whyInPrompt,
    createdAt: new Date().toISOString(),
    source: 'promoted',
    promotedFrom: {
      chatSessionId: fb.sessionId,
      messageId: fb.id,
      likedAt: fb.likedAt,
    },
  };
  meta.examples.push(promoted);
  meta.feedbackQueue = meta.feedbackQueue.filter((f) => f.id !== fbId);
  await saveTables(data);
  return { ok: true, example: promoted };
}

/** 큐에서 제거만 (승격 없이 기각). */
export async function rejectFeedback(
  site: SiteKey,
  table: string,
  fbId: string,
): Promise<{ ok: true }> {
  const data = await loadTables();
  const meta = data.sites[site]?.tables[table];
  if (!meta) throw new Error('table not found');
  meta.feedbackQueue ??= [];
  meta.feedbackQueue = meta.feedbackQueue.filter((f) => f.id !== fbId);
  await saveTables(data);
  return { ok: true };
}
