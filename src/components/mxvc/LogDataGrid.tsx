/**
 * @file src/components/mxvc/LogDataGrid.tsx
 * @description AG Grid 기반 로그 데이터 그리드 컴포넌트 (서버 사이드 페이지네이션).
 * 초보자 가이드:
 * - 서버 사이드 페이지네이션: page/pageSize를 API에 전달하여 필요한 만큼만 가져옴
 * - 엑셀 다운로드: exportAll=1로 전체 데이터를 별도 요청하여 다운로드
 * - 날짜 컬럼 자동 감지: DATA_TYPE이 DATE/TIMESTAMP인 컬럼을 dateCol 후보로 사용
 * - 컬럼 정의는 API에서 받은 메타데이터로 동적 생성
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
  type GridReadyEvent,
  type GridApi,
} from 'ag-grid-community';
import { useTheme } from 'next-themes';
import * as XLSX from 'xlsx';
import { useServerTime } from '@/hooks/useServerTime';

ModuleRegistry.registerModules([AllCommunityModule]);

/** AG Grid 공통 파라미터 */
const gridParams = { fontSize: 11, headerFontSize: 12, rowHeight: 28, headerHeight: 32 };
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

interface ColumnMeta {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  DATA_LENGTH: number;
}

interface LogDataGridProps {
  tableName: string;
  /** API 경로 베이스 (기본값: /api/mxvc) */
  apiBase?: string;
}

/** 날짜 타입 컬럼인지 판별 */
function isDateType(dataType: string): boolean {
  return /DATE|TIMESTAMP/i.test(dataType);
}

/** 기준일로부터 7일 전 날짜를 YYYY-MM-DD 형태로 반환 */
function weekAgoFrom(base: string): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** 페이지 사이즈 옵션 */
const PAGE_SIZE_OPTIONS = [50, 100, 200];

export default function LogDataGrid({ tableName, apiBase = '/api/mxvc' }: LogDataGridProps) {
  const t = useTranslations('common');
  const { resolvedTheme } = useTheme();
  const serverToday = useServerTime();
  const gridTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [columns, setColumns] = useState<ColumnMeta[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  /* 페이지네이션 상태 */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(0);

  /* 날짜 필터 상태 */
  const [dateCol, setDateCol] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  /* 서버 시간 로드 시 날짜 초기값 설정 */
  useEffect(() => {
    if (serverToday && !toDate) {
      setFromDate(weekAgoFrom(serverToday));
      setToDate(serverToday);
    }
  }, [serverToday, toDate]);

  /** 날짜 타입 컬럼 후보 목록 */
  const dateCols = useMemo(
    () => columns.filter((c) => isDateType(c.DATA_TYPE)),
    [columns],
  );

  /** 테이블 변경 시 컬럼 메타만 가져오기 (데이터는 조회 버튼 클릭 시) */
  useEffect(() => {
    if (!tableName) return;
    setColumns([]);
    setRows([]);
    setTotal(0);
    setTotalPages(0);
    setPage(1);
    setDateCol('');
    setError('');

    (async () => {
      try {
        const res = await fetch(
          `${apiBase}/data?table=${tableName}&metaOnly=1`,
        );
        if (!res.ok) throw new Error('API 오류');
        const data = await res.json();
        setColumns(data.columns ?? []);

        /* 날짜 컬럼 자동 선택 */
        const dateCandidates = (data.columns as ColumnMeta[]).filter((c) =>
          isDateType(c.DATA_TYPE),
        );
        if (dateCandidates.length > 0) {
          setDateCol(dateCandidates[0].COLUMN_NAME);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [tableName]);

  /** 데이터 조회 공통 URL 빌더 */
  const buildUrl = useCallback(
    (opts?: { exportAll?: boolean; p?: number }) => {
      const params = new URLSearchParams({
        table: tableName,
        dateCol,
        from: fromDate,
        to: toDate,
      });
      if (opts?.exportAll) {
        params.set('exportAll', '1');
      } else {
        params.set('page', String(opts?.p ?? page));
        params.set('pageSize', String(pageSize));
      }
      return `${apiBase}/data?${params}`;
    },
    [tableName, dateCol, fromDate, toDate, page, pageSize],
  );

  /** 조회 실행 */
  const fetchData = useCallback(async (p?: number) => {
    if (!tableName) return;
    const targetPage = p ?? 1;
    setPage(targetPage);
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        table: tableName,
        dateCol,
        from: fromDate,
        to: toDate,
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      const res = await fetch(`${apiBase}/data?${params}`);
      if (!res.ok) throw new Error('API 오류');
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tableName, dateCol, fromDate, toDate, pageSize]);

  /** 페이지 이동 */
  const goToPage = useCallback((p: number) => {
    fetchData(p);
  }, [fetchData]);

  /** AG Grid 컬럼 정의 - 메타데이터 기반 동적 생성 */
  const colDefs: ColDef[] = useMemo(() => {
    /* 컬럼 순서는 API에서 정렬되어 옴 */
    return columns.map((col) => {
      const def: ColDef = {
        field: col.COLUMN_NAME,
        headerName: col.COLUMN_NAME,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: 100,
      };

      if (col.COLUMN_NAME === 'RNUM') {
        def.hide = true;
      } else if (isDateType(col.DATA_TYPE)) {
        def.valueFormatter = (params) => {
          if (!params.value) return '';
          const d = new Date(params.value);
          return isNaN(d.getTime()) ? String(params.value) : d.toLocaleString('ko-KR');
        };
        def.minWidth = 160;
      } else if (/NUMBER|FLOAT|DECIMAL/i.test(col.DATA_TYPE)) {
        def.filter = 'agNumberColumnFilter';
        def.type = 'numericColumn';
      } else {
        def.filter = 'agTextColumnFilter';
      }

      return def;
    });
  }, [columns]);

  /** 엑셀 다운로드 — 전체 데이터를 서버에서 조회 */
  const handleExcelExport = useCallback(async () => {
    if (!tableName || total === 0) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        table: tableName,
        dateCol,
        from: fromDate,
        to: toDate,
        exportAll: '1',
      });
      const res = await fetch(`${apiBase}/data?${params}`);
      if (!res.ok) throw new Error('엑셀 데이터 조회 실패');
      const data = await res.json();
      const exportRows = (data.rows ?? []) as Record<string, unknown>[];
      if (exportRows.length === 0) return;

      /* RNUM 컬럼 제거 */
      const cleaned = exportRows.map(({ RNUM, ...rest }) => rest);
      const ws = XLSX.utils.json_to_sheet(cleaned);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, tableName.slice(0, 31));
      XLSX.writeFile(wb, `${tableName}_${serverToday || new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }, [tableName, dateCol, fromDate, toDate, total, serverToday]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  /** 데이터 변경 시 컬럼 폭을 내용에 맞게 자동 조절 */
  const onFirstDataRendered = useCallback(() => {
    gridRef.current?.api?.autoSizeAllColumns();
  }, []);

  if (!tableName) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        좌측에서 테이블을 선택해 주세요
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 필터 바 */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b
                       border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
        {/* 테이블명 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Table</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-300 font-mono">
            {tableName}
          </span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-7 bg-gray-300 dark:bg-gray-700" />

        {/* 날짜 필터 */}
        {dateCols.length > 0 && (
          <div className="flex items-center gap-3">
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="h-9 px-3 text-sm rounded-lg transition-colors
                         bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                         text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">날짜 컬럼 선택</option>
              {dateCols.map((c) => (
                <option key={c.COLUMN_NAME} value={c.COLUMN_NAME}>
                  {c.COLUMN_NAME}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 rounded-lg px-3 h-9
                            bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
              />
              <span className="text-gray-400 dark:text-gray-400">~</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">
            {total.toLocaleString()}건
          </span>

          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`h-9 px-5 text-sm font-medium rounded-lg transition-colors
              ${showFilter
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'}`}
          >
            필터
          </button>

          <button
            onClick={() => fetchData(1)}
            disabled={loading}
            className="h-9 px-5 text-sm font-medium bg-blue-600 hover:bg-blue-500
                       disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500
                       text-white rounded-lg transition-colors"
          >
            {loading ? t('loading') : t('refresh')}
          </button>

          <button
            onClick={handleExcelExport}
            disabled={total === 0 || exporting}
            className="h-9 px-5 text-sm font-medium bg-emerald-600 hover:bg-emerald-500
                       disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500
                       text-white rounded-lg transition-colors"
          >
            {exporting ? '다운로드 중...' : 'Excel 다운로드'}
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* AG Grid */}
      <div className="flex-1">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rows}
          columnDefs={colDefs}
          onGridReady={onGridReady}
          onFirstDataRendered={onFirstDataRendered}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            floatingFilter: showFilter,
            minWidth: 80,
          }}
          animateRows={false}
          enableCellTextSelection={true}
          suppressCellFocus={true}
        />
      </div>

      {/* 서버 사이드 페이지네이션 바 */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-2 border-t
                         border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>페이지당</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 px-2 text-sm rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}건</option>
              ))}
            </select>
            <span className="ml-2">
              전체 <strong>{total.toLocaleString()}</strong>건 중{' '}
              <strong>{((page - 1) * pageSize + 1).toLocaleString()}</strong>~
              <strong>{Math.min(page * pageSize, total).toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={page <= 1 || loading}
              className="h-8 px-3 text-sm rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                         disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ≪
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              className="h-8 px-3 text-sm rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                         disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ＜
            </button>
            <span className="px-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loading}
              className="h-8 px-3 text-sm rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                         disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ＞
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page >= totalPages || loading}
              className="h-8 px-3 text-sm rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                         disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ≫
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
