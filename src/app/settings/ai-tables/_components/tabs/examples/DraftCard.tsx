/**
 * @file DraftCard.tsx
 * @description AI 초안 1건 렌더 — 저장 버튼 + 편집 가능한 질문/SQL.
 *
 * 초보자 가이드:
 * - 저장 시 source:'ai-draft' 로 POST.
 * - kind 가 누락된 초안은 기본 'exact'.
 */

'use client';

import { useState } from 'react';
import { api } from '../../../_lib/api-client';
import type { Example, ExampleKind } from '@/lib/ai-tables/types';

interface Props {
  site: string;
  table: string;
  draft: Partial<Example>;
  index: number;
  onSaved: () => void;
}

export default function DraftCard({ site, table, draft, index, onSaved }: Props) {
  const [kind, setKind] = useState<ExampleKind>(
    (draft.kind as ExampleKind) ?? 'exact',
  );
  const [question, setQuestion] = useState(draft.question ?? '');
  const [sql, setSql] = useState(draft.sql ?? draft.sqlTemplate ?? '');
  const [why, setWhy] = useState(draft.why ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<Example> = {
        kind,
        question,
        why,
        source: 'ai-draft',
      };
      if (kind === 'exact') payload.sql = sql;
      else payload.sqlTemplate = sql;
      await api.addExample(site, table, payload);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded border p-3 space-y-2 ${
        saved
          ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
          : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          ✨ AI 초안 #{index + 1}
          {saved && <span className="ml-2 text-green-700 dark:text-green-400">저장됨</span>}
        </div>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ExampleKind)}
          disabled={saved}
          className="text-xs px-1.5 py-0.5 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
        >
          <option value="exact">exact</option>
          <option value="template">template</option>
          <option value="skeleton">skeleton</option>
        </select>
      </div>

      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={saved}
        placeholder="질문 (한국어)"
        className="w-full text-sm px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
      />

      <textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        disabled={saved}
        placeholder="SELECT ..."
        className="w-full text-xs font-mono px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 h-24"
      />

      <input
        type="text"
        value={why}
        onChange={(e) => setWhy(e.target.value)}
        disabled={saved}
        placeholder="왜 이 SQL 인가? (why)"
        className="w-full text-xs px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved || !question.trim() || !sql.trim()}
          className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saved ? '저장됨' : saving ? '저장중...' : '💾 저장'}
        </button>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    </div>
  );
}
