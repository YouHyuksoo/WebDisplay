/**
 * @file src/app/settings/ai-tables/_lib/api-client.ts
 * @description AI Tables 페이지의 fetch 래퍼. 에러 응답은 throw.
 *
 * 초보자 가이드:
 * - 모든 메서드는 Promise<any> 반환. 구체 타입은 호출 측에서 좁혀 쓴다.
 * - URL 인코딩은 테이블/컬럼명에만 적용 (사이트 이름은 한글 프로필명 가능).
 */

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${r.status}: ${text}`);
  }
  return r.json();
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});
const jsonPatch = (body: unknown): RequestInit => ({
  method: 'PATCH',
  body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json' },
});

const tPath = (site: string, table: string) =>
  `/api/ai-tables/${encodeURIComponent(site)}/${encodeURIComponent(table)}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const api = {
  bootstrap: () => req<any>('/api/ai-tables'),
  sync: (site: string) =>
    req<any>('/api/ai-tables/sync', json({ site })),
  getTable: (site: string, table: string) => req<any>(tPath(site, table)),
  patchTable: (site: string, table: string, patch: unknown) =>
    req<any>(tPath(site, table), jsonPatch(patch)),

  previewTableComment: (site: string, table: string, newComment: string) =>
    req<any>(`${tPath(site, table)}/comment/preview`, json({ newComment })),
  executeTableComment: (
    site: string,
    table: string,
    ddl: string,
    before: string | null,
    after: string,
  ) =>
    req<any>(`${tPath(site, table)}/comment`, json({ ddl, before, after })),

  previewColComment: (
    site: string,
    table: string,
    col: string,
    newComment: string,
  ) =>
    req<any>(
      `${tPath(site, table)}/columns/${encodeURIComponent(col)}/comment/preview`,
      json({ newComment }),
    ),
  executeColComment: (
    site: string,
    table: string,
    col: string,
    ddl: string,
    before: string | null,
    after: string,
  ) =>
    req<any>(
      `${tPath(site, table)}/columns/${encodeURIComponent(col)}/comment`,
      json({ ddl, before, after }),
    ),

  patchColumn: (site: string, table: string, col: string, patch: unknown) =>
    req<any>(
      `${tPath(site, table)}/columns/${encodeURIComponent(col)}`,
      jsonPatch(patch),
    ),

  commentHistory: (table?: string) =>
    req<any>(
      `/api/ai-tables/comment-history${table ? `?table=${encodeURIComponent(table)}` : ''}`,
    ),

  // ── Phase 3b: Examples CRUD + Run ──────────────────────────────────────────
  listExamples: (site: string, table: string) =>
    req<any>(`${tPath(site, table)}/examples`),
  addExample: (site: string, table: string, ex: unknown) =>
    req<any>(`${tPath(site, table)}/examples`, json(ex)),
  patchExample: (
    site: string,
    table: string,
    id: string,
    patch: unknown,
  ) =>
    req<any>(
      `${tPath(site, table)}/examples/${encodeURIComponent(id)}`,
      jsonPatch(patch),
    ),
  deleteExample: (site: string, table: string, id: string) =>
    req<any>(
      `${tPath(site, table)}/examples/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    ),
  runExample: (
    site: string,
    table: string,
    id: string,
    bindings: Record<string, string | number> = {},
  ) =>
    req<any>(
      `${tPath(site, table)}/examples/${encodeURIComponent(id)}/run`,
      json({ bindings }),
    ),

  // ── Phase 3b part2: Domains CRUD + auto-suggest ────────────────────────────
  listDomains: () => req<any>('/api/ai-tables/domains'),
  createDomain: (d: unknown) => req<any>('/api/ai-tables/domains', json(d)),
  patchDomain: (id: string, patch: unknown) =>
    req<any>(`/api/ai-tables/domains/${encodeURIComponent(id)}`, jsonPatch(patch)),
  deleteDomain: (id: string) =>
    req<any>(`/api/ai-tables/domains/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
  autoSuggestDomains: () =>
    req<any>('/api/ai-tables/domains/auto-suggest', json({})),

  // ── Phase 3b part2: Columns bulk ──────────────────────────────────────────
  bulkColumnAction: (
    site: string,
    table: string,
    body: { columns: string[]; action: string; value: unknown },
  ) => req<any>(`${tPath(site, table)}/columns/bulk`, json(body)),

  // ── Phase 3b part2: Feedback queue ────────────────────────────────────────
  getFeedbackQueue: (site: string, table: string) =>
    req<any>(`${tPath(site, table)}/feedback-queue`),
  promoteFeedback: (
    site: string,
    table: string,
    fbId: string,
    example: unknown,
  ) =>
    req<any>(
      `${tPath(site, table)}/feedback-queue/${encodeURIComponent(fbId)}/promote`,
      json(example),
    ),
  rejectFeedback: (site: string, table: string, fbId: string) =>
    req<any>(
      `${tPath(site, table)}/feedback-queue/${encodeURIComponent(fbId)}`,
      { method: 'DELETE' },
    ),

  // ── Phase 3b part2: Prompt preview ────────────────────────────────────────
  getPromptPreview: (site: string, table: string) =>
    req<any>(`${tPath(site, table)}/preview`),
};
/* eslint-enable @typescript-eslint/no-explicit-any */
