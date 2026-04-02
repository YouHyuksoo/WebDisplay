/**
 * @file src/components/mxvc/InspectResultGrid.tsx
 * @description 설비호출저장이력 AG Grid 컴포넌트
 * 초보자 가이드:
 * 1. AG Grid Community로 컬럼 리사이즈/소팅/필터 지원
 * 2. 서버 페이지네이션은 외부에서 제어 (page/totalPages props)
 * 3. 다크/라이트 테마 자동 전환
 */
"use client";

import { useCallback, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";
import { useTheme } from "next-themes";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridParams = { fontSize: 11, headerFontSize: 12, rowHeight: 28, headerHeight: 32 };
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

interface Props {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  sortCol: string;
  sortDir: "ASC" | "DESC";
  onPageChange: (page: number) => void;
  onSort: (col: string) => void;
}

export default function InspectResultGrid({
  rows, totalCount, page, totalPages, pageSize, onPageChange, onSort,
}: Props) {
  const t = useTranslations("common");
  const { resolvedTheme } = useTheme();
  const gridTheme = resolvedTheme === "dark" ? darkTheme : lightTheme;
  const gridRef = useRef<AgGridReact>(null);

  const colDefs: ColDef[] = useMemo(() => [
    { field: "NO", headerName: "No", width: 60, sortable: false, filter: false,
      valueGetter: (params) => params.node ? (page - 1) * pageSize + params.node.rowIndex! + 1 : "" },
    { field: "INSPECT_DATE", headerName: "검사일시", width: 170, filter: "agTextColumnFilter" },
    { field: "LINE_CODE", headerName: "LINE", width: 80, filter: "agTextColumnFilter",
      cellClass: "font-semibold text-blue-700 dark:text-blue-400" },
    { field: "MACHINE_CODE", headerName: "머신코드", width: 120, filter: "agTextColumnFilter" },
    { field: "PID", headerName: "PID", width: 160, filter: "agTextColumnFilter", tooltipField: "PID" },
    { field: "RUN_NO", headerName: "RUN_NO", width: 120, filter: "agTextColumnFilter" },
    { field: "MODEL_NAME", headerName: "모델명", width: 130, filter: "agTextColumnFilter" },
    { field: "MODEL_CODE", headerName: "모델코드", width: 100, filter: "agTextColumnFilter" },
    { field: "MASTER_MODEL_NAME", headerName: "마스터모델", width: 120, filter: "agTextColumnFilter" },
    { field: "PCB_ITEM", headerName: "PCB_ITEM", width: 100, filter: "agTextColumnFilter" },
    { field: "INSPECT_RESULT", headerName: "결과", width: 80, filter: "agTextColumnFilter",
      cellClass: (params) => params.value === "PASS" || params.value === "OK" || params.value === "GOOD" || params.value === "Y"
        ? "font-bold text-green-600 dark:text-green-400"
        : "font-bold text-red-600 dark:text-red-400" },
    { field: "TXN_TYPE", headerName: "TXN유형", width: 100, filter: "agTextColumnFilter" },
    { field: "ENTER_DATE", headerName: "등록일시", width: 160, filter: "agTextColumnFilter" },
    { field: "IS_LAST", headerName: "최종", width: 55, filter: "agTextColumnFilter" },
  ], [page, pageSize]);

  const onFirstDataRendered = useCallback(() => {
    gridRef.current?.api?.autoSizeAllColumns();
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* 결과 요약 바 */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
        <span className="text-gray-600 dark:text-gray-300">
          총 {totalCount}건
          {totalCount > 0 && (
            <span className="ml-2 text-gray-400 dark:text-gray-500">
              ({page} / {totalPages} 페이지)
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {pageSize}건씩 표시
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
          defaultColDef={{ sortable: true, resizable: true, filter: true, minWidth: 60 }}
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
          <button onClick={() => onPageChange(1)} disabled={page <= 1} className={pgBtn}>«</button>
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={pgBtn}>‹</button>
          {buildPageNums(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`e-${i}`} className="px-1 text-xs text-gray-400">…</span>
            ) : (
              <button key={p} onClick={() => onPageChange(Number(p))}
                className={`min-w-[28px] rounded px-2 py-1 text-xs ${
                  Number(p) === page
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}>
                {p}
              </button>
            ),
          )}
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className={pgBtn}>›</button>
          <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} className={pgBtn}>»</button>
        </div>
      )}
    </div>
  );
}

const pgBtn = "rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-700";

function buildPageNums(cur: number, total: number): (string | number)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const p: (string | number)[] = [];
  if (cur <= 4) { for (let i = 1; i <= 5; i++) p.push(i); p.push("..."); p.push(total); }
  else if (cur >= total - 3) { p.push(1); p.push("..."); for (let i = total - 4; i <= total; i++) p.push(i); }
  else { p.push(1); p.push("..."); for (let i = cur - 1; i <= cur + 1; i++) p.push(i); p.push("..."); p.push(total); }
  return p;
}
