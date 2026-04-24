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
import { useServerTime, useServerNow } from '@/hooks/useServerTime';
import Modal from '@/components/ui/Modal';

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
  /** 선택된 LINE_CODE 필터값 (빈 문자열이면 전체) */
  lineCode?: string;
  /** LINE_CODE 드롭다운 옵션 목록 */
  lineCodes?: string[];
  /** LINE_CODE 변경 콜백 */
  onLineCodeChange?: (v: string) => void;
}

/** 날짜 타입 컬럼인지 판별 */
function isDateType(dataType: string): boolean {
  return /DATE|TIMESTAMP/i.test(dataType);
}

/** 기준일로부터 7일 전 날짜+시간을 YYYY-MM-DDTHH:mm 형태로 반환 */
function weekAgoFrom(base: string): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10) + 'T00:00';
}

/** 페이지 사이즈 옵션 */
const PAGE_SIZE_OPTIONS = [50, 100, 200];

export default function LogDataGrid({ tableName, apiBase = '/api/mxvc', lineCode = '', lineCodes = [], onLineCodeChange }: LogDataGridProps) {
  const t = useTranslations('common');
  const tg = useTranslations('mxvc.logData');
  const { resolvedTheme } = useTheme();
  const serverToday = useServerTime();
  const serverNow = useServerNow();
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

  /* 삭제 관련 상태 */
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    if (serverToday && serverNow && !toDate) {
      setFromDate(weekAgoFrom(serverToday));
      setToDate(serverNow);
    }
  }, [serverToday, serverNow, toDate]);

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
        if (!res.ok) throw new Error(tg('apiError'));
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
      if (lineCode) params.set('lineCode', lineCode);
      if (opts?.exportAll) {
        params.set('exportAll', '1');
      } else {
        params.set('page', String(opts?.p ?? page));
        params.set('pageSize', String(pageSize));
      }
      return `${apiBase}/data?${params}`;
    },
    [tableName, dateCol, fromDate, toDate, lineCode, page, pageSize],
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
      if (lineCode) params.set('lineCode', lineCode);
      const res = await fetch(`${apiBase}/data?${params}`);
      if (!res.ok) throw new Error(tg('apiError'));
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tableName, dateCol, fromDate, toDate, lineCode, pageSize]);

  /** 페이지 이동 */
  const goToPage = useCallback((p: number) => {
    fetchData(p);
  }, [fetchData]);

  /** AG Grid 컬럼 정의 - 메타데이터 기반 동적 생성 */
  const colDefs: ColDef[] = useMemo(() => {
    const defs: ColDef[] = [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        width: 50,
        maxWidth: 50,
        pinned: 'left',
        suppressMovable: true,
        sortable: false,
        filter: false,
        resizable: false,
      },
    ];
    /* 컬럼 순서는 API에서 정렬되어 옴 */
    columns.forEach((col) => {
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

      defs.push(def);
    });
    return defs;
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
      if (lineCode) params.set('lineCode', lineCode);
      const res = await fetch(`${apiBase}/data?${params}`);
      if (!res.ok) throw new Error(tg('excelFetchError'));
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

  /** 선택 행 삭제 */
  const handleDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/data`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: tableName, ids: selectedIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tg('deleteFailed'));
      }
      setDeleteModalOpen(false);
      setSelectedIds([]);
      fetchData(page);
    } catch (e) {
      setError((e as Error).message);
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, tableName, apiBase, fetchData, page]);

  if (!tableName) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        {tg('selectInfo')}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-zinc-700 bg-zinc-900">
        {/* 테이블명 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{tg('table')}</span>
          <span className="text-sm font-bold text-blue-300 font-mono">{tableName}</span>
        </div>

        <div className="w-px h-6 bg-zinc-700" />

        {/* LINE_CODE 필터 */}
        {lineCodes.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{tg('line')}</span>
              <select
                value={lineCode}
                onChange={(e) => onLineCodeChange?.(e.target.value)}
                className="h-8 px-2 text-sm rounded border border-zinc-600 bg-zinc-800 text-zinc-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
              >
                <option value="">{tg('all')}</option>
                {lineCodes.map((lc) => <option key={lc} value={lc}>{lc}</option>)}
              </select>
            </div>
            <div className="w-px h-6 bg-zinc-700" />
          </>
        )}

        {/* 날짜 필터 */}
        {dateCols.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="h-8 px-2 text-sm rounded border border-zinc-600 bg-zinc-800 text-zinc-100 focus:outline-none focus:border-blue-500 [color-scheme:dark]"
            >
              <option value="">{tg('dateColSelect')}</option>
              {dateCols.map((c) => <option key={c.COLUMN_NAME} value={c.COLUMN_NAME}>{c.COLUMN_NAME}</option>)}
            </select>
            <div className="flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 px-2 h-8">
              <input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-sm text-zinc-100 focus:outline-none [color-scheme:dark]"
              />
              <span className="text-zinc-500">~</span>
              <input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-sm text-zinc-100 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-zinc-400 mr-1">{tg('countSuffix', { count: total.toLocaleString() })}</span>

          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`h-8 px-4 text-sm font-medium rounded transition-colors ${
              showFilter ? 'bg-indigo-600 text-white' : 'border border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {tg('filter')}
          </button>

          <button
            onClick={() => setDeleteModalOpen(true)}
            disabled={selectedIds.length === 0}
            className="h-8 px-4 text-sm font-medium rounded bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-40"
          >
            {tg('deleteSelected', { count: selectedIds.length })}
          </button>

          <button
            onClick={() => fetchData(1)}
            disabled={loading}
            className="h-8 px-4 text-sm font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40"
          >
            {loading ? t('loading') : t('refresh')}
          </button>

          <button
            onClick={handleExcelExport}
            disabled={total === 0 || exporting}
            className="h-8 px-4 text-sm font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
          >
            {exporting ? tg('excelDownloading') : tg('excelLabel')}
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="px-4 py-2 text-sm text-red-400 bg-red-900/20 border-b border-red-800">
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
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onSelectionChanged={(e) => {
            const selected = e.api.getSelectedRows() as Record<string, unknown>[];
            setSelectedIds(selected.map((r) => Number(r.LOG_ID)).filter((id) => !isNaN(id)));
          }}
          animateRows={false}
          enableCellTextSelection={true}
          suppressCellFocus={true}
        />
      </div>

      {/* 서버 사이드 페이지네이션 바 */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-700 bg-zinc-900">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>{tg('pagePer')}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="h-7 px-2 text-sm rounded border border-zinc-600 bg-zinc-800 text-zinc-100 [color-scheme:dark]"
            >
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{tg('countSuffix', { count: s })}</option>)}
            </select>
            <span className="ml-1">
              {tg('totalInfo', {
                total: total.toLocaleString(),
                start: ((page - 1) * pageSize + 1).toLocaleString(),
                end: Math.min(page * pageSize, total).toLocaleString(),
              })}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {(['≪', '＜'] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => goToPage(i === 0 ? 1 : page - 1)}
                disabled={(i === 0 ? page <= 1 : page <= 1) || loading}
                className="h-7 px-3 text-sm rounded border border-zinc-600 bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition-colors"
              >{label}</button>
            ))}
            <span className="px-3 text-sm font-medium text-zinc-300">{page} / {totalPages}</span>
            {(['＞', '≫'] as const).map((label, i) => (
              <button
                key={label}
                onClick={() => goToPage(i === 0 ? page + 1 : totalPages)}
                disabled={(i === 0 ? page >= totalPages : page >= totalPages) || loading}
                className="h-7 px-3 text-sm rounded border border-zinc-600 bg-zinc-800 text-zinc-300 disabled:opacity-40 hover:bg-zinc-700 transition-colors"
              >{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={tg('deleteConfirm')}
        subtitle={tg('deleteSubtitle', { table: tableName, count: selectedIds.length })}
        size="sm"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500
                         disabled:opacity-50 transition-colors font-medium"
            >
              {deleting ? tg('deleting') : tg('deleteBtn', { count: selectedIds.length })}
            </button>
          </div>
        }
      >
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="mb-3">{tg('deleteConfirmMsg', { table: tableName, count: selectedIds.length })}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{tg('deleteHint')}</p>
        </div>
      </Modal>
    </div>
  );
}
