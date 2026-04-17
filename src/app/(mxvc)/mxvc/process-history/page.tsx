/**
 * @file src/app/(mxvc)/mxvc/process-history/page.tsx
 * @description 멕시코전장 공정통과이력 — 좌측 사이드 패널 + IQ_MACHINE_INSPECT_RESULT 피벗/리스트 뷰
 *
 * 초보자 가이드:
 * 1. 좌측 패널: 날짜·IS_LAST·뷰·결과필터·SERIAL_NO·RATING_LABEL 입력·조회·엑셀.
 * 2. SERIAL_NO 입력: 부분 일치. RATING_LABEL 입력: IP_PRODUCT_2D_BARCODE 에서
 *    완전 일치 → Top/Bot SERIAL_NO 모두 찾아 공정이력·QC 조회.
 * 3. [조회] 클릭 시 /api/mxvc/process-history 호출.
 * 4. pivot: PID/모델명/Rating Label pinned + WORKSTAGE 별 그룹 3열.
 *    list: 공정별 접기 + 하단 QC 섹션.
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

interface ResolvedSerial {
  serial: string;
  side: string | null;  // PCB_ITEM: 'T'=Top, 'B'=Bottom, 'S'=PBA, ...
}

interface PivotResponse {
  mode: 'pivot';
  workstages: Workstage[];
  rows: Record<string, unknown>[];
  totalRaw: number;
  totalPids: number;
  ratingLabel?: string | null;
  resolvedSerials?: ResolvedSerial[];
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

interface IoRow {
  SERIAL_NO: string;
  WORKSTAGE_CODE: string | null;
  WORKSTAGE_NAME: string | null;
  IO_DEFICIT: string | null;      // 'I'=공정In, 'O'=공정Out
  IO_DATE: string | null;
  OUT_DATE: string | null;
  ACTUAL_DATE: string | null;
  IO_QTY: number | null;
  LINE_CODE: string | null;
  DEST_LINE_CODE: string | null;
  FROM_LINE_CODE: string | null;
  DEST_WORKSTAGE_CODE: string | null;
  MODEL_NAME: string | null;
  SHIFT_CODE: string | null;
  LOT_NO: string | null;
  RUN_NO: string | null;
}

interface ListResponse {
  mode: 'list';
  workstages: Workstage[];
  rows: ListRow[];
  qcRows: QcRow[];
  ioRows: IoRow[];
  totalRaw: number;
  ratingLabel?: string | null;
  resolvedSerials?: ResolvedSerial[];
  error?: string;
}

type ApiResponse = PivotResponse | ListResponse;

interface ResolveResponse {
  top?: string;
  bot?: string;
  matched?: boolean;
  ratingLabel?: string;
  error?: string;
}

export default function ProcessHistoryPage() {
  const serverToday = useServerTime();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [isLast,   setIsLast]   = useState<'Y' | 'N' | 'all'>('Y');
  const [viewMode,  setViewMode] = useState<ViewMode>('list');
  const [resultFilter, setResultFilter] = useState<'all' | 'ok' | 'ng'>('all');
  /* 입력 우선순위: ratingLabel > topSerial > botSerial. 3 개 필드 분리. */
  const [ratingLabel, setRatingLabel] = useState('');
  const [topSerial,   setTopSerial]   = useState('');
  const [botSerial,   setBotSerial]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [data,     setData]     = useState<ApiResponse | null>(null);

  /** RATING_LABEL blur → TOP/BOT 자동 채움. */
  const resolveFromLabel = useCallback(async (label: string) => {
    if (!label.trim()) return;
    try {
      const p = new URLSearchParams({ ratingLabel: label.trim() });
      const res = await fetch(`/api/mxvc/process-history/resolve?${p}`, { cache: 'no-store' });
      const json = (await res.json()) as ResolveResponse;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.matched) {
        if (json.top) setTopSerial(json.top);
        if (json.bot) setBotSerial(json.bot);
      }
    } catch {
      /* 자동 채움 실패는 무시 — 사용자가 직접 입력 가능 */
    }
  }, []);

  /** TOP SERIAL_NO blur → BOT 자동 채움 (F_GET_SMT_BOT_2_TOP). */
  const resolveFromTop = useCallback(async (top: string) => {
    if (!top.trim()) return;
    if (botSerial.trim()) return; // 이미 Bot 있으면 덮어쓰지 않음
    try {
      const p = new URLSearchParams({ topSerial: top.trim() });
      const res = await fetch(`/api/mxvc/process-history/resolve?${p}`, { cache: 'no-store' });
      const json = (await res.json()) as ResolveResponse;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.bot) setBotSerial(json.bot);
    } catch {
      /* 무시 */
    }
  }, [botSerial]);

  useEffect(() => {
    if (serverToday && !dateFrom) {
      setDateFrom(serverToday);
      setDateTo(serverToday);
    }
  }, [serverToday, dateFrom]);

  const handleSearch = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    const rl  = ratingLabel.trim();
    const top = topSerial.trim();
    const bot = botSerial.trim();
    if (viewMode === 'list' && !rl && !top && !bot) {
      setError('노멀 뷰에서는 RATING_LABEL 또는 TOP/BOT SERIAL_NO 중 하나가 필요합니다');
      return;
    }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const p = new URLSearchParams({ dateFrom, dateTo, isLast, mode: viewMode });
      if (rl)  p.set('ratingLabel', rl);
      if (top) p.set('topSerial',   top);
      if (bot) p.set('botSerial',   bot);
      const res = await fetch(`/api/mxvc/process-history?${p}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isLast, ratingLabel, topSerial, botSerial, viewMode]);

  const inputClass = 'w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:dark]';

  const PASS_VALUES = useMemo(() => new Set(['OK', 'PASS', 'GOOD', 'Y']), []);
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

  /** Excel 다운로드 — 2행 헤더(공정 그룹 + 머신/결과/일시) + 데이터 */
  const handleExcelExport = useCallback(() => {
    if (!data || data.rows.length === 0) return;

    /* ── list 모드 엑셀 ── */
    if (data.mode === 'list') {
      const header = ['공정코드', '공정명', '면', 'PID', '모델명', 'Rating Label', '머신', '결과', 'IS_LAST', '검사일시'];
      const dataRows = (data.rows as ListRow[]).map((r) => [
        r.WORKSTAGE_CODE ?? '',
        r.WORKSTAGE_NAME ?? '',
        r.PCB_ITEM ?? '',
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
        { wch: 10 }, { wch: 16 }, { wch: 4 }, { wch: 24 }, { wch: 16 }, { wch: 38 },
        { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, '공정통과이력');

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

    const row0: (string | null)[] = ['', '', '', ''];
    const row1: string[] = ['면', 'PID', '모델명', 'Rating Label'];
    for (const w of ws) {
      const label = `${w.name} (${w.code})`;
      row0.push(label, null, null);
      row1.push('머신', '결과', '일시');
    }

    const dataRows = pivotRows.map((r) => {
      const out: (string | number | null)[] = [
        (r.PCB_ITEM as string) ?? '',
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

    const merges: XLSX.Range[] = [];
    for (let i = 0; i < ws.length; i++) {
      const startCol = 4 + i * 3;  // 면/PID/모델명/RatingLabel = 4 컬럼 이후
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
    }
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
    merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } });
    merges.push({ s: { r: 0, c: 3 }, e: { r: 1, c: 3 } });
    sheet['!merges'] = merges;

    sheet['!cols'] = [
      { wch: 4 }, { wch: 24 }, { wch: 16 }, { wch: 38 },
      ...ws.flatMap(() => [{ wch: 12 }, { wch: 8 }, { wch: 20 }]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '공정통과이력');
    XLSX.writeFile(wb, `공정통과이력_${dateFrom}_${dateTo}.xlsx`);
  }, [data, pivotRows, dateFrom, dateTo]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="공정통과이력" screenId={SCREEN_ID} />

      <div className="flex-1 min-h-0 flex">
        {/* ── 좌측 사이드 패널 ── */}
        <aside className="w-[280px] shrink-0 flex flex-col gap-3 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 p-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">시작일</label>
            <input type="date" value={dateFrom} max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">종료일</label>
            <input type="date" value={dateTo} min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">RATING_LABEL</label>
            <input
              type="text"
              value={ratingLabel}
              onChange={(e) => setRatingLabel(e.target.value)}
              onBlur={(e) => resolveFromLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="RATING"
              className={`${inputClass} font-mono text-[11px]`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">TOP SERIAL_NO</label>
            <input
              type="text"
              value={topSerial}
              onChange={(e) => setTopSerial(e.target.value)}
              onBlur={(e) => resolveFromTop(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="TOP"
              className={`${inputClass} font-mono text-[11px]`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">BOT SERIAL_NO</label>
            <input
              type="text"
              value={botSerial}
              onChange={(e) => setBotSerial(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="BOT"
              className={`${inputClass} font-mono text-[11px]`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">IS_LAST</label>
            <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
              {(['Y', 'N', 'all'] as const).map((v, i) => (
                <button key={v} onClick={() => setIsLast(v)}
                  className={`flex-1 px-2 py-1 transition-colors ${
                    isLast === v
                      ? 'bg-blue-500 text-white font-semibold'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}>
                  {v === 'all' ? '전체' : v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">뷰</label>
            <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
              {([
                { v: 'pivot' as ViewMode, label: '피벗' },
                { v: 'list' as ViewMode,  label: '노멀' },
              ]).map((opt, i) => (
                <button key={opt.v}
                  onClick={() => { setViewMode(opt.v); setData(null); }}
                  className={`flex-1 px-2 py-1 transition-colors ${
                    viewMode === opt.v
                      ? 'bg-blue-500 text-white font-semibold'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'pivot' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">결과 필터</label>
              <div className="flex rounded border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                {([
                  { v: 'all', label: '전체' },
                  { v: 'ok',  label: 'OK만' },
                  { v: 'ng',  label: 'NG만' },
                ] as const).map((opt, i) => (
                  <button key={opt.v} onClick={() => setResultFilter(opt.v)}
                    className={`flex-1 px-2 py-1 transition-colors ${
                      resultFilter === opt.v
                        ? opt.v === 'ok' ? 'bg-green-600 text-white font-semibold'
                          : opt.v === 'ng' ? 'bg-red-600 text-white font-semibold'
                          : 'bg-blue-500 text-white font-semibold'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    } ${i > 0 ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={loading || !dateFrom || !dateTo}
            className="mt-2 w-full rounded bg-blue-500 hover:bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
          >
            {loading ? '조회 중...' : '조회'}
          </button>

          <button
            onClick={handleExcelExport}
            disabled={!data || data.rows.length === 0}
            title="Excel(xlsx) 파일로 저장"
            className="w-full rounded bg-emerald-600 hover:bg-emerald-500 py-1.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Excel 내보내기
          </button>

          {data && (
            <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              {data.mode === 'pivot'
                ? <>표시 <b>{pivotRows.length}</b>건 · PID <b>{(data as PivotResponse).totalPids}</b> · RAW <b>{data.totalRaw}</b></>
                : <>RAW <b>{data.totalRaw}</b>건</>
              }
              {data.totalRaw >= 10000 && <div className="mt-1 text-amber-500">(최대 10000건 제한)</div>}
            </div>
          )}
        </aside>

        {/* ── 우측 메인 영역 ── */}
        <main className="flex-1 min-h-0 flex flex-col">
          {error && (
            <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-0 flex flex-col p-3">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner size="lg" vertical label="공정통과이력 조회 중..." />
              </div>
            ) : data ? (
              data.mode === 'list' ? (
                data.rows.length > 0 || data.qcRows.length > 0 || (data.ioRows?.length ?? 0) > 0 ? (
                  <ProcessHistoryList
                    rows={data.rows as ListRow[]}
                    workstages={data.workstages}
                    qcRows={data.qcRows as QcRow[]}
                    ioRows={data.ioRows as IoRow[]}
                  />
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
                {viewMode === 'list'
                  ? 'RATING_LABEL · TOP · BOT 중 하나를 입력하고 조회 버튼을 누르세요'
                  : '날짜를 선택하고 조회 버튼을 누르세요'}
              </div>
            )}
          </div>
        </main>
      </div>

      <DisplayFooter />
    </div>
  );
}
