/**
 * @file src/app/(mxvc)/mxvc/traceability/page.tsx
 * @description 멕시코전장 추적성분석 — RUN_NO 기반 바코드 목록 + 추적성 조회.
 * 초보자 가이드:
 * 1. 상단: RUN_NO 입력 → 조회 → 좌측 사이드바에 SERIAL_NO 목록 표시
 * 2. 사이드바: 바코드 목록 + 찾기 필터 (직접 바코드 입력 시 단건 조회)
 * 3. 바코드 선택 시 우측에 추적성 결과 (마스터 + 공정별/타임라인)
 */
'use client';

import { useState, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceabilityMaster from '@/components/mxvc/TraceabilityMaster';
import TraceabilityTimeline from '@/components/mxvc/TraceabilityTimeline';
import RunCardSearchModal from '@/components/mxvc/RunCardSearchModal';
import type { TraceabilityResponse } from '@/types/mxvc/traceability';

const SCREEN_ID = 'mxvc-traceability';

interface BarcodeItem {
  SERIAL_NO: string;
  PCB_ITEM: string | null;
}

export default function TraceabilityPage() {
  /* RUN_NO & 바코드 목록 */
  const [runNo, setRunNo] = useState('');
  const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  /* 선택된 바코드 & 추적성 결과 */
  const [selectedBarcode, setSelectedBarcode] = useState('');
  const [data, setData] = useState<TraceabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* 옵션 */
  const [includeMaterial, setIncludeMaterial] = useState(false);
  const [viewMode, setViewMode] = useState<'process' | 'timeline'>('process');

  /* 사이드바 찾기 */
  const [search, setSearch] = useState('');
  /* RUN NO 조회 모달 */
  const [showRunCardModal, setShowRunCardModal] = useState(false);

  /** RUN_NO로 바코드 목록 조회 */
  const handleRunNoSearch = useCallback(async () => {
    const trimmed = runNo.trim();
    if (!trimmed) return;
    setListLoading(true);
    setBarcodes([]);
    setSelectedBarcode('');
    setData(null);
    setError('');
    try {
      const res = await fetch(`/api/mxvc/traceability/barcodes?runNo=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBarcodes(json.barcodes ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [runNo]);

  /** 바코드로 추적성 조회 */
  const fetchTraceability = useCallback(async (barcode: string) => {
    if (!barcode) return;
    setSelectedBarcode(barcode);
    setLoading(true);
    setError('');
    setData(null);
    try {
      const params = new URLSearchParams({ barcode });
      if (includeMaterial) params.set('material', '1');
      const res = await fetch(`/api/mxvc/traceability?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TraceabilityResponse = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [includeMaterial]);

  /** 사이드바 찾기에서 Enter → 목록 필터 or 직접 바코드 조회 */
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    const trimmed = search.trim();
    if (!trimmed) return;
    /* 목록에 없는 값이면 직접 바코드 단건 조회 */
    const found = barcodes.some((b) => b.SERIAL_NO.includes(trimmed));
    if (!found && trimmed.length > 10) {
      fetchTraceability(trimmed);
    }
  };

  /** 필터된 바코드 목록 */
  const filteredBarcodes = search.trim()
    ? barcodes.filter((b) => b.SERIAL_NO.includes(search.trim().toUpperCase()))
    : barcodes;

  const resultCount = data?.timeline?.length ?? 0;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 추적성분석" screenId={SCREEN_ID} />

      {/* 상단 바: RUN_NO 입력 + 옵션 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold shrink-0">RUN NO</span>
          <input
            type="text"
            value={runNo}
            onChange={(e) => setRunNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRunNoSearch()}
            placeholder="작업지시번호 입력"
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-sm w-48 placeholder:text-gray-400"
          />
        </label>
        <button
          onClick={() => setShowRunCardModal(true)}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors"
        >
          작업지시 검색
        </button>
        <button
          onClick={handleRunNoSearch}
          disabled={listLoading}
          className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold
                     disabled:opacity-50 transition-colors"
        >
          바코드 조회
        </button>

        <button
          onClick={() => selectedBarcode && fetchTraceability(selectedBarcode)}
          disabled={!selectedBarcode || loading}
          className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          추적조회
        </button>

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />

        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeMaterial}
            onChange={(e) => setIncludeMaterial(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600"
          />
          자재포함
        </label>

        {/* 뷰 모드 토글 */}
        {data && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('process')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'process'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                공정별
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                타임라인
              </button>
            </div>
          </>
        )}

        <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {data && `${resultCount}개 이벤트`}
        </div>
      </div>

      {/* 에러 바 */}
      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 메인: 사이드바 + 콘텐츠 */}
      <div className="flex-1 flex min-h-0">
        {/* 좌측 사이드바: 바코드 목록 */}
        <aside className="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col
                          bg-gray-50 dark:bg-gray-900">
          {/* 찾기 */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="바코드 찾기 (Enter: 직접 조회)"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         placeholder:text-gray-400 focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
              <span>{filteredBarcodes.length} / {barcodes.length}건</span>
              {search && (
                <button onClick={() => setSearch('')} className="text-blue-500 hover:text-blue-400">
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto">
            {listLoading && (
              <div className="flex items-center justify-center py-8 text-xs text-gray-400">
                <span className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin mr-2" />
                조회 중...
              </div>
            )}
            {!listLoading && barcodes.length === 0 && (
              <div className="flex items-center justify-center py-8 text-xs text-gray-400 dark:text-gray-500">
                RUN NO를 입력하고 조회하세요
              </div>
            )}
            {filteredBarcodes.map((b) => (
              <button
                key={b.SERIAL_NO}
                onClick={() => setSelectedBarcode(b.SERIAL_NO)}
                className={`w-full text-left px-3 py-1 text-xs border-b border-gray-100 dark:border-gray-800
                  transition-colors flex items-center gap-2 ${
                    selectedBarcode === b.SERIAL_NO
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-2 border-l-blue-500'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }`}
              >
                <span className="font-mono truncate flex-1">{b.SERIAL_NO}</span>
                {b.PCB_ITEM && <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{b.PCB_ITEM}</span>}
              </button>
            ))}
          </div>

        </aside>

        {/* 우측: 추적성 결과 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-500 dark:text-gray-400">추적성 데이터 취합 중입니다...</span>
            </div>
          ) : data ? (
            <div className="space-y-4 pb-4">
              <TraceabilityMaster
                master={data.master}
                runCard={data.runCard}
                modelMaster={data.modelMaster}
              />
              <TraceabilityTimeline events={data.timeline} queriedTables={data.queriedTables} viewMode={viewMode} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              {barcodes.length > 0 ? '좌측에서 바코드를 선택하세요' : 'RUN NO를 조회하세요'}
            </div>
          )}
        </div>
      </div>

      <DisplayFooter />

      {/* RUN NO 조회 모달 */}
      <RunCardSearchModal
        isOpen={showRunCardModal}
        onClose={() => setShowRunCardModal(false)}
        onSelect={(selectedRunNo) => {
          setRunNo(selectedRunNo);
          /* 선택 후 자동 바코드 목록 조회 */
          setBarcodes([]);
          setSelectedBarcode('');
          setData(null);
          setListLoading(true);
          fetch(`/api/mxvc/traceability/barcodes?runNo=${encodeURIComponent(selectedRunNo)}`)
            .then((res) => res.json())
            .then((json) => setBarcodes(json.barcodes ?? []))
            .catch(() => {})
            .finally(() => setListLoading(false));
        }}
      />
    </div>
  );
}
