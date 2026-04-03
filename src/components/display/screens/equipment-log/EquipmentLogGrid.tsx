/**
 * @file EquipmentLogGrid.tsx
 * @description 설비호출이력검색 결과 AG Grid 컴포넌트.
 * 초보자 가이드:
 * - AG Grid Community로 컬럼 리사이즈/이동/소팅/필터를 네이티브 지원
 * - 서버 페이지네이션은 외부에서 제어 (page/totalPages props)
 * - 다크/라이트 테마 자동 전환
 */
'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
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

/** REQ '/'로 분리된 가상 컬럼 헤더명 */
const reqPartHeaders = ['REQ_1(CMD)', 'REQ_2(LINE)', 'REQ_3(MACHINE)', 'REQ_4(PID)', 'REQ_5'];
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

interface Props {
  rows: EquipmentLogRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  serverTimestamp?: string;
  onPageChange: (page: number) => void;
  onSortChange: (sorts: { col: string; dir: 'ASC' | 'DESC' }[]) => void;
}

export default function EquipmentLogGrid({
  rows, totalCount, page, totalPages, pageSize, onPageChange, onSortChange, serverTimestamp,
}: Props) {
  const { resolvedTheme } = useTheme();
  const gridTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  const gridRef = useRef<AgGridReact>(null);
  const t = useTranslations('equipmentLog');
  const [activeSorts, setActiveSorts] = useState<{ col: string; dir: string }[]>([{ col: 'CALL_DATE', dir: 'DESC' }]);

  const colDefs: ColDef[] = useMemo(() => [
    { field: 'NO', headerName: 'No', width: 60, sortable: false, filter: false,
      valueGetter: (params) => params.node ? (page - 1) * pageSize + params.node.rowIndex! + 1 : '' },
    { colId: 'ELAPSED', headerName: '경과', width: 90, sortable: false, filter: false,
      valueGetter: (params) => {
        const d = params.data?.CALL_DATE as string | undefined;
        if (!d) return '';
        const now = serverTimestamp ? new Date(serverTimestamp).getTime() : Date.now();
        const diff = now - new Date(d).getTime();
        if (diff < 0) return '0초';
        const sec = Math.floor(diff / 1000);
        if (sec < 60) return `${sec}초`;
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}분`;
        const hr = Math.floor(min / 60);
        const rm = min % 60;
        if (hr < 24) return `${hr}시간${rm > 0 ? rm + '분' : ''}`;
        const day = Math.floor(hr / 24);
        const rh = hr % 24;
        return `${day}일${rh > 0 ? rh + '시간' : ''}`;
      },
      cellClass: 'text-orange-500 dark:text-orange-400 font-mono text-[10px]' },
    { field: 'CALL_DATE', headerName: t('callDate'), width: 170, filter: 'agTextColumnFilter' },
    { field: 'ADDR', headerName: t('addr'), width: 100, filter: 'agTextColumnFilter',
      cellClass: 'font-semibold text-blue-700 dark:text-blue-400' },
    { field: 'LINE_NAME', headerName: t('lineCode'), width: 100, filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.data?.LINE_NAME || params.data?.LINE_CODE || '-' },
    { field: 'WORKSTAGE_CODE', headerName: t('workstageCode'), width: 130, filter: 'agTextColumnFilter' },
    { field: 'WORKSTAGE_NAME', headerName: t('workstageName'), width: 160, filter: 'agTextColumnFilter' },
    { field: 'REQ', headerName: t('reqShort'), minWidth: 200, flex: 1, filter: 'agTextColumnFilter',
      tooltipField: 'REQ' },
    { field: 'RETURN', headerName: t('returnShort'), width: 250, filter: 'agTextColumnFilter',
      tooltipField: 'RETURN' },
    /* REQ를 '/'로 분리한 가상 컬럼들 */
    ...reqPartHeaders.map((headerName, idx) => ({
      colId: `REQ_PART_${idx + 1}`,
      headerName,
      width: idx === 3 ? 200 : 120,
      filter: 'agTextColumnFilter' as const,
      valueGetter: (params: { data?: Record<string, unknown> }) => {
        const req = params.data?.REQ as string | undefined;
        return req?.split('/')[idx] ?? '';
      },
    })),
  ], [page, pageSize, t, serverTimestamp]);

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
        <div className="flex items-center gap-2">
          {activeSorts.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400">정렬:</span>
              {activeSorts.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                  {i + 1}. {s.col} {s.dir === 'ASC' ? '▲' : '▼'}
                </span>
              ))}
              <span className="text-[9px] text-gray-400 ml-1">(Ctrl+클릭 = 멀티정렬)</span>
            </div>
          )}
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t('rowsPerPage', { size: pageSize })}
          </span>
        </div>
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
          multiSortKey="ctrl"
          onSortChanged={(e) => {
            const sorted = e.api.getColumnState()
              .filter((c) => c.sort)
              .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
              .map((c) => ({ col: c.colId!, dir: (c.sort?.toUpperCase() ?? 'ASC') as 'ASC' | 'DESC' }));
            const result = sorted.length > 0 ? sorted : [{ col: 'CALL_DATE', dir: 'DESC' as const }];
            setActiveSorts(result);
            onSortChange(result);
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
