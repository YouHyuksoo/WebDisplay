/**
 * @file TableDetail.tsx
 * @description 우측 상세 영역 — 탭 스위처 + 각 탭 컴포넌트 렌더.
 *
 * 초보자 가이드:
 * - Phase 3a 탭: Overview / Columns / History
 * - Phase 3b 탭 추가 예정: Dictionary / Filters & Joins / Examples / Prompt
 *   → `TABS` 배열에 추가만 하면 탭 버튼 자동 생성. 렌더 분기에서도 조건 추가 필요.
 */

'use client';

import useSWR from 'swr';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';
import OverviewTab from '../tabs/OverviewTab';
import ColumnsTab from '../tabs/ColumnsTab';
import HistoryTab from '../tabs/HistoryTab';
import ExamplesTab from '../tabs/ExamplesTab';
import DictionaryTab from '../tabs/DictionaryTab';
import FiltersJoinsTab from '../tabs/FiltersJoinsTab';
import PromptPreviewTab from '../tabs/PromptPreviewTab';
import type { AiTablesDetailTab } from '../../_hooks/useAiTablesStore';

const TABS: Array<{ id: AiTablesDetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'columns', label: 'Columns' },
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'filters-joins', label: 'Filters/Joins' },
  { id: 'examples', label: 'Examples' },
  { id: 'prompt', label: 'Prompt Preview' },
  { id: 'history', label: 'History' },
];

export default function TableDetail() {
  const { activeSite, activeTable, detailTab, setDetailTab } =
    useAiTablesStore();
  const { data, error, isLoading, mutate } = useSWR(
    activeTable ? ['table-detail', activeSite, activeTable] : null,
    () => api.getTable(activeSite, activeTable as string),
  );

  if (!activeTable) {
    return (
      <div className="p-8 text-zinc-500 dark:text-zinc-400">
        왼쪽에서 테이블을 선택하세요.
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-red-600 dark:text-red-400">
        로드 실패: {error.message ?? String(error)}
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="p-8 text-zinc-600 dark:text-zinc-400">로딩...</div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold font-mono">{activeTable}</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          [{activeSite}]
        </span>
      </div>
      {data.meta?.summary && (
        <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
          {data.meta.summary}
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDetailTab(t.id)}
            className={`px-3 py-2 text-sm transition-colors ${
              detailTab === t.id
                ? 'border-b-2 border-blue-500 -mb-px text-blue-600 dark:text-blue-400'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {detailTab === 'overview' && (
        <OverviewTab data={data} onChange={() => mutate()} />
      )}
      {detailTab === 'columns' && (
        <ColumnsTab data={data} onChange={() => mutate()} />
      )}
      {detailTab === 'dictionary' && <DictionaryTab data={data} />}
      {detailTab === 'filters-joins' && (
        <FiltersJoinsTab data={data} onChange={() => mutate()} />
      )}
      {detailTab === 'examples' && (
        <ExamplesTab data={data} onChange={() => mutate()} />
      )}
      {detailTab === 'prompt' && <PromptPreviewTab />}
      {detailTab === 'history' && <HistoryTab tableName={activeTable} />}
    </div>
  );
}
