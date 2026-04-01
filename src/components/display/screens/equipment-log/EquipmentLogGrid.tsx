/**
 * @file EquipmentLogGrid.tsx
 * @description 설비호출이력검색 결과 AG Grid 컴포넌트.
 * 초보자 가이드:
 * - AG Grid Community로 컬럼 리사이즈/이동/소팅/필터를 네이티브 지원
 * - 서버 페이지네이션은 외부에서 제어 (page/totalPages props)
 * - 다크/라이트 테마 자동 전환
 */
'use client';

import { useCallback, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
} from 'ag-grid-community';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import type { EquipmentLogRow } from '@/lib/queries/equipment-log';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridParams = { fontSize: 11, headerFontSize: 12, rowHeight: 28, headerHeight: 32 };
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

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

export default function EquipmentLogGrid({
  rows, totalCount, page, totalPages, pageSize, onPageChange, onSort,
}: Props) {
  const { resolvedTheme } = useTheme();
  const gridTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  const gridRef = useRef<AgGridReact>(null);
  const t = useTranslations('equipmentLog');

  const colDefs: ColDef[] = useMemo(() => [
    { field: 'NO', headerName: 'No', width: 60, sortable: false, filter: false,
      valueGetter: (params) => params.node ? (page - 1) * pageSize + params.node.rowIndex! + 1 : '' },
    { field: 'CALL_DATE', headerName: t('callDate'), width: 170, filter: 'agTextColumnFilter' },
    { field: 'ADDR', headerName: t('addr'), width: 100, filter: 'agTextColumnFilter',
      cellClass: 'font-semibold text-blue-700 dark:text-blue-400' },
    { field: 'LINE_NAME', headerName: t('lineCode'), width: 100, filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.data?.LINE_NAME || params.data?.LINE_CODE || '-' },
    { field: 'WORKSTAGE_CODE', headerName: t('workstageCode'), width: 130, filter: 'agTextColumnFilter' },
    { field: 'REQ', headerName: t('reqShort'), minWidth: 200, flex: 1, filter: 'agTextColumnFilter',
      tooltipField: 'REQ' },
    { field: 'RETURN', headerName: t('returnShort'), width: 250, filter: 'agTextColumnFilter',
      tooltipField: 'RETURN' },
  ], [page, pageSize, t]);

  const onFirstDataRendered = useCallback(() => {
    gridRef.current?.api?.autoSizeAllColumns();
  }, []);

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

      {/* AG Grid */}
      <div className="flex-1">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          columnDefs={colDefs}
          onFirstDataRendered={onFirstDataRendered}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: true,
            minWidth: 60,
          }}
          animateRows={false}
          enableCellTextSelection={true}
          suppressCellFocus={true}
          tooltipShowDelay={300}
          onSortChanged={(e) => {
            const col = e.api.getColumnState().find((c) => c.sort);
            if (col?.colId) onSort(col.colId);
          }}
        />
      </div>

      {/* 서버 페이지네이션 */}
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
