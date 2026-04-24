/**
 * @file src/components/mxvc/LogTableSidebar.tsx
 * @description 좌측 사이드바 - LOG_ 테이블 목록을 표시하고 선택할 수 있는 패널.
 * 초보자 가이드:
 * - /api/mxvc/tables 에서 테이블 목록을 가져온다
 * - 선택된 테이블은 하이라이트 표시
 * - NUM_ROWS로 대략적인 행 수를 보여줌 (ANALYZE 기준이라 정확하지 않을 수 있음)
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface TableInfo {
  TABLE_NAME: string;
  COMMENTS: string | null;
  ALIAS?: string;
}

interface LogTableSidebarProps {
  selectedTable: string;
  onSelectTable: (tableName: string) => void;
  /** API 경로 베이스 (기본값: /api/mxvc) */
  apiBase?: string;
}

export default function LogTableSidebar({
  selectedTable,
  onSelectTable,
  apiBase = '/api/mxvc',
}: LogTableSidebarProps) {
  const t = useTranslations('common');
  const tl = useTranslations('mxvcLog');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/tables`);
        if (!res.ok) throw new Error(tl('apiError'));
        const data = await res.json();
        setTables(data.tables ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase, tl]);

  const filtered = tables.filter((t) => {
    const keyword = search.toLowerCase();
    return t.TABLE_NAME.toLowerCase().includes(keyword)
      || (t.ALIAS ?? '').toLowerCase().includes(keyword);
  });

  return (
    <aside className="w-56 min-w-[224px] border-r border-zinc-700 flex flex-col min-h-0 bg-zinc-900">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <h2 className="text-sm font-bold text-zinc-100 mb-2">{tl('sidebarTitle')}</h2>
        <input
          type="text"
          placeholder={tl('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded border border-zinc-600 bg-zinc-800
                     text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 테이블 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-8 text-center text-zinc-500 text-xs">{t('loading')}</div>
        )}
        {error && (
          <div className="px-4 py-4 text-center text-red-400 text-xs">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-zinc-500 text-xs">{tl('noTable')}</div>
        )}
        {filtered.map((t) => (
          <button
            key={t.TABLE_NAME}
            onClick={() => onSelectTable(t.TABLE_NAME)}
            className={`w-full text-left px-4 py-1.5 transition-colors border-b border-zinc-800 ${
              selectedTable === t.TABLE_NAME
                ? 'bg-blue-600/20 text-blue-300 border-l-2 border-l-blue-500'
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <span className="font-bold text-sm truncate block">
              {t.ALIAS ?? t.TABLE_NAME}
            </span>
            {t.COMMENTS && (
              <span className="text-[11px] text-zinc-500 truncate block">
                {t.COMMENTS}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 푸터 */}
      <div className="px-4 py-2 border-t border-zinc-700 text-xs text-zinc-500">
        {tl('tableCount', { count: tables.length })}
      </div>
    </aside>
  );
}
