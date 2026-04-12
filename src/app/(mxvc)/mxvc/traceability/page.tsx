/**
 * @file src/app/(mxvc)/mxvc/traceability/page.tsx
 * @description 멕시코전장 추적성분석 — RUN_NO 기반 바코드 목록 + 추적성 조회.
 * 초보자 가이드:
 * 1. 상단: RUN_NO 입력 → 조회 → 좌측 사이드바에 SERIAL_NO 목록 표시
 * 2. 사이드바: 바코드 목록 + 찾기 필터 (직접 바코드 입력 시 단건 조회)
 * 3. 바코드 선택 시 우측에 추적성 결과 (마스터 + 공정별/타임라인)
 */
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceabilityMaster from '@/components/mxvc/TraceabilityMaster';
import TraceabilityTimeline from '@/components/mxvc/TraceabilityTimeline';
import RunCardSearchModal from '@/components/mxvc/RunCardSearchModal';
import type { TraceabilityResponse } from '@/types/mxvc/traceability';

/** 섹션 라벨 매핑 (TraceabilityTimeline의 SOURCE_LABEL과 동일) */
const SOURCE_LABEL: Record<string, string> = {
  MATERIAL_BOARD: '자재(BOARD)',
  MATERIAL_DETAIL: '자재(상세)',
  IQ_MACHINE_INSPECT_RESULT: '공정설비통신',
  IP_PRODUCT_2D_BARCODE: '바코드마스터',
  IP_PRODUCT_PACK_SERIAL: '출하정보',
  IP_PRODUCT_WORK_QC: '수리이력',
  IMCN_JIG_INPUT_HIST: '지그투입이력',
  IM_ITEM_SOLDER_INPUT_HIST: '솔더투입이력',
  IP_PRODUCT_WORKSTAGE_IO: '공정이동',
  LOG_LCR: 'LCR 측정로그',
};
function sectionLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source.replace(/^LOG_/i, '').replace(/^IP_PRODUCT_/i, '');
}

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

  /* 추적 대상 테이블 체크박스 */
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());

  /* 페이지 로드 시 테이블 목록 조회 */
  useEffect(() => {
    fetch('/api/mxvc/traceability?mode=tables')
      .then((res) => res.json())
      .then((json: { tables: string[] }) => {
        const tbls = json.tables ?? [];
        setAvailableTables(tbls);
        setSelectedTables(new Set(tbls)); // 기본 전체 선택
      })
      .catch(() => {});
  }, []);

  const toggleTable = (t: string) => {
    setSelectedTables((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const allChecked = availableTables.length > 0 && selectedTables.size === availableTables.length;

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
      if (selectedTables.size > 0 && selectedTables.size < availableTables.length) {
        params.set('tables', Array.from(selectedTables).join(','));
      }
      const res = await fetch(`/api/mxvc/traceability?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TraceabilityResponse = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [includeMaterial, selectedTables, availableTables.length]);

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

  /** 섹션별 그룹핑 (source 기준) */
  const groupedSections = useMemo(() => {
    if (!data?.timeline) return [] as Array<{ source: string; label: string; rows: Record<string, unknown>[] }>;
    const map = new Map<string, Record<string, unknown>[]>();
    for (const ev of data.timeline) {
      if (!map.has(ev.source)) map.set(ev.source, []);
      map.get(ev.source)!.push(ev.data);
    }
    return Array.from(map.entries()).map(([source, rows]) => ({
      source,
      label: sectionLabel(source),
      rows,
    }));
  }, [data]);

  const hasExport = !!data && groupedSections.length > 0;

  /** Excel 다운로드: 마스터 + 섹션별 시트 */
  const handleExportExcel = useCallback(() => {
    if (!hasExport || !data) return;
    const wb = XLSX.utils.book_new();

    /* 마스터 시트 */
    if (data.master) {
      const ws = XLSX.utils.json_to_sheet([data.master]);
      XLSX.utils.book_append_sheet(wb, ws, '마스터');
    }
    if (data.runCard) {
      const ws = XLSX.utils.json_to_sheet([data.runCard]);
      XLSX.utils.book_append_sheet(wb, ws, 'RunCard');
    }
    if (data.modelMaster) {
      const ws = XLSX.utils.json_to_sheet([data.modelMaster]);
      XLSX.utils.book_append_sheet(wb, ws, '모델마스터');
    }

    /* 섹션별 시트 (이름 31자 제한, 중복 회피) */
    const usedNames = new Set<string>();
    for (const sec of groupedSections) {
      if (sec.rows.length === 0) continue;
      let name = sec.label.slice(0, 31);
      let i = 1;
      while (usedNames.has(name)) name = `${sec.label.slice(0, 27)}_${i++}`;
      usedNames.add(name);
      const ws = XLSX.utils.json_to_sheet(sec.rows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }

    const fileName = `추적성_${selectedBarcode || 'data'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [hasExport, data, groupedSections, selectedBarcode]);

  /** HTML 테이블 생성 공통 함수 */
  const buildSectionHtml = useCallback((print: boolean) => {
    if (!data) return '';
    const toTable = (rows: Record<string, unknown>[], title: string, color: string) => {
      if (rows.length === 0) return '';
      const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      const thead = cols.map((c) => `<th>${c}</th>`).join('');
      const tbody = rows.map((r) =>
        `<tr>${cols.map((c) => `<td>${String(r[c] ?? '')}</td>`).join('')}</tr>`
      ).join('');
      return `<section><h2 style="color:${color}">${title} (${rows.length}건)</h2><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></section>`;
    };
    const masterHtml = data.master
      ? toTable([data.master], '마스터 (IP_PRODUCT_2D_BARCODE)', '#2563eb')
      : '';
    const runCardHtml = data.runCard
      ? toTable([data.runCard as Record<string, unknown>], 'RunCard', '#0891b2')
      : '';
    const modelHtml = data.modelMaster
      ? toTable([data.modelMaster as Record<string, unknown>], '모델마스터', '#9333ea')
      : '';
    const sectionsHtml = groupedSections
      .map((s) => toTable(s.rows, s.label, '#059669'))
      .join('');

    const style = print
      ? `@page { size: A4 landscape; margin: 10mm; }
         body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 0; color: #222; }
         h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 6px; font-size: 18px; }
         h2 { margin-top: 16px; padding-bottom: 3px; border-bottom: 1px solid #ddd; font-size: 13px; page-break-after: avoid; }
         table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; page-break-inside: auto; }
         th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: left; }
         th { background: #eee; font-weight: 600; }
         tr { page-break-inside: avoid; }
         .meta { color: #666; font-size: 10px; margin-bottom: 12px; }`
      : `body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f8f9fa; color: #222; }
         h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
         h2 { margin-top: 30px; padding-bottom: 4px; border-bottom: 1px solid #ddd; font-size: 16px; }
         table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; background: white; }
         th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
         th { background: #f0f0f0; font-weight: 600; }
         tr:nth-child(even) td { background: #fafafa; }
         .meta { color: #666; font-size: 12px; margin-bottom: 20px; }`;

    return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><title>추적성 ${selectedBarcode}</title>
<style>${style}</style></head>
<body>
<h1>추적성 리포트 — ${selectedBarcode}</h1>
<p class="meta">생성일: ${new Date().toLocaleString('ko-KR')} / 이벤트 ${resultCount}건 / 섹션 ${groupedSections.length}개</p>
${masterHtml}${runCardHtml}${modelHtml}${sectionsHtml}
</body></html>`;
  }, [data, groupedSections, selectedBarcode, resultCount]);

  /** HTML 다운로드 */
  const handleExportHtml = useCallback(() => {
    if (!hasExport) return;
    const html = buildSectionHtml(false);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `추적성_${selectedBarcode || 'data'}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [hasExport, buildSectionHtml, selectedBarcode]);

  /** PDF 다운로드 (브라우저 인쇄 대화상자) */
  const handleExportPdf = useCallback(() => {
    if (!hasExport) return;
    const printWin = window.open('', '_blank', 'width=1200,height=800');
    if (!printWin) return;
    printWin.document.write(buildSectionHtml(true));
    printWin.document.close();
    printWin.onload = () => {
      printWin.focus();
      printWin.print();
    };
  }, [hasExport, buildSectionHtml]);

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

        <div className="ml-auto flex items-center gap-2">
          {data && (
            <span className="text-sm text-gray-500 dark:text-gray-400">{resultCount}개 이벤트</span>
          )}
          {hasExport && (
            <>
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />
              <span className="text-xs text-gray-500 dark:text-gray-400">받아내기:</span>
              <button onClick={handleExportHtml}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-colors"
                title="HTML 파일로 저장">HTML</button>
              <button onClick={handleExportExcel}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                title="Excel(xlsx) 파일로 저장">Excel</button>
              <button onClick={handleExportPdf}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
                title="인쇄 대화상자에서 PDF 저장">PDF</button>
            </>
          )}
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
          <div className="flex-1 overflow-y-auto min-h-0">
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

          {/* 추적 대상 테이블 체크박스 */}
          {availableTables.length > 0 && (
            <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 flex flex-col max-h-[40%]">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/60">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  추적 대상 ({selectedTables.size}/{availableTables.length})
                </span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() =>
                      setSelectedTables(allChecked ? new Set() : new Set(availableTables))
                    }
                    className="w-3 h-3 accent-blue-500"
                  />
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">전체</span>
                </label>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {availableTables.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/60 px-1 py-0.5 rounded">
                    <input
                      type="checkbox"
                      checked={selectedTables.has(t)}
                      onChange={() => toggleTable(t)}
                      className="w-3.5 h-3.5 accent-blue-500"
                    />
                    <span className="text-[11px] font-mono text-gray-700 dark:text-gray-300 truncate">
                      {t === 'IP_PRODUCT_2D_BARCODE' ? '바코드마스터'
                        : t === 'IP_PRODUCT_PACK_SERIAL' ? '출하정보'
                        : t === 'IP_PRODUCT_WORK_QC' ? '수리이력'
                        : t === 'IMCN_JIG_INPUT_HIST' ? '지그투입이력'
                        : t === 'IM_ITEM_SOLDER_INPUT_HIST' ? '솔더투입이력'
                        : t === 'LOG_LCR' ? 'LCR 측정로그'
                        : t.replace(/^LOG_/, '')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
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
