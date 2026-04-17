/**
 * @file TableList.tsx
 * @description 중간 컬럼 — 활성 사이트의 테이블 목록 + 검색 + enabled 필터.
 *
 * 초보자 가이드:
 * - 행 클릭 시 `activeTable` 변경 → 우측 `TableDetail` 이 상세 로드.
 * - 배지:
 *   - 초록 점 = enabled, 회색 점 = disabled
 *   - 💬 N = 예제 개수
 *   - ⭐ N = pending 피드백 (있을 때만)
 */

'use client';

import { useMemo, useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface TableRow {
  name: string;
  enabled: boolean;
  tags?: string[];
  summary?: string;
  columnCount: number;
  exampleCount: number;
  pendingFeedbackCount: number;
  lastEditedAt?: string;
}

export default function TableList() {
  const { bootstrap, activeSite, activeTable, setActiveTable } =
    useAiTablesStore();
  const [search, setSearch] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);

  const rows: TableRow[] = useMemo(() => {
    const all = (bootstrap?.tables?.[activeSite] ?? []) as TableRow[];
    const q = search.trim().toLowerCase();
    return all
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .filter((r) => !onlyEnabled || r.enabled);
  }, [bootstrap, activeSite, search, onlyEnabled]);

  return (
    <div className="p-3">
      <input
        className="w-full mb-2 px-2 py-1.5 text-sm border rounded border-zinc-300 bg-white dark:bg-zinc-900 dark:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="테이블 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <label className="flex items-center gap-1 mb-3 text-xs text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={onlyEnabled}
          onChange={(e) => setOnlyEnabled(e.target.checked)}
        />
        enabled만 보기
      </label>

      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
        {rows.length}개
      </div>

      <div className="space-y-0.5">
        {rows.map((r) => (
          <button
            key={r.name}
            type="button"
            className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 text-sm rounded transition-colors ${
              activeTable === r.name
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            onClick={() => setActiveTable(r.name)}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  r.enabled ? 'bg-green-500' : 'bg-zinc-400'
                }`}
              />
              <span className="truncate font-mono text-xs">{r.name}</span>
            </span>
            <span className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0">
              {r.pendingFeedbackCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  ⭐ {r.pendingFeedbackCount}
                </span>
              )}
              <span>💬 {r.exampleCount}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
