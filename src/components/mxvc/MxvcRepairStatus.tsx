/**
 * @file src/components/mxvc/MxvcRepairStatus.tsx
 * @description 멕시코전장 수리현황 메인 컴포넌트 — IP_PRODUCT_WORK_QC 기반
 *
 * 초보자 가이드:
 * 1. /api/mxvc/repair-status 폴링
 * 2. 날짜 범위 필터 + PID 검색 필터
 * 3. CTQ repair-status와 동일 테이블 구조, DisplayLayout 기반
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import DisplayLayout from '@/components/display/DisplayLayout';
import DisplayFooter from '@/components/display/DisplayFooter';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { useServerTime } from '@/hooks/useServerTime';
import RepairStatusTable from '@/components/ctq/RepairStatusTable';
import RepairDefectPie from '@/components/mxvc/repair-status/RepairDefectPie';
import RepairQcResultPie from '@/components/mxvc/repair-status/RepairQcResultPie';
import RepairModelBar from '@/components/mxvc/repair-status/RepairModelBar';
import RepairWorkstageBar from '@/components/mxvc/repair-status/RepairWorkstageBar';
import Spinner from '@/components/ui/Spinner';
import type { RepairStatusRow } from '@/types/ctq/repair-status';

const SCREEN_ID = 'mxvc-repair-status';

interface RepairResponse {
  rows: RepairStatusRow[];
  total: number;
  lastUpdated: string;
}

export default function MxvcRepairStatus() {
  const timing = useDisplayTiming();
  const serverToday = useServerTime();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  useEffect(() => {
    if (serverToday && !dateFrom) {
      setDateFrom(serverToday);
      setDateTo(serverToday);
    }
  }, [serverToday, dateFrom]);

  const [pidInput,        setPidInput]        = useState('');
  const [lineInput,       setLineInput]       = useState('');
  const [workstageInput,  setWorkstageInput]  = useState('');
  const [modelInput,      setModelInput]      = useState('');

  /* 실제 조회에 사용되는 필터 (Enter / 조회 버튼으로 확정) */
  const [pidFilter,       setPidFilter]       = useState('');
  const [lineFilter,      setLineFilter]      = useState('');
  const [workstageFilter, setWorkstageFilter] = useState('');
  const [modelFilter,     setModelFilter]     = useState('');

  /* 새로고침 버튼 강제 재조회용 */
  const [refetchKey, setRefetchKey] = useState(0);

  /* 인풋 최신값 ref — useCallback deps 없이 최신값 접근 */
  const inputsRef = useRef({ pid: '', line: '', workstage: '', model: '' });
  useEffect(() => { inputsRef.current = { pid: pidInput, line: lineInput, workstage: workstageInput, model: modelInput }; }, [pidInput, lineInput, workstageInput, modelInput]);

  const [data,      setData]      = useState<RepairResponse | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!dateFrom) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      if (lineFilter.trim())      params.set('lines',     lineFilter.trim());
      if (workstageFilter.trim()) params.set('workstage', workstageFilter.trim());
      if (modelFilter.trim())     params.set('model',     modelFilter.trim());
      if (pidFilter.trim())       params.set('pid',       pidFilter.trim());
      const res = await fetch(`/api/mxvc/repair-status?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, lineFilter, workstageFilter, modelFilter, pidFilter, refetchKey]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  const handleExcelExport = useCallback(async () => {
    if (!data || data.rows.length === 0) return;
    setExporting(true);
    try {
      const rows = data.rows.map((r) => ({
        'QC일시':       r.qcDate,
        'PID':          r.pid,
        '라인코드':     r.lineCode,
        '라인명':       r.lineName,
        '모델명':       r.modelName,
        '공정':         r.workstageName,
        '수리공정':     r.repairWorkstageName,
        'QC결과':       r.qcResultName,
        '수리결과':     r.repairResultName,
        '입고상태':     r.receiptName,
        '위치':         r.locationCode,
        '불량위치':     r.defectItemCode,
        '불량코드':     r.badReasonCode,
        '불량명':       r.badReasonName,
        '처리':         r.handlingName,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RepairStatus');
      const fileName = `수리현황_${dateFrom || new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } finally {
      setExporting(false);
    }
  }, [data, dateFrom]);

  return (
    <DisplayLayout screenId={SCREEN_ID}>
      <div className="flex h-full flex-col overflow-hidden">

        {/* 조회 조건 바 */}
        <div className="shrink-0 flex flex-wrap items-center gap-3 border-b border-zinc-700 bg-zinc-900 px-4 py-2.5">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">IP_PRODUCT_WORK_QC</span>

          <div className="w-px h-6 bg-zinc-700" />

          {/* 날짜 범위 */}
          <div className="flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 px-2 h-8">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value); }}
              className="bg-transparent text-sm text-zinc-100 focus:outline-none [color-scheme:dark]"
            />
            <span className="text-zinc-500">~</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-sm text-zinc-100 focus:outline-none [color-scheme:dark]"
            />
          </div>

          {/* 라인코드 */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={lineInput}
              onChange={(e) => setLineInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setLineFilter(lineInput); setRefetchKey((k) => k + 1); } }}
              placeholder="라인코드..."
              className="h-8 w-28 rounded border border-zinc-600 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            {lineFilter && (
              <button onClick={() => { setLineInput(''); setLineFilter(''); }} className="h-8 px-2 rounded border border-zinc-600 bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700">✕</button>
            )}
          </div>

          {/* 공정코드 */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={workstageInput}
              onChange={(e) => setWorkstageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setWorkstageFilter(workstageInput); setRefetchKey((k) => k + 1); } }}
              placeholder="공정코드..."
              className="h-8 w-28 rounded border border-zinc-600 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            {workstageFilter && (
              <button onClick={() => { setWorkstageInput(''); setWorkstageFilter(''); }} className="h-8 px-2 rounded border border-zinc-600 bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700">✕</button>
            )}
          </div>

          {/* 품목 */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setModelFilter(modelInput); setRefetchKey((k) => k + 1); } }}
              placeholder="품목..."
              className="h-8 w-32 rounded border border-zinc-600 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            {modelFilter && (
              <button onClick={() => { setModelInput(''); setModelFilter(''); }} className="h-8 px-2 rounded border border-zinc-600 bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700">✕</button>
            )}
          </div>

          {/* PID 검색 */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={pidInput}
              onChange={(e) => setPidInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPidFilter(pidInput); setRefetchKey((k) => k + 1); } }}
              placeholder="PID..."
              className="h-8 w-40 rounded border border-zinc-600 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
            />
            {pidFilter && (
              <button onClick={() => { setPidInput(''); setPidFilter(''); }} className="h-8 px-2 rounded border border-zinc-600 bg-zinc-800 text-xs text-zinc-400 hover:bg-zinc-700">
                ✕
              </button>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2 ml-auto">
            {data && <span className="text-sm text-zinc-400 mr-1">{data.total.toLocaleString()}건</span>}
            <button
              onClick={() => {
                const { pid, line, workstage, model } = inputsRef.current;
                setLineFilter(line);
                setWorkstageFilter(workstage);
                setModelFilter(model);
                setPidFilter(pid);
                setRefetchKey((k) => k + 1);
              }}
              disabled={loading}
              className="h-8 px-4 text-sm font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40"
            >
              {loading ? (
                <Spinner size="sm" label="로딩중" labelClassName="text-white" className="gap-1.5" />
              ) : '새로고침'}
            </button>
            <button
              onClick={handleExcelExport}
              disabled={!data || data.rows.length === 0 || exporting}
              className="h-8 px-4 text-sm font-medium rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
            >
              {exporting ? '다운로드 중...' : 'Excel'}
            </button>
          </div>
        </div>

        {/* 본문 — 좌: 그리드 / 우: 차트 3종 */}
        <main className="min-h-0 flex-1 overflow-hidden flex flex-row">
          {/* 좌측 그리드 영역 (~70%) */}
          <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
            {error && (
              <div className="mx-6 mt-4 rounded-lg border border-red-700 bg-red-900/30 p-4 text-sm text-red-300">
                조회 오류: {error}
              </div>
            )}
            {loading && !data && (
              <Spinner fullscreen size="lg" vertical label="데이터 로딩 중..." />
            )}
            {data && data.rows.length === 0 && (
              <div className="flex items-center justify-center p-16 text-zinc-500">
                해당 기간 수리 현황 데이터가 없습니다.
              </div>
            )}
            {data && data.rows.length > 0 && (
              <RepairStatusTable rows={data.rows} />
            )}
          </section>

          {/* 우측 차트 영역 (30%) */}
          <aside className="w-[32%] min-w-[440px] max-w-[560px] shrink-0 border-l border-zinc-800 bg-zinc-950 overflow-y-auto">
            {data && data.rows.length > 0 ? (
              <div className="flex flex-col divide-y divide-zinc-800">
                {/* 상단: 파이 2개 나란히 */}
                <div className="grid grid-cols-2 divide-x divide-zinc-800">
                  <RepairDefectPie   rows={data.rows} />
                  <RepairQcResultPie rows={data.rows} />
                </div>
                <RepairModelBar     rows={data.rows} />
                <RepairWorkstageBar rows={data.rows} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-xs text-zinc-600">
                조회 데이터가 있으면<br />차트가 표시됩니다.
              </div>
            )}
          </aside>
        </main>

        <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
      </div>
    </DisplayLayout>
  );
}
