/**
 * @file EquipmentLogGrid.tsx
 * @description 설비 로그 검색 결과 테이블 컴포넌트.
 * 초보자 가이드: ICOM_WEB_SERVICE_LOG 조회 결과를 테이블로 표시한다.
 * 열 헤더 경계를 드래그하면 열 너비를 조절할 수 있다.
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { EquipmentLogRow } from '@/lib/queries/equipment-log';

interface Props {
  rows: EquipmentLogRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  sortCol: string;
  sortDir: 'ASC' | 'DESC';
  onPageChange: (page: number) => void;
  onSort: (col: string) => void;
}

/** 각 열의 초기 너비(px) */
const DEFAULT_WIDTHS = [50, 170, 80, 100, 130, 0, 200];
const MIN_COL_WIDTH = 40;

export default function EquipmentLogGrid({
  rows, totalCount, page, totalPages, pageSize, sortCol, sortDir, onPageChange, onSort,
}: Props) {
  const t = useTranslations('equipmentLog');
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_WIDTHS);
  const tableRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  /** 열 경계 드래그 시작 */
  const onResizeStart = useCallback((colIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const currentWidth = colWidths[colIdx] || 200;
    dragRef.current = { colIdx, startX: e.clientX, startW: currentWidth };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const diff = ev.clientX - dragRef.current.startX;
      const newW = Math.max(MIN_COL_WIDTH, dragRef.current.startW + diff);
      setColWidths((prev) => {
        const next = [...prev];
        next[dragRef.current!.colIdx] = newW;
        return next;
      });
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [colWidths]);

  const headers = [
    { key: 'no', label: 'No', align: 'text-center', sortKey: '' },
    { key: 'callDate', label: t('callDate'), align: 'text-left', sortKey: 'CALL_DATE' },
    { key: 'addr', label: t('addr'), align: 'text-left', sortKey: 'ADDR' },
    { key: 'line', label: t('lineCode'), align: 'text-center', sortKey: 'LINE_NAME' },
    { key: 'stage', label: t('workstageCode'), align: 'text-left', sortKey: 'WORKSTAGE_CODE' },
    { key: 'req', label: t('reqShort'), align: 'text-left', sortKey: 'REQ' },
    { key: 'return', label: t('returnShort'), align: 'text-left', sortKey: 'RETURN' },
  ];

  /** 정렬 화살표 표시 */
  const sortArrow = (sk: string) => {
    if (!sk || sk !== sortCol) return <span className="ml-1 text-gray-500/40">↕</span>;
    return <span className="ml-1 text-blue-400">{sortDir === 'ASC' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="flex h-full flex-col">
      {/* 결과 요약 바 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
        <span className="text-gray-600 dark:text-gray-300">
          {t('totalRows', { count: totalCount })}
          {totalCount > 0 && (
            <span className="ml-2 text-gray-400 dark:text-gray-500">
              ({t('pageInfo', { page, totalPages })})
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t('rowsPerPage', { size: pageSize })}
        </span>
      </div>

      {/* 테이블 */}
      <div className="flex-1 overflow-auto" ref={tableRef}>
        <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            {colWidths.map((w, i) =>
              w > 0
                ? <col key={i} style={{ width: `${w}px` }} />
                : <col key={i} />,
            )}
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-700 text-white dark:bg-slate-800">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h.key}
                  className={`relative select-none px-3 py-2.5 font-medium ${h.align} ${h.sortKey ? 'cursor-pointer hover:bg-slate-600 dark:hover:bg-slate-700' : ''}`}
                  onClick={h.sortKey ? () => onSort(h.sortKey) : undefined}
                >
                  {h.label}
                  {h.sortKey && sortArrow(h.sortKey)}
                  {/* 열 리사이즈 핸들 (마지막 열 제외) */}
                  {i < headers.length - 1 && (
                    <span
                      onMouseDown={(e) => { e.stopPropagation(); onResizeStart(i, e); }}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-blue-400/50"
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-gray-400 dark:text-gray-500">
                  {t('noData')}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const globalIdx = (page - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-100 transition-colors hover:bg-blue-50/50 dark:border-gray-700/50 dark:hover:bg-blue-900/20 ${
                      idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-gray-400 dark:text-gray-500">
                      {globalIdx}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {row.CALL_DATE}
                    </td>
                    <td className="truncate px-3 py-2 font-semibold text-blue-700 dark:text-blue-400">
                      {row.ADDR ?? '-'}
                    </td>
                    <td className="truncate px-3 py-2 text-center text-gray-700 dark:text-gray-300" title={row.LINE_CODE ?? ''}>
                      {row.LINE_NAME ? `${row.LINE_NAME}` : row.LINE_CODE ?? '-'}
                    </td>
                    <td className="truncate px-3 py-2 text-gray-600 dark:text-gray-400">
                      {row.WORKSTAGE_CODE ?? '-'}
                    </td>
                    <td className="truncate px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400" title={row.REQ ?? ''}>
                      {row.REQ ?? '-'}
                    </td>
                    <td className="truncate px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-400" title={row.RETURN ?? ''}>
                      {row.RETURN ?? '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800/50">
          <button onClick={() => onPageChange(1)} disabled={page <= 1} className={pgBtnClass}>«</button>
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={pgBtnClass}>‹</button>
          {buildPageNumbers(page, totalPages).map((p, i) =>
            p === '...' ? (
              <span key={`e-${i}`} className="px-1 text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[28px] rounded px-2 py-1 text-xs ${
                  Number(p) === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={pgBtnClass}>›</button>
          <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className={pgBtnClass}>»</button>
        </div>
      )}
    </div>
  );
}

const pgBtnClass = 'rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700';

function buildPageNumbers(current: number, total: number): (string | number)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (string | number)[] = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    for (let i = current - 1; i <= current + 1; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  }
  return pages;
}
