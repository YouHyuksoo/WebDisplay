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
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}/tables`);
        if (!res.ok) throw new Error('API 오류');
        const data = await res.json();
        setTables(data.tables ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = tables.filter((t) => {
    const keyword = search.toLowerCase();
    return t.TABLE_NAME.toLowerCase().includes(keyword)
      || (t.ALIAS ?? '').toLowerCase().includes(keyword);
  });

  return (
    <aside className="w-64 min-w-[256px] border-r border-gray-200 dark:border-gray-700 flex flex-col
                       bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">
          LOG 테이블 목록
        </h2>
        <input
          type="text"
          placeholder="테이블 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm rounded
                     bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                     text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                     focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 테이블 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            {t('loading')}
          </div>
        )}
        {error && (
          <div className="px-4 py-4 text-center text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            테이블 없음
          </div>
        )}
        {filtered.map((t) => (
          <button
            key={t.TABLE_NAME}
            onClick={() => onSelectTable(t.TABLE_NAME)}
            className={`w-full text-left px-4 py-2.5 transition-colors
              border-b border-gray-100 dark:border-gray-800
              ${
                selectedTable === t.TABLE_NAME
                  ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 border-l-2 border-l-blue-500'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/60'
              }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[13px] truncate">{t.ALIAS ?? t.TABLE_NAME}</span>
              {t.COMMENTS && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0 truncate max-w-[100px]">
                  {t.COMMENTS}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 푸터 */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700
                       text-xs text-gray-500 dark:text-gray-400">
        {tables.length}개 테이블
      </div>
    </aside>
  );
}
