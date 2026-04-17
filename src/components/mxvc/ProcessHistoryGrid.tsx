/**
 * @file src/components/mxvc/ProcessHistoryGrid.tsx
 * @description 공정통과이력 AG Grid — WORKSTAGE별 컬럼 그룹(MACHINE/RESULT/DATE) 동적 생성
 *
 * 초보자 가이드:
 * - workstages 배열 길이에 따라 컬럼 수가 달라짐
 * - 각 WORKSTAGE는 3개 하위 컬럼(머신, 결과, 일시)을 가진 column group
 * - 좌측 2개(PID, MODEL_NAME)는 고정 필수 컬럼
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
  type ColGroupDef,
  type ICellRendererParams,
  type CellStyle,
} from 'ag-grid-community';
import { useTheme } from 'next-themes';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridParams = { fontSize: 11, headerFontSize: 12, rowHeight: 28, headerHeight: 32 };
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

export interface Workstage {
  code: string;
  name: string;
}

interface Props {
  rows: Record<string, unknown>[];
  workstages: Workstage[];
}

const PASS_VALUES = new Set(['PASS', 'OK', 'GOOD', 'Y']);

/**
 * 공정 그룹별 배경 팔레트 — 라이트/다크 모드 공통 동작하는 낮은 alpha.
 * border는 그룹 첫 컬럼 좌측 경계선으로 공정 구분.
 */
const STAGE_PALETTE = [
  { bg: 'rgba(59, 130, 246, 0.08)',  border: '#3b82f6' }, // blue
  { bg: 'rgba(34, 197, 94, 0.08)',   border: '#22c55e' }, // green
  { bg: 'rgba(168, 85, 247, 0.08)',  border: '#a855f7' }, // purple
  { bg: 'rgba(245, 158, 11, 0.10)',  border: '#f59e0b' }, // amber
  { bg: 'rgba(236, 72, 153, 0.08)',  border: '#ec4899' }, // pink
  { bg: 'rgba(20, 184, 166, 0.08)',  border: '#14b8a6' }, // teal
];

function ResultCell(params: ICellRendererParams) {
  const v = params.value;
  if (v == null || v === '') return null;
  const isPass = PASS_VALUES.has(String(v).toUpperCase());
  const cls = isPass
    ? 'font-bold text-green-600 dark:text-green-400'
    : 'font-bold text-red-600 dark:text-red-400';
  return <span className={cls}>{String(v)}</span>;
}

export default function ProcessHistoryGrid({ rows, workstages }: Props) {
  const { resolvedTheme } = useTheme();
  const gridTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  const gridRef = useRef<AgGridReact>(null);

  const colDefs: (ColDef | ColGroupDef)[] = useMemo(() => {
    const base: (ColDef | ColGroupDef)[] = [
      { field: 'PID', headerName: 'PID', width: 140, pinned: 'left', tooltipField: 'PID' },
      { field: 'MODEL_NAME', headerName: '모델명', width: 120, pinned: 'left' },
      { field: 'RATING_LABEL', headerName: 'Rating Label', width: 360, pinned: 'left', tooltipField: 'RATING_LABEL',
        cellStyle: { fontFamily: 'monospace', fontSize: 11, color: '#64748b' } },
    ];
    const stageCols: ColGroupDef[] = workstages.map((w, i) => {
      const pal = STAGE_PALETTE[i % STAGE_PALETTE.length];
      /* 같은 그룹 내 셀들의 공통 배경 */
      const cellStyle: CellStyle = { backgroundColor: pal.bg };
      /* 그룹의 첫 컬럼(머신)은 좌측에 컬러 보더를 주어 공정 경계 강조 */
      const firstCellStyle: CellStyle = {
        backgroundColor: pal.bg,
        borderLeft: `3px solid ${pal.border}`,
      };
      return {
        headerName: `${w.name} (${w.code})`,
        headerClass: `stage-group-header-${i % STAGE_PALETTE.length}`,
        children: [
          { field: `${w.code}__MACHINE`, headerName: '머신', width: 85, cellStyle: firstCellStyle },
          { field: `${w.code}__RESULT`,  headerName: '결과', width: 60,
            cellRenderer: ResultCell, cellStyle },
          { field: `${w.code}__DATE`,    headerName: '일시', width: 140, cellStyle },
        ],
      };
    });
    return [...base, ...stageCols];
  }, [workstages]);

  const onFirstDataRendered = useCallback(() => {
    gridRef.current?.api?.autoSizeAllColumns();
  }, []);

  return (
    <div className="flex-1 min-h-0">
      {/* 그룹 헤더 배경색 + 헤더 가운데 정렬 */}
      <style>{`
        .ag-header-group-cell.stage-group-header-0 { background-color: rgba(59, 130, 246, 0.18); border-left: 3px solid #3b82f6; }
        .ag-header-group-cell.stage-group-header-1 { background-color: rgba(34, 197, 94, 0.18);  border-left: 3px solid #22c55e; }
        .ag-header-group-cell.stage-group-header-2 { background-color: rgba(168, 85, 247, 0.18); border-left: 3px solid #a855f7; }
        .ag-header-group-cell.stage-group-header-3 { background-color: rgba(245, 158, 11, 0.20); border-left: 3px solid #f59e0b; }
        .ag-header-group-cell.stage-group-header-4 { background-color: rgba(236, 72, 153, 0.18); border-left: 3px solid #ec4899; }
        .ag-header-group-cell.stage-group-header-5 { background-color: rgba(20, 184, 166, 0.18); border-left: 3px solid #14b8a6; }
        .ag-header-cell-label,
        .ag-header-group-cell-label { justify-content: center; text-align: center; }
      `}</style>
      <AgGridReact
        ref={gridRef}
        theme={gridTheme}
        rowData={rows}
        columnDefs={colDefs}
        defaultColDef={{ sortable: true, resizable: true, filter: false, suppressHeaderMenuButton: true }}
        onFirstDataRendered={onFirstDataRendered}
        animateRows
        suppressColumnMoveAnimation
      />
    </div>
  );
}
