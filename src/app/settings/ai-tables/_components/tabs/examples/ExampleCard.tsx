/**
 * @file ExampleCard.tsx
 * @description 저장된 Example 한 건 렌더 — 질문/SQL/why + Run/삭제 버튼.
 *
 * 초보자 가이드:
 * - Run 버튼을 누르면 /run 엔드포인트 호출 후 결과를 이 카드 하단에 표시.
 * - template/skeleton 은 bindings 를 JSON textarea 로 입력 (간단 버전).
 */

'use client';

import { useState } from 'react';
import { api } from '../../../_lib/api-client';
import type { Example } from '@/lib/ai-tables/types';

interface Props {
  site: string;
  table: string;
  example: Example;
  onDelete: () => void;
}

export default function ExampleCard({ site, table, example, onDelete }: Props) {
  const [running, setRunning] = useState(false);
  const [bindingsText, setBindingsText] = useState('{}');
  const [result, setResult] = useState<{
    rows?: unknown[];
    columns?: Array<{ name: string }>;
    error?: string;
    renderedSql?: string;
    elapsedMs?: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const needsBindings = example.kind !== 'exact';
  const sqlText = example.sql ?? example.sqlTemplate ?? '';

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    try {
      let bindings: Record<string, string | number> = {};
      if (needsBindings && bindingsText.trim()) {
        try {
          bindings = JSON.parse(bindingsText);
        } catch {
          setResult({ error: 'bindings JSON 파싱 실패' });
          return;
        }
      }
      const r = await api.runExample(site, table, example.id, bindings);
      setResult(r);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteExample(site, table, example.id);
      onDelete();
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
      setDeleting(false);
    }
  };

  return (
    <div className="rounded border border-zinc-200 dark:border-zinc-800 p-3 bg-white dark:bg-zinc-900 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {example.question}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {example.kind} · {example.source}
            {example.createdAt && ` · ${example.createdAt.slice(0, 10)}`}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
        >
          {deleting ? '삭제중...' : '삭제'}
        </button>
      </div>

      <pre className="text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-2 overflow-x-auto font-mono">
        {sqlText}
      </pre>

      {example.why && (
        <div className="text-xs text-zinc-600 dark:text-zinc-400 italic">
          왜? {example.why}
        </div>
      )}

      {needsBindings && (
        <div>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-0.5">
            bindings (JSON)
          </label>
          <textarea
            className="w-full text-xs font-mono px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-900 h-16"
            value={bindingsText}
            onChange={(e) => setBindingsText(e.target.value)}
            placeholder='{"from_date":"20260101"}'
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? '실행중...' : '▶ 실행 (ROWNUM ≤ 10)'}
        </button>
      </div>

      {result && (
        <div className="mt-2 text-xs">
          {result.error ? (
            <div className="text-red-600 dark:text-red-400">
              오류: {result.error}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-zinc-600 dark:text-zinc-400">
                {result.rows?.length ?? 0} rows · {result.elapsedMs}ms
              </div>
              {result.rows && result.rows.length > 0 && (
                <pre className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded p-2 overflow-x-auto max-h-48">
                  {JSON.stringify(result.rows, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
