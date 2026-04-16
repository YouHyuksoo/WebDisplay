/**
 * @file InspectResultGrid.tsx
 * @description 호출저장이력 AG Grid — IQ_MACHINE_INSPECT_RESULT 테이블 조회 결과 표시.
 * 초보자 가이드: 설비 호출 후 실제 DB에 저장된 검사결과를 날짜/키워드로 검색한다.
 * 서버 페이지네이션 + 정렬을 지원한다.
 */
'use client';

import { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from 'ag-grid-community';
import { useTheme } from 'next-themes';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridParams = { fontSize: 11, headerFontSize: 12, rowHeight: 28, headerHeight: 32 };
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

const PASS_VALUES = new Set(['PASS', 'OK', 'GOOD', 'Y']);

function ResultCell(params: ICellRendererParams) {
  const v = params.value;
  if (v == null || v === '') return null;
  const isPass = PASS_VALUES.has(String(v).toUpperCase());
  return <span className={`font-bold ${isPass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{String(v)}</span>;
}

function IsLastCell(params: ICellRendererParams) {
  const v = params.value;
  if (v == null) return null;
  const isY = String(v).toUpperCase() === 'Y';
  return <span className={`font-semibold ${isY ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{String(v)}</span>;
}

export interface InspectRow {
  PID: string;
  LINE_CODE: string | null;
  WORKSTAGE_CODE: string | null;
  WORKSTAGE_NAME: string | null;
  MACHINE_CODE: string | null;
  INSPECT_RESULT: string | null;
  INSPECT_DATE: string | null;
  IS_LAST: string | null;
}

interface Props {
  rows: InspectRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSortChange: (sorts: { col: string; dir: 'ASC' | 'DESC' }[]) => void;
}

export default function InspectResultGrid({ rows, totalCount, page, totalPages, pageSize, onPageChange, onSortChange }: Props) {
  const { resolvedTheme } = useTheme();
  const gridTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  const gridRef = useRef<AgGridReact>(null);

  const colDefs: ColDef[] = useMemo(() => [
    { field: 'PID', headerName: 'PID', width: 220, pinned: 'left' },
    { field: 'LINE_CODE', headerName: '라인', width: 80 },
    { field: 'WORKSTAGE_CODE', headerName: '공정코드', width: 90 },
    { field: 'WORKSTAGE_NAME', headerName: '공정명', width: 120 },
    { field: 'MACHINE_CODE', headerName: '설비', width: 110 },
    { field: 'INSPECT_RESULT', headerName: '결과', width: 80, cellRenderer: ResultCell },
    { field: 'IS_LAST', headerName: 'IS_LAST', width: 70, cellRenderer: IsLastCell },
    { field: 'INSPECT_DATE', headerName: '검사일시', width: 170 },
  ], []);

  const onFirstDataRendered = useCallback(() => {
    gridRef.current?.api?.autoSizeAllColumns();
  }, []);

  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 min-h-0">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          columnDefs={colDefs}
          defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
          onFirstDataRendered={onFirstDataRendered}
          onSortChanged={() => {
            const state = gridRef.current?.api?.getColumnState() ?? [];
            const newSorts = state
              .filter((s) => s.sort)
              .map((s) => ({ col: s.colId, dir: (s.sort === 'asc' ? 'ASC' : 'DESC') as 'ASC' | 'DESC' }));
            if (newSorts.length > 0) onSortChange(newSorts);
          }}
          animateRows
        />
      </div>

      {/* 페이지네이션 */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {startRow}~{endRow} / {totalCount}건
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(1)} disabled={page <= 1}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800">{'<<'}</button>
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800">{'<'}</button>
            <span className="mx-2 text-xs font-medium text-gray-700 dark:text-gray-300">{page} / {totalPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800">{'>'}</button>
            <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
              className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800">{'>>'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
