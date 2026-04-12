/**
 * @file src/components/mxvc/LogEolMasterDetail.tsx
 * @description LOG_EOL 마스터-디테일 그리드.
 * 초보자 가이드:
 * - 상단 마스터 그리드: EQUIPMENT+MODEL+BARCODE 그룹, 행 클릭 시 하단에 디테일 표시
 * - 하단 디테일 그리드: 선택한 바코드의 테스트 스텝별 측정값
 * - 마스터 데이터는 서버 GROUP BY로 가져오고, 디테일은 행 선택 시 별도 조회
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  colorSchemeDark,
  colorSchemeLight,
  themeQuartz,
  type ColDef,
  type RowClickedEvent,
} from 'ag-grid-community';
import { useTheme } from 'next-themes';
import { useServerTime } from '@/hooks/useServerTime';
import Modal from '@/components/ui/Modal';

ModuleRegistry.registerModules([AllCommunityModule]);

const gridParams = { fontSize: 11, headerFontSize: 12, rowHeight: 28, headerHeight: 32 };
const lightTheme = themeQuartz.withPart(colorSchemeLight).withParams(gridParams);
const darkTheme = themeQuartz.withPart(colorSchemeDark).withParams(gridParams);

interface MasterRow {
  EQUIPMENT_ID: string;
  MODEL: string;
  BARCODE: string;
  LINE_CODE: string;
  FIRST_TIME: string;
  ARRAY_RESULT: string;
  LABEL: string;
  PCB_NO: string;
  START_TIME: string;
  END_TIME: string;
  IS_LAST: string;
  IS_SAMPLE: string;
  STEP_COUNT: number;
}

interface Props {
  apiBase?: string;
  /** 선택된 LINE_CODE 필터값 (빈 문자열이면 전체) */
  lineCode?: string;
  /** LINE_CODE 드롭다운 옵션 목록 */
  lineCodes?: string[];
  /** LINE_CODE 변경 콜백 */
  onLineCodeChange?: (v: string) => void;
}

/** 기준일로부터 7일 전 datetime-local 형식 반환 */
function weekAgo(base: string): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10) + 'T00:00';
}

export default function LogEolMasterDetail({ apiBase = '/api/mxvc', lineCode = '', lineCodes = [], onLineCodeChange }: Props) {
  const { resolvedTheme } = useTheme();
  const serverToday = useServerTime();
  const gridTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [detailRows, setDetailRows] = useState<Record<string, unknown>[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMaximized, setDetailMaximized] = useState(false);
  /* 디테일 선택 삭제 */
  const [selectedDetailIds, setSelectedDetailIds] = useState<number[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const masterRef = useRef<AgGridReact>(null);
  const detailRef = useRef<AgGridReact>(null);

  useEffect(() => {
    if (serverToday && !toDate) {
      setFromDate(weekAgo(serverToday));
      setToDate(serverToday + 'T23:59');
    }
  }, [serverToday, toDate]);

  /** 마스터 조회 */
  const fetchMaster = useCallback(async () => {
    setLoading(true);
    setDetailRows([]);
    setSelectedKey('');
    try {
      const p = new URLSearchParams({ mode: 'master', from: fromDate, to: toDate });
      if (lineCode) p.set('lineCode', lineCode);
      const res = await fetch(`${apiBase}/eol?${p}`);
      if (!res.ok) throw new Error('마스터 조회 실패');
      const data = await res.json();
      setMasterRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch { setMasterRows([]); }
    finally { setLoading(false); }
  }, [apiBase, fromDate, toDate, lineCode]);

  /** 디테일 조회 — 마스터 행 클릭 시 */
  const fetchDetail = useCallback(async (row: MasterRow) => {
    const key = `${row.EQUIPMENT_ID}|${row.MODEL}|${row.BARCODE}`;
    if (key === selectedKey) return;
    setSelectedKey(key);
    setDetailLoading(true);
    try {
      const p = new URLSearchParams({
        mode: 'detail',
        equipment: row.EQUIPMENT_ID,
        model: row.MODEL ?? '',
        barcode: row.BARCODE,
      });
      const res = await fetch(`${apiBase}/eol?${p}`);
      if (!res.ok) throw new Error('디테일 조회 실패');
      const data = await res.json();
      setDetailRows(data.rows ?? []);
    } catch { setDetailRows([]); }
    finally { setDetailLoading(false); }
  }, [apiBase, selectedKey]);

  const onMasterRowClicked = useCallback((e: RowClickedEvent<MasterRow>) => {
    if (e.data) fetchDetail(e.data);
  }, [fetchDetail]);

  /** 마스터 컬럼 정의 */
  const masterCols: ColDef<MasterRow>[] = useMemo(() => [
    { field: 'EQUIPMENT_ID', headerName: '설비', minWidth: 130 },
    { field: 'MODEL', headerName: '모델', minWidth: 140 },
    { field: 'BARCODE', headerName: '바코드', minWidth: 200 },
    { field: 'LINE_CODE', headerName: '라인', minWidth: 80 },
    {
      field: 'FIRST_TIME', headerName: '최초시간', minWidth: 160,
      valueFormatter: (p) => {
        if (!p.value) return '';
        const d = new Date(p.value);
        return isNaN(d.getTime()) ? String(p.value) : d.toLocaleString('ko-KR');
      },
    },
    { field: 'ARRAY_RESULT', headerName: '결과', minWidth: 80 },
    { field: 'LABEL', headerName: '라벨', minWidth: 120 },
    { field: 'STEP_COUNT', headerName: '스텝수', minWidth: 80, type: 'numericColumn' },
    { field: 'START_TIME', headerName: '시작시간', minWidth: 140 },
    { field: 'END_TIME', headerName: '종료시간', minWidth: 140 },
    { field: 'IS_LAST', headerName: 'Last', minWidth: 60 },
    { field: 'IS_SAMPLE', headerName: 'Sample', minWidth: 70 },
  ], []);

  /** 디테일 컬럼 정의 (체크박스 + 스텝 컬럼) */
  const detailCols: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      headerCheckboxSelectionFilteredOnly: true,
      width: 50, maxWidth: 50, pinned: 'left',
      suppressMovable: true, sortable: false, filter: false, resizable: false,
    },
    { field: 'NO', headerName: 'No', minWidth: 60, type: 'numericColumn',
      comparator: (a, b) => Number(a) - Number(b),
      valueGetter: (p) => p.data?.NO != null ? Number(p.data.NO) : null },
    { field: 'NAME', headerName: '항목명', minWidth: 140 },
    { field: 'NAME_DETAIL', headerName: '상세', minWidth: 140 },
    { field: 'STEP_RESULT', headerName: '결과', minWidth: 70 },
    { field: 'VOLT_V', headerName: 'Volt', minWidth: 70 },
    { field: 'MIN_1', headerName: 'Min1', minWidth: 70 },
    { field: 'TYP_1', headerName: 'Typ1', minWidth: 70 },
    { field: 'MAX_2', headerName: 'Max1', minWidth: 70 },
    { field: 'MEAS_1', headerName: 'Meas1', minWidth: 80 },
    { field: 'MIN_2', headerName: 'Min2', minWidth: 70 },
    { field: 'TYP_2', headerName: 'Typ2', minWidth: 70 },
    { field: 'MAX_2_2', headerName: 'Max2', minWidth: 70 },
    { field: 'MEAS_2', headerName: 'Meas2', minWidth: 80 },
    { field: 'CAN_STD', headerName: 'CAN기준', minWidth: 80 },
    { field: 'MEAS_CAN', headerName: 'CAN측정', minWidth: 80 },
    { field: 'DTC_CODE', headerName: 'DTC', minWidth: 80 },
    { field: 'MEAS_DTC_CODE', headerName: 'DTC측정', minWidth: 80 },
    { field: 'STEP_TIME', headerName: '스텝시간', minWidth: 80 },
  ], []);

  const defaultColDef: ColDef = useMemo(() => ({
    sortable: true, filter: true, resizable: true, minWidth: 60,
  }), []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 필터 바 */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b
                       border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Table</span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-300 font-mono">LOG_EOL</span>
        </div>
        <div className="w-px h-7 bg-gray-300 dark:bg-gray-700" />
        {/* LINE_CODE 필터 */}
        {lineCodes.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Line</span>
              <select
                value={lineCode}
                onChange={(e) => onLineCodeChange?.(e.target.value)}
                className="h-9 px-3 text-sm rounded-lg transition-colors
                           bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
                           text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">전체</option>
                {lineCodes.map((lc) => (
                  <option key={lc} value={lc}>{lc}</option>
                ))}
              </select>
            </div>
            <div className="w-px h-7 bg-gray-300 dark:bg-gray-700" />
          </>
        )}
        <div className="flex items-center gap-2 rounded-lg px-3 h-9
                        bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
          <input type="datetime-local" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none" />
          <span className="text-gray-400">~</span>
          <input type="datetime-local" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{total.toLocaleString()}건</span>
          <button onClick={fetchMaster} disabled={loading}
            className="h-9 px-5 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-gray-300
                       dark:disabled:bg-gray-700 text-white rounded-lg transition-colors">
            {loading ? '조회 중...' : '새로고침'}
          </button>
        </div>
      </div>

      {/* 마스터 그리드 */}
      <div className={`border-b-2 border-blue-500/30 dark:border-blue-400/30 transition-all ${detailMaximized ? 'h-0 overflow-hidden' : 'h-[45%]'}`}>
        <AgGridReact<MasterRow>
          ref={masterRef}
          theme={gridTheme}
          rowData={masterRows}
          columnDefs={masterCols}
          defaultColDef={defaultColDef}
          rowSelection="single"
          onRowClicked={onMasterRowClicked}
          animateRows={false}
          enableCellTextSelection
          suppressCellFocus
          onFirstDataRendered={() => masterRef.current?.api?.autoSizeAllColumns()}
        />
      </div>

      {/* 디테일 헤더 */}
      <div className="flex items-center justify-between px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400
                       bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
        <span>
          {selectedKey
            ? `상세 스텝: ${selectedKey.split('|')[2]} (${detailRows.length}건)${detailLoading ? ' 조회 중...' : ''}`
            : '마스터 행을 클릭하면 상세 스텝이 표시됩니다'}
        </span>
        {selectedKey && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeleteModalOpen(true)}
              disabled={selectedDetailIds.length === 0}
              className="px-2 py-0.5 text-[11px] rounded bg-red-600 hover:bg-red-500 text-white font-medium
                       disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
            >
              선택 삭제 ({selectedDetailIds.length})
            </button>
            <button
              onClick={() => setDetailMaximized((v) => !v)}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={detailMaximized ? '원래 크기' : '최대화'}
            >
            {detailMaximized ? (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            )}
            </button>
          </div>
        )}
      </div>

      {/* 디테일 그리드 */}
      <div className="flex-1">
        <AgGridReact
          ref={detailRef}
          theme={gridTheme}
          rowData={detailRows}
          columnDefs={detailCols}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
          suppressRowClickSelection={true}
          onSelectionChanged={(e) => {
            const selected = e.api.getSelectedRows() as Record<string, unknown>[];
            setSelectedDetailIds(selected.map((r) => Number(r.LOG_ID)).filter((id) => !isNaN(id)));
          }}
          animateRows={false}
          enableCellTextSelection
          suppressCellFocus
          onFirstDataRendered={() => detailRef.current?.api?.autoSizeAllColumns()}
        />
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="디테일 스텝 삭제 확인"
        subtitle={`LOG_EOL 테이블에서 선택한 스텝 ${selectedDetailIds.length}건 삭제`}
        size="sm"
        footer={
          <div className="flex gap-2">
            <button onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              취소
            </button>
            <button onClick={async () => {
                setDeleting(true);
                setDeleteError('');
                try {
                  const res = await fetch(`${apiBase}/data`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ table: 'LOG_EOL', ids: selectedDetailIds }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || '삭제 실패');
                  }
                  setDeleteModalOpen(false);
                  setSelectedDetailIds([]);
                  /* 디테일 재조회: 현재 선택된 마스터 키로 재호출 (selectedKey 기반) */
                  if (selectedKey) {
                    const [eq, md, bc] = selectedKey.split('|');
                    setDetailLoading(true);
                    try {
                      const params = new URLSearchParams({ mode: 'detail', equipment: eq, model: md, barcode: bc });
                      const r = await fetch(`${apiBase}/eol?${params}`);
                      if (r.ok) {
                        const d = await r.json();
                        setDetailRows(d.rows ?? []);
                      }
                    } finally { setDetailLoading(false); }
                  }
                } catch (e) {
                  setDeleteError((e as Error).message);
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
              className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors font-medium">
              {deleting ? '삭제 중...' : `${selectedDetailIds.length}건 삭제`}
            </button>
          </div>
        }
      >
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p className="mb-3">선택한 <strong className="text-red-500">{selectedDetailIds.length}</strong>건의 스텝 로그를 삭제하시겠습니까?</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">이 작업은 되돌릴 수 없습니다.</p>
          {deleteError && <p className="mt-2 text-xs text-red-500">{deleteError}</p>}
        </div>
      </Modal>
    </div>
  );
}
