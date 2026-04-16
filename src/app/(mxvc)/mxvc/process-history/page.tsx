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
import Spinner from '@/components/ui/Spinner';
import { useServerTime } from '@/hooks/useServerTime';

const SCREEN_ID = 'mxvc-process-history';

interface ApiResponse {
  workstages: Workstage[];
  rows: Record<string, unknown>[];
  totalRaw: number;
  totalPids: number;
  error?: string;
}

export default function ProcessHistoryPage() {
  const serverToday = useServerTime();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [isLast,   setIsLast]   = useState<'Y' | 'N' | 'all'>('Y');
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
    setLoading(true);
    setError('');
    setData(null);
    try {
      const p = new URLSearchParams({ dateFrom, dateTo, isLast });
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
  }, [dateFrom, dateTo, isLast, pid]);

  const inputClass = 'rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 [color-scheme:dark]';

  /**
   * 결과 필터 — PID(행) 단위.
   * - all: 전체
   * - ok: 해당 PID의 모든 결과가 PASS 계열(OK/PASS/GOOD/Y)인 경우만
   * - ng: 해당 PID에 하나라도 PASS가 아닌 결과가 있는 경우
   */
  const PASS_VALUES = useMemo(() => new Set(['OK', 'PASS', 'GOOD', 'Y']), []);
  const filteredRows = useMemo(() => {
    if (!data) return [];
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
    if (!data || filteredRows.length === 0) return;
    const ws = data.workstages;

    /* Row 0: 공정 그룹 헤더 (PID/모델명은 빈칸, 공정은 3칸 병합 예정) */
    const row0: (string | null)[] = ['', ''];
    /* Row 1: 세부 컬럼 헤더 */
    const row1: string[] = ['PID', '모델명'];
    for (const w of ws) {
      const label = `${w.name} (${w.code})`;
      row0.push(label, null, null);  // 3칸 중 첫 번째만 값, 나머지는 병합
      row1.push('머신', '결과', '일시');
    }

    /* 데이터 행 */
    const dataRows = filteredRows.map((r) => {
      const out: (string | number | null)[] = [
        (r.PID as string) ?? '',
        (r.MODEL_NAME as string) ?? '',
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
      const startCol = 2 + i * 3;   // PID(0), 모델명(1) 다음부터
      merges.push({ s: { r: 0, c: startCol }, e: { r: 0, c: startCol + 2 } });
    }
    /* PID / 모델명도 0~1 행 세로 병합 */
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } });
    sheet['!merges'] = merges;

    /* 컬럼 폭 */
    const cols = [
      { wch: 24 }, // PID
      { wch: 16 }, // 모델명
      ...ws.flatMap(() => [{ wch: 12 }, { wch: 8 }, { wch: 20 }]),
    ];
    sheet['!cols'] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, '공정통과이력');
    const fileName = `공정통과이력_${dateFrom}_${dateTo}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [data, filteredRows, dateFrom, dateTo]);

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
            placeholder="PID 부분일치 (대소문자 무시)"
            className={`${inputClass} w-56 font-mono`}
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
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !dateFrom || !dateTo}
          className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? '조회 중...' : '조회'}
        </button>

        <button
          onClick={handleExcelExport}
          disabled={!data || filteredRows.length === 0}
          title="Excel(xlsx) 파일로 저장"
          className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Excel
        </button>

        {data && (
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            표시 {filteredRows.length}건 / PID {data.totalPids} · RAW {data.totalRaw}
            {data.totalRaw >= 10000 && <span className="ml-1 text-amber-500">(최대 10000건 제한)</span>}
          </span>
        )}
      </div>

      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 그리드 */}
      <div className="flex-1 min-h-0 flex flex-col p-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" vertical label="공정통과이력 조회 중..." />
          </div>
        ) : data ? (
          filteredRows.length > 0 ? (
            <ProcessHistoryGrid rows={filteredRows} workstages={data.workstages} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              {data.rows.length === 0 ? '해당 조건에 데이터가 없습니다' : '결과 필터 조건에 해당하는 행이 없습니다'}
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            날짜를 선택하고 조회 버튼을 누르세요
          </div>
        )}
      </div>

      <DisplayFooter />
    </div>
  );
}
