/**
 * @file src/app/(mxvc)/mxvc/process-history/page.tsx
 * @description 멕시코전장 공정통과이력 — IQ_MACHINE_INSPECT_RESULT 기반 피벗 그리드
 *
 * 초보자 가이드:
 * 1. 상단 필터: 날짜 구간 + IS_LAST (Y/N/전체)
 * 2. [조회] 클릭 시 /api/mxvc/process-history 호출
 * 3. 서버가 PID 행 + WORKSTAGE_CODE 열로 피벗해 반환
 * 4. 그리드: PID/모델명 pinned + WORKSTAGE별 머신/결과/일시 3열 그룹
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import ProcessHistoryGrid, { type Workstage } from '@/components/mxvc/ProcessHistoryGrid';
import ProcessHistoryList, { type ListRow } from '@/components/mxvc/ProcessHistoryList';
import Spinner from '@/components/ui/Spinner';
import { useServerTime } from '@/hooks/useServerTime';

type ViewMode = 'pivot' | 'list';

const SCREEN_ID = 'mxvc-process-history';

interface ResolvedLabel {
  originalLabel: string;
  resolvedSerial: string;
}

interface PivotResponse {
  mode: 'pivot';
  workstages: Workstage[];
  rows: Record<string, unknown>[];
  totalRaw: number;
  totalPids: number;
  resolvedLabel?: ResolvedLabel | null;
  error?: string;
}

interface QcRow {
  SERIAL_NO: string;
  WORKSTAGE_CODE: string | null;
  MACHINE_CODE: string | null;
  QC_RESULT: string | null;
  QC_DATE: string | null;
  BAD_REASON_CODE: string | null;
  BAD_POSITION: string | null;
  LOCATION_CODE: string | null;
  REPAIR_RESULT_CODE: string | null;
  REPAIR_DATE: string | null;
  FILE_NAME: string | null;
}

interface ListResponse {
  mode: 'list';
  workstages: Workstage[];
  rows: ListRow[];
  qcRows: QcRow[];
  totalRaw: number;
  resolvedLabel?: ResolvedLabel | null;
  error?: string;
}

type ApiResponse = PivotResponse | ListResponse;

export default function ProcessHistoryPage() {
  const serverToday = useServerTime();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [isLast,   setIsLast]   = useState<'Y' | 'N' | 'all'>('Y');
  const [viewMode,  setViewMode] = useState<ViewMode>('pivot');
  const [resultFilter, setResultFilter] = useState<'all' | 'ok' | 'ng'>('all');
  const [pid,      setPid]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [data,     setData]     = useState<ApiResponse | null>(null);

  useEffect(() => {
    if (serverToday && !dateFrom) {
      setDateFrom(serverToday);
      setDateTo(serverToday);
    }
  }, [serverToday, dateFrom]);

  const handleSearch = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    if (viewMode === 'list' && !pid.trim()) {
      setError('노멀 뷰에서는 PID를 입력해야 합니다');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const p = new URLSearchParams({ dateFrom, dateTo, isLast, mode: viewMode });
      const trimmed = pid.trim();
      if (trimmed) p.set('pid', trimmed);
      const res = await fetch(`/api/mxvc/process-history?${p}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isLast, pid, viewMode]);

  const inputClass = 'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:dark]';

  /**
   * 결과 필터 — PID(행) 단위.
   * - all: 전체
   * - ok: 해당 PID의 모든 결과가 PASS 계열(OK/PASS/GOOD/Y)인 경우만
   * - ng: 해당 PID에 하나라도 PASS가 아닌 결과가 있는 경우
   */
  const PASS_VALUES = useMemo(() => new Set(['OK', 'PASS', 'GOOD', 'Y']), []);
  /** pivot 모드 전용: 결과 필터 적용된 행 */
  const pivotRows = useMemo((): Record<string, unknown>[] => {
    if (!data || data.mode !== 'pivot') return [];
    if (resultFilter === 'all') return data.rows;
    return data.rows.filter((row) => {
      const results = Object.entries(row)
        .filter(([k, v]) => k.endsWith('__RESULT') && v != null && v !== '')
        .map(([, v]) => String(v).toUpperCase());
      if (results.length === 0) return false;
      if (resultFilter === 'ok') return results.every((r) => PASS_VALUES.has(r));
      return results.some((r) => !PASS_VALUES.has(r));
    });
  }, [data, resultFilter, PASS_VALUES]);

  /**
   * Excel 다운로드 — 2행 헤더(공정 그룹 + 머신/결과/일시) + 데이터.
   * 공정 그룹 헤더는 XLSX 병합 셀로 표현해 그리드와 동일한 계층 구조.
   */
  const handleExcelExport = useCallback(() => {
    if (!data || data.rows.length === 0) return;

    /* ── list 모드 엑셀 ── */
    if (data.mode === 'list') {
      const header = ['공정코드', '공정명', 'PID', '모델명', 'Rating Label', '머신', '결과', 'IS_LAST', '검사일시'];
      const dataRows = (data.rows as ListRow[]).map((r) => [
        r.WORKSTAGE_CODE ?? '',
        r.WORKSTAGE_NAME ?? '',
        r.PID ?? '',
        r.MODEL_NAME ?? '',
        r.RATING_LABEL ?? '',
        r.MACHINE_CODE ?? '',
        r.INSPECT_RESULT ?? '',
        r.IS_LAST ?? '',
        r.INSPECT_DATE ?? '',
      ]);
      const sheet = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
      sheet['!cols'] = [
        { wch: 10 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 38 },
        { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, '공정통과이력');

      /* QC 시트 */
      const qcRows = (data as ListResponse).qcRows ?? [];
      if (qcRows.length > 0) {
        const qcHeader = ['SERIAL_NO', '공정', '머신', '결과', '검사일시', '불량코드', '불량위치', '위치', '수리결과', '수리일시', '파일명'];
        const qcData = qcRows.map((r: QcRow) => [
          r.SERIAL_NO ?? '', r.WORKSTAGE_CODE ?? '', r.MACHINE_CODE ?? '',
          r.QC_RESULT ?? '', r.QC_DATE ?? '', r.BAD_REASON_CODE ?? '',
          r.BAD_POSITION ?? '', r.LOCATION_CODE ?? '', r.REPAIR_RESULT_CODE ?? '',
          r.REPAIR_DATE ?? '', r.FILE_NAME ?? '',
        ]);
        const qcSheet = XLSX.utils.aoa_to_sheet([qcHeader, ...qcData]);
        qcSheet['!cols'] = [
          { wch: 24 }, { wch: 8 }, { wch: 12 }, { wch: 6 }, { wch: 20 },
          { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 40 },
        ];
        XLSX.utils.book_append_sheet(wb, qcSheet, 'QC검사');
      }

      XLSX.writeFile(wb, `공정통과이력_노멀_${dateFrom}_${dateTo}.xlsx`);
      return;
    }

    /* ── pivot 모드 엑셀 ── */
    if (pivotRows.length === 0) return;
    const ws = data.workstages;

    /* Row 0: 공정 그룹 헤더 (PID/모델명/Rating Label 은 빈칸, 공정은 3칸 병합 예정) */
    const row0: (string | null)[] = ['', '', ''];
    /* Row 1: 세부 컬럼 헤더 */
    const row1: string[] = ['PID', '모델명', 'Rating Label'];
    for (const w of ws) {
      const label = `${w.name} (${w.code})`;
      row0.push(label, null, null);  // 3칸 중 첫 번째만 값, 나머지는 병합
      row1.push('머신', '결과', '일시');
    }

    /* 데이터 행 */
    const dataRows = pivotRows.map((r) => {
      const out: (string | number | null)[] = [
        (r.PID as string) ?? '',
        (r.MODEL_NAME as string) ?? '',
        (r.RATING_LABEL as string) ?? '',
      ];
      for (const w of ws) {
        out.push((r[`${w.code}__MACHINE`] as string) ?? '');
        out.push((r[`${w.code}__RESULT`]  as string) ?? '');
        out.push((r[`${w.code}__DATE`]    as string) ?? '');
      }
      return out;
    });

    const aoa: (string | number | null)[][] = [row0, row1, ...dataRows];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);

    /* 공정 그룹 헤더 병합 (r=0 행, 각 공정마다 3열 병합) */
    const merges: XLSX.Range[] = [];
    for (let i = 0; i < ws.length; i++) {
      const startCol = 3 + i * 3;   // PID(0), 모델명(1), Rating Label(2) 다음부터
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
    }
    /* PID / 모델명 / Rating Label 도 0~1 행 세로 병합 */
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
    merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
    sheet['!merges'] = merges;

    /* 컬럼 폭 */
    const cols = [
      { wch: 24 }, // PID
      { wch: 16 }, // 모델명
      { wch: 38 }, // Rating Label
      ...ws.flatMap(() => [{ wch: 12 }, { wch: 8 }, { wch: 20 }]),
    ];
    sheet['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '공정통과이력');
    const fileName = `공정통과이력_${dateFrom}_${dateTo}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [data, pivotRows, dateFrom, dateTo]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="공정통과이력" screenId={SCREEN_ID} />

      {/* 상단 필터 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">시작일</span>
          <input type="date" value={dateFrom} max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">종료일</span>
          <input type="date" value={dateTo} min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">PID</span>
          <input
            type="text"
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="PID(SERIAL_NO) 부분일치 또는 RATING_LABEL 완전일치"
            className={`${inputClass} w-64 font-mono`}
          />
          {pid && (
            <button
              type="button"
              onClick={() => setPid('')}
              className="text-xs text-blue-500 hover:text-blue-400"
            >
              초기화
            </button>
          )}
        </label>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">IS_LAST</span>
          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
            {(['Y', 'N', 'all'] as const).map((v, i) => (
              <button
                key={v}
                onClick={() => setIsLast(v)}
                className={`px-2.5 py-1 transition-colors ${
                  isLast === v
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}
              >
                {v === 'all' ? '전체' : v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">뷰</span>
          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
            {([
              { v: 'pivot' as ViewMode, label: '피벗' },
              { v: 'list' as ViewMode,  label: '노멀' },
            ]).map((opt, i) => (
              <button
                key={opt.v}
                onClick={() => { setViewMode(opt.v); setData(null); }}
                className={`px-2.5 py-1 transition-colors ${
                  viewMode === opt.v
                    ? 'bg-blue-500 text-white font-semibold'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'pivot' && <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">결과</span>
          <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
            {([
              { v: 'all', label: '전체' },
              { v: 'ok',  label: 'OK만' },
              { v: 'ng',  label: 'NG만' },
            ] as const).map((opt, i) => (
              <button
                key={opt.v}
                onClick={() => setResultFilter(opt.v)}
                className={`px-2.5 py-1 transition-colors ${
                  resultFilter === opt.v
                    ? opt.v === 'ok' ? 'bg-green-600 text-white font-semibold'
                      : opt.v === 'ng' ? 'bg-red-600 text-white font-semibold'
                      : 'bg-blue-500 text-white font-semibold'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>}

        <button
          onClick={handleSearch}
          disabled={loading || !dateFrom || !dateTo}
          className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? '조회 중...' : '조회'}
        </button>

        <button
          onClick={handleExcelExport}
          disabled={!data || data.rows.length === 0}
          title="Excel(xlsx) 파일로 저장"
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Excel
        </button>

        {data && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {data.mode === 'pivot'
              ? <>표시 {pivotRows.length}건 / PID {(data as PivotResponse).totalPids} · RAW {data.totalRaw}</>
              : <>RAW {data.totalRaw}건</>
            }
            {data.totalRaw >= 10000 && <span className="ml-1 text-amber-500">(최대 10000건 제한)</span>}
          </span>
        )}
      </div>

      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {data?.resolvedLabel && (
        <div className="shrink-0 flex items-center gap-2 px-6 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs">
          <span>📦</span>
          <span>
            입력값 <span className="font-mono font-semibold">{data.resolvedLabel.originalLabel}</span>
            {' '}이 RATING_LABEL 과 일치하여{' '}
            SERIAL_NO <span className="font-mono font-semibold">{data.resolvedLabel.resolvedSerial}</span>
            {' '}로 변환 조회했습니다.
          </span>
        </div>
      )}

      {/* 그리드 / 리스트 */}
      <div className="flex-1 min-h-0 flex flex-col p-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" vertical label="공정통과이력 조회 중..." />
          </div>
        ) : data ? (
          data.mode === 'list' ? (
            data.rows.length > 0 || data.qcRows.length > 0 ? (
              <ProcessHistoryList rows={data.rows as ListRow[]} workstages={data.workstages} qcRows={data.qcRows as QcRow[]} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                해당 조건에 데이터가 없습니다
              </div>
            )
          ) : pivotRows.length > 0 ? (
            <ProcessHistoryGrid rows={pivotRows} workstages={data.workstages} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              {data.rows.length === 0 ? '해당 조건에 데이터가 없습니다' : '결과 필터 조건에 해당하는 행이 없습니다'}
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            {viewMode === 'list' ? 'PID를 입력하고 조회 버튼을 누르세요' : '날짜를 선택하고 조회 버튼을 누르세요'}
          </div>
        )}
      </div>

      <DisplayFooter />
    </div>
  );
}
