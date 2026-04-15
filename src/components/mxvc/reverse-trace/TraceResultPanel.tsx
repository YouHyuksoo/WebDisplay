/**
 * @file src/components/mxvc/reverse-trace/TraceResultPanel.tsx
 * @description 역추적 결과 영역 — 3D 그래프 + 5개 테이블 + 스플리터 + 드릴다운 + 내보내기
 *
 * 초보자 가이드:
 * 1. props.reelCd 변화 시 자동으로 /api/mxvc/reverse-trace 호출
 * 2. 상단 조회바(입력/조회 버튼)는 부모(page.tsx)에서 관리, 이 컴포넌트는 결과 표시만 담당
 * 3. 건수 요약 + Export 3종(HTML/Excel/PDF) 버튼은 이 컴포넌트 내부에 유지
 * 4. PCB 행 클릭 → 장착 상세 펼침 (기존 로직 그대로)
 */
'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import ReverseTrace3DGraph from '@/components/mxvc/ReverseTrace3DGraph';
import ReverseTracePanelSplitter from '@/components/mxvc/ReverseTracePanelSplitter';
import {
  buildGraphData,
  type CategoryId,
  type GraphNode,
  type ApiResponse,
} from '@/components/mxvc/reverseTraceGraphBuilder';
import Spinner from '@/components/ui/Spinner';

interface Props {
  /** 추적 대상 릴번호. 빈 문자열이면 "조회 대기" 상태. 변화 시 자동 refetch */
  reelCd: string;
}

interface ReceiptInfo {
  ITEM_BARCODE: string;
  ITEM_CODE: string;
  LOT_NO: string;
  SCAN_DATE: string;
  SCAN_QTY: number;
  SUPPLIER_CODE: string;
  RECEIPT_SLIP_NO: string;
  BARCODE_STATUS: string;
  MANUFACTURE_DATE: string;
  MANUFACTURE_WEEK: string;
  VENDOR_LOTNO: string;
  INSPECT_RESULT: string;
}

interface IssueInfo {
  ISSUE_DATE: string;
  ITEM_CODE: string;
  MATERIAL_MFS: string;
  LINE_CODE: string;
  WORKSTAGE_CODE: string;
  ISSUE_QTY: number;
  ISSUE_STATUS: string;
  MODEL_NAME: string;
  ISSUE_TYPE: string;
  ENTER_DATE: string;
  ENTER_BY: string;
}

interface ReelMasterInfo {
  ReelCd: string;
  PartNo: string;
  CurrentCnt: number;
  InitCnt: number;
  VendorNm: string;
  VendorLot: string;
  PartType: string;
  UseYN: string;
  MSLLevel: string;
  MSLStatus: number;
  RemainTime: number;
  LastLoadDt: string;
  RegDt: string;
  MSLUpdateTime: string;
  Memo: string;
}

interface ReelChangeInfo {
  ReelChangeID: number;
  ReelCd: string;
  PartNo: string;
  FeederCd: string;
  FeederSlot: string;
  EqpCd: string;
  ReelInstallDt: string;
  ReelUninstallDt: string;
  MapID: number;
}

interface BoardSummary {
  BoardSN: string;
  StartDt: string;
  EndDt: string;
  PartNo: string;
  EqpNm: string;
  LineNm: string;
  JobOrderNo: string;
  StepCount: number;
}

interface DetailRow {
  StepNo: number;
  ReferenceID: string;
  ReelCd: string;
  PartNo: string;
  SlotNo: string;
  ArrayIndex: number;
  BlockIndex: number;
  StartDt: string;
  EndDt: string;
}

const thCls = 'px-3 py-2 text-left text-xs font-semibold';
const tdCls = 'px-3 py-1.5 text-sm';

export default function TraceResultPanel({ reelCd }: Props) {
  const [receipt, setReceipt] = useState<ReceiptInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [reelMaster, setReelMaster] = useState<ReelMasterInfo[]>([]);
  const [reelChanges, setReelChanges] = useState<ReelChangeInfo[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* 드릴다운: 선택된 BoardSN → 장착 상세 */
  const [expandedBoard, setExpandedBoard] = useState('');
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  /* 3D 그래프 관련 상태 */
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [maximized, setMaximized] = useState(false);
  const [rightWidth, setRightWidth] = useState(30); // %
  const [highlightedRow, setHighlightedRow] = useState<{ section: string; id: string } | null>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [panelDims, setPanelDims] = useState({ width: 0, height: 0 });

  /** reelCd prop 변경 시 자동 조회 */
  useEffect(() => {
    const trimmed = reelCd.trim();
    if (!trimmed) {
      setReceipt([]); setIssues([]); setReelMaster([]); setReelChanges([]); setBoards([]);
      setExpandedBoard(''); setDetails([]); setError('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setReceipt([]); setIssues([]); setReelMaster([]); setReelChanges([]); setBoards([]);
      setExpandedBoard(''); setDetails([]); setError('');
      try {
        const res = await fetch(`/api/mxvc/reverse-trace?reelCd=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setReceipt(json.receipt ?? []);
        setIssues(json.issues ?? []);
        setReelMaster(json.reelMaster ?? []);
        setReelChanges(json.reelChanges ?? []);
        setBoards(json.boards ?? []);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reelCd]);

  /** BoardSN 클릭 → 장착 상세 토글 */
  const handleBoardClick = useCallback(async (boardSN: string) => {
    if (expandedBoard === boardSN) {
      setExpandedBoard('');
      setDetails([]);
      return;
    }
    setExpandedBoard(boardSN);
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ reelCd: reelCd.trim(), mode: 'detail', boardSN });
      const res = await fetch(`/api/mxvc/reverse-trace?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDetails(json.details ?? []);
    } catch {
      setDetails([]);
    } finally {
      setDetailLoading(false);
    }
  }, [reelCd, expandedBoard]);

  /* 그래프 데이터 (조회 시점 ReelCd 사용) */
  const apiData: ApiResponse | null = useMemo(() => {
    if (!receipt.length && !issues.length && !reelMaster.length && !reelChanges.length && !boards.length) {
      return null;
    }
    return {
      reelCd: reelCd || 'Unknown',
      lotNo: '',
      receipt, issues, reelMaster, reelChanges, boards,
    };
  }, [reelCd, receipt, issues, reelMaster, reelChanges, boards]);

  const hasData = apiData !== null;

  /* 우측 패널 크기 추적 — hasData 변경 시 패널이 새로 마운트되므로 재등록 필요 */
  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    /* 초기 크기 즉시 계산 (ResizeObserver 첫 콜백 전에 그래프 렌더 가능하도록) */
    const rect = el.getBoundingClientRect();
    setPanelDims({ width: rect.width, height: rect.height });
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setPanelDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [maximized, rightWidth, hasData]);

  /* 하이라이트 자동 제거 (2초) */
  useEffect(() => {
    if (!highlightedRow) return;
    const t = setTimeout(() => setHighlightedRow(null), 2000);
    return () => clearTimeout(t);
  }, [highlightedRow]);

  /* ESC 키로 최대화 해제 */
  useEffect(() => {
    if (!maximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaximized(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [maximized]);

  /* 카테고리 펼침/접힘 토글 */
  const handleCategoryToggle = useCallback((catId: CategoryId) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  /* 엔티티 클릭 → 좌측 테이블 하이라이트 + 스크롤 */
  const handleEntityClick = useCallback((node: GraphNode) => {
    if (!node.originalId || !node.parentCat) return;
    setHighlightedRow({ section: node.parentCat, id: node.originalId });
    const el = document.getElementById(`row-${node.originalId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  /* 그래프 리셋: 펼침 해제 + 하이라이트 초기화 */
  const handleGraphReset = useCallback(() => {
    setExpandedCats(new Set());
    setHighlightedRow(null);
  }, []);

  /* 전체 펼침: 데이터가 있는 카테고리 모두 펼침 */
  const handleExpandAll = useCallback(() => {
    const next = new Set<string>();
    if (receipt.length > 0) next.add('cat-receipt');
    if (issues.length > 0) next.add('cat-issue');
    if (reelMaster.length > 0) next.add('cat-reel');
    if (reelChanges.length > 0) next.add('cat-change');
    if (boards.length > 0) next.add('cat-pcb');
    setExpandedCats(next);
  }, [receipt.length, issues.length, reelMaster.length, reelChanges.length, boards.length]);

  /* 전체 접기 */
  const handleCollapseAll = useCallback(() => {
    setExpandedCats(new Set());
  }, []);

  /* ═══════ 데이터 내보내기 ═══════ */

  /** Excel 다운로드: 5개 시트 (입고/출고/릴투입/릴교환/PCB) */
  const handleExportExcel = useCallback(() => {
    if (!hasData) return;
    const wb = XLSX.utils.book_new();
    const addSheet = <T extends object>(rows: T[], name: string) => {
      if (rows.length === 0) return;
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };
    addSheet(receipt, '입고이력');
    addSheet(issues, '출고이력');
    addSheet(reelMaster, '릴투입이력');
    addSheet(reelChanges, '릴교환이력');
    addSheet(boards, '사용된PCB');
    const fileName = `역추적_${reelCd || 'data'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [hasData, receipt, issues, reelMaster, reelChanges, boards, reelCd]);

  /** HTML 다운로드: 모든 섹션 테이블을 단일 HTML 문서로 */
  const handleExportHtml = useCallback(() => {
    if (!hasData) return;
    const toTable = <T extends object>(rows: T[], title: string, color: string) => {
      if (rows.length === 0) return '';
      const cols = Object.keys(rows[0]);
      const thead = cols.map((c) => `<th>${c}</th>`).join('');
      const tbody = rows.map((r) =>
        `<tr>${cols.map((c) => `<td>${String((r as Record<string, unknown>)[c] ?? '')}</td>`).join('')}</tr>`
      ).join('');
      return `<section><h2 style="color:${color}">${title} (${rows.length}건)</h2><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></section>`;
    };
    const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><title>역추적 ${reelCd}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f8f9fa; color: #222; }
h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
h2 { margin-top: 30px; padding-bottom: 4px; border-bottom: 1px solid #ddd; font-size: 16px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; background: white; }
th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
th { background: #f0f0f0; font-weight: 600; }
tr:nth-child(even) td { background: #fafafa; }
.meta { color: #666; font-size: 12px; margin-bottom: 20px; }
</style></head>
<body>
<h1>역추적 리포트 — ${reelCd}</h1>
<p class="meta">생성일: ${new Date().toLocaleString('ko-KR')} / 입고 ${receipt.length}건 · 출고 ${issues.length}건 · 릴투입 ${reelMaster.length}건 · 릴교환 ${reelChanges.length}건 · PCB ${boards.length}건</p>
${toTable(receipt, '입고이력', '#059669')}
${toTable(issues, '출고이력', '#d97706')}
${toTable(reelMaster, '릴 투입이력', '#0891b2')}
${toTable(reelChanges, '릴교환이력', '#9333ea')}
${toTable(boards, '사용된 PCB', '#2563eb')}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `역추적_${reelCd || 'data'}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [hasData, receipt, issues, reelMaster, reelChanges, boards, reelCd]);

  /** PDF 다운로드: 브라우저 인쇄 대화상자 → PDF로 저장 */
  const handleExportPdf = useCallback(() => {
    if (!hasData) return;
    /* 동일한 HTML을 새 창에서 열고 print 호출 */
    const toTable = <T extends object>(rows: T[], title: string, color: string) => {
      if (rows.length === 0) return '';
      const cols = Object.keys(rows[0]);
      const thead = cols.map((c) => `<th>${c}</th>`).join('');
      const tbody = rows.map((r) =>
        `<tr>${cols.map((c) => `<td>${String((r as Record<string, unknown>)[c] ?? '')}</td>`).join('')}</tr>`
      ).join('');
      return `<section><h2 style="color:${color}">${title} (${rows.length}건)</h2><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></section>`;
    };
    const printWin = window.open('', '_blank', 'width=1200,height=800');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"/><title>역추적 ${reelCd}</title>
<style>
@page { size: A4 landscape; margin: 10mm; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 0; color: #222; }
h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 6px; font-size: 18px; }
h2 { margin-top: 16px; padding-bottom: 3px; border-bottom: 1px solid #ddd; font-size: 13px; page-break-after: avoid; }
table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; page-break-inside: auto; }
th, td { border: 1px solid #ccc; padding: 3px 5px; text-align: left; }
th { background: #eee; font-weight: 600; }
tr { page-break-inside: avoid; }
.meta { color: #666; font-size: 10px; margin-bottom: 12px; }
section { page-break-inside: auto; }
</style></head>
<body>
<h1>역추적 리포트 — ${reelCd}</h1>
<p class="meta">생성일: ${new Date().toLocaleString('ko-KR')} / 입고 ${receipt.length}건 · 출고 ${issues.length}건 · 릴투입 ${reelMaster.length}건 · 릴교환 ${reelChanges.length}건 · PCB ${boards.length}건</p>
${toTable(receipt, '입고이력', '#059669')}
${toTable(issues, '출고이력', '#d97706')}
${toTable(reelMaster, '릴 투입이력', '#0891b2')}
${toTable(reelChanges, '릴교환이력', '#9333ea')}
${toTable(boards, '사용된 PCB', '#2563eb')}
</body></html>`);
    printWin.document.close();
    /* 페이지 로드 후 자동 인쇄 대화상자 */
    printWin.onload = () => {
      printWin.focus();
      printWin.print();
    };
  }, [hasData, receipt, issues, reelMaster, reelChanges, boards, reelCd]);

  const graphData = useMemo(() => buildGraphData(apiData, expandedCats), [apiData, expandedCats]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 상단 요약 + Export — hasData 시만 */}
      {hasData && (
        <div className="shrink-0 flex items-center gap-3 px-5 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            추적 중: <code className="font-mono text-emerald-600 dark:text-emerald-400">{reelCd}</code>
            {' · '}입고 <strong className="text-emerald-500">{receipt.length}</strong>건
            {' / '}출고 <strong className="text-orange-500">{issues.length}</strong>건
            {' / '}릴교환 <strong className="text-purple-500">{reelChanges.length}</strong>건
            {' / '}PCB <strong className="text-blue-500">{boards.length}</strong>건
          </span>
          <div className="ml-auto flex items-center gap-2">
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
          </div>
        </div>
      )}

      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 메인: 좌우 분할 */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 좌측: 기존 그리드들 (최대화 시 숨김) */}
        <div
          className={`overflow-auto p-4 space-y-4 ${maximized ? 'hidden' : ''}`}
          style={{ width: maximized ? '0%' : `${100 - rightWidth}%` }}
        >
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          )}

          {!loading && !hasData && (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400 dark:text-gray-500">
              자재릴번호(ReelCd)를 입력하고 조회하세요
            </div>
          )}

          {/* ═══ 1. 입고이력 ═══ */}
          {receipt.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                입고이력
                <span className="ml-2 text-[10px] font-mono text-gray-400 dark:text-gray-500 normal-case">IM_ITEM_RECEIPT_BARCODE</span>
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-emerald-50 dark:bg-emerald-900/20 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className={thCls}>릴바코드</th>
                      <th className={thCls}>품번</th>
                      <th className={thCls}>LOT NO</th>
                      <th className={thCls}>입고일</th>
                      <th className={`${thCls} text-right`}>수량</th>
                      <th className={thCls}>거래처</th>
                      <th className={thCls}>입고전표</th>
                      <th className={thCls}>제조일</th>
                      <th className={thCls}>제조주차</th>
                      <th className={thCls}>Vendor LOT</th>
                      <th className={`${thCls} text-center`}>검사</th>
                      <th className={`${thCls} text-center`}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.map((r) => (
                      <tr
                        key={r.ITEM_BARCODE}
                        id={`row-${r.ITEM_BARCODE}`}
                        className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                          highlightedRow?.id === r.ITEM_BARCODE ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
                        }`}
                      >
                        <td className={`${tdCls} font-mono text-xs text-emerald-600 dark:text-emerald-400`}>{r.ITEM_BARCODE}</td>
                        <td className={`${tdCls} font-mono`}>{r.ITEM_CODE}</td>
                        <td className={`${tdCls} font-mono text-blue-500`}>{r.LOT_NO}</td>
                        <td className={tdCls}>{r.SCAN_DATE?.slice(0, 10)}</td>
                        <td className={`${tdCls} text-right font-mono`}>{r.SCAN_QTY?.toLocaleString()}</td>
                        <td className={tdCls}>{r.SUPPLIER_CODE}</td>
                        <td className={`${tdCls} font-mono text-xs`}>{r.RECEIPT_SLIP_NO}</td>
                        <td className={tdCls}>{r.MANUFACTURE_DATE?.slice(0, 10) ?? '-'}</td>
                        <td className={`${tdCls} text-center`}>{r.MANUFACTURE_WEEK ?? '-'}</td>
                        <td className={tdCls}>{r.VENDOR_LOTNO ?? '-'}</td>
                        <td className={`${tdCls} text-center font-semibold ${r.INSPECT_RESULT === 'P' ? 'text-green-500' : 'text-red-500'}`}>
                          {r.INSPECT_RESULT === 'P' ? 'PASS' : r.INSPECT_RESULT ?? '-'}
                        </td>
                        <td className={`${tdCls} text-center`}>{r.BARCODE_STATUS}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══ 2. 출고이력 ═══ */}
          {issues.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-2">
                출고이력 ({issues.length}건)
                <span className="ml-2 text-[10px] font-mono text-gray-400 dark:text-gray-500 normal-case">IM_ITEM_ISSUE</span>
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-orange-50 dark:bg-orange-900/20 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className={thCls}>출고일</th>
                      <th className={thCls}>품번</th>
                      <th className={thCls}>LOT(MFS)</th>
                      <th className={thCls}>모델명</th>
                      <th className={thCls}>라인</th>
                      <th className={thCls}>공정</th>
                      <th className={`${thCls} text-right`}>수량</th>
                      <th className={`${thCls} text-center`}>상태</th>
                      <th className={thCls}>등록자</th>
                      <th className={thCls}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issues.map((iss, i) => (
                      <tr
                        key={i}
                        id={`row-${i}`}
                        className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                          highlightedRow?.section === 'cat-issue' && highlightedRow?.id === String(i)
                            ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
                        }`}
                      >
                        <td className={tdCls}>{iss.ISSUE_DATE?.slice(0, 10)}</td>
                        <td className={`${tdCls} font-mono`}>{iss.ITEM_CODE}</td>
                        <td className={`${tdCls} font-mono text-blue-500`}>{iss.MATERIAL_MFS}</td>
                        <td className={tdCls}>{iss.MODEL_NAME ?? '-'}</td>
                        <td className={tdCls}>{iss.LINE_CODE ?? '-'}</td>
                        <td className={tdCls}>{iss.WORKSTAGE_CODE ?? '-'}</td>
                        <td className={`${tdCls} text-right font-mono`}>{iss.ISSUE_QTY?.toLocaleString()}</td>
                        <td className={`${tdCls} text-center`}>{iss.ISSUE_STATUS ?? '-'}</td>
                        <td className={tdCls}>{iss.ENTER_BY ?? '-'}</td>
                        <td className={`${tdCls} text-xs text-gray-500`}>{iss.ENTER_DATE?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══ 3. 릴 투입이력 (HW_ITS_REEL 마스터) ═══ */}
          {reelMaster.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase mb-2">
                릴 투입이력 ({reelMaster.length}건)
                <span className="ml-2 text-[10px] font-mono text-gray-400 dark:text-gray-500 normal-case">HW_ITS_REEL</span>
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-cyan-50 dark:bg-cyan-900/20 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className={thCls}>릴코드</th>
                      <th className={thCls}>품번</th>
                      <th className={thCls}>타입</th>
                      <th className={thCls}>Vendor명</th>
                      <th className={thCls}>Vendor LOT</th>
                      <th className={`${thCls} text-right`}>초기수량</th>
                      <th className={`${thCls} text-right`}>현재수량</th>
                      <th className={`${thCls} text-center`}>MSL</th>
                      <th className={thCls}>최종투입</th>
                      <th className={thCls}>등록일</th>
                      <th className={`${thCls} text-center`}>사용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reelMaster.map((r, i) => (
                      <tr
                        key={i}
                        id={`row-${r.ReelCd}`}
                        className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                          highlightedRow?.section === 'cat-reel' && highlightedRow?.id === r.ReelCd
                            ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
                        }`}
                      >
                        <td className={`${tdCls} font-mono text-xs text-cyan-600 dark:text-cyan-400`}>{r.ReelCd}</td>
                        <td className={`${tdCls} font-mono`}>{r.PartNo}</td>
                        <td className={tdCls}>{r.PartType ?? '-'}</td>
                        <td className={tdCls}>{r.VendorNm ?? '-'}</td>
                        <td className={`${tdCls} font-mono text-xs`}>{r.VendorLot ?? '-'}</td>
                        <td className={`${tdCls} text-right font-mono`}>{r.InitCnt?.toLocaleString() ?? '-'}</td>
                        <td className={`${tdCls} text-right font-mono font-semibold ${r.CurrentCnt > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                          {r.CurrentCnt?.toLocaleString() ?? '-'}
                        </td>
                        <td className={`${tdCls} text-center`}>Lv{r.MSLLevel ?? '-'}</td>
                        <td className={`${tdCls} text-xs text-gray-500`}>{r.LastLoadDt?.slice(0, 19) ?? '-'}</td>
                        <td className={`${tdCls} text-xs text-gray-500`}>{r.RegDt?.slice(0, 19) ?? '-'}</td>
                        <td className={`${tdCls} text-center`}>{String(r.UseYN ?? '').trim() === '1' ? 'Y' : 'N'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══ 4. 릴교환이력 ═══ */}
          {reelChanges.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase mb-2">
                릴교환이력 ({reelChanges.length}건)
                <span className="ml-2 text-[10px] font-mono text-gray-400 dark:text-gray-500 normal-case">HW_ITS_REELCHANGEHISTORY</span>
              </h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-purple-50 dark:bg-purple-900/20 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className={`${thCls} text-right`}>ID</th>
                      <th className={thCls}>PartNo</th>
                      <th className={thCls}>Feeder</th>
                      <th className={thCls}>Slot</th>
                      <th className={thCls}>장비</th>
                      <th className={thCls}>장착 시간</th>
                      <th className={thCls}>해제 시간</th>
                      <th className={`${thCls} text-right`}>Map ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reelChanges.map((rc) => (
                      <tr
                        key={rc.ReelChangeID}
                        id={`row-${rc.ReelChangeID}`}
                        className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${
                          highlightedRow?.section === 'cat-change' && highlightedRow?.id === String(rc.ReelChangeID)
                            ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''
                        }`}
                      >
                        <td className={`${tdCls} text-right font-mono`}>{rc.ReelChangeID}</td>
                        <td className={`${tdCls} font-mono`}>{rc.PartNo}</td>
                        <td className={`${tdCls} font-mono text-xs`}>{rc.FeederCd}</td>
                        <td className={`${tdCls} font-mono text-xs`}>{rc.FeederSlot}</td>
                        <td className={`${tdCls} font-mono`}>{rc.EqpCd}</td>
                        <td className={`${tdCls} text-xs text-gray-500`}>{rc.ReelInstallDt?.slice(0, 19)}</td>
                        <td className={`${tdCls} text-xs text-gray-500`}>{rc.ReelUninstallDt?.slice(0, 19) ?? '-'}</td>
                        <td className={`${tdCls} text-right font-mono text-xs`}>{rc.MapID}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ═══ 5. 사용된 PCB 목록 ═══ */}
          <section>
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">
              사용된 PCB ({boards.length}건)
              <span className="ml-2 text-[10px] font-mono text-gray-400 dark:text-gray-500 normal-case">HW_VW_LTS</span>
            </h3>
            {boards.length === 0 ? (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
                데이터 없음
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-blue-50 dark:bg-blue-900/20 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className={`${thCls} w-8`}></th>
                      <th className={thCls}>BoardSN</th>
                      <th className={thCls}>라인</th>
                      <th className={thCls}>장비</th>
                      <th className={thCls}>Part No</th>
                      <th className={thCls}>작업지시</th>
                      <th className={thCls}>시작 시간</th>
                      <th className={thCls}>종료 시간</th>
                      <th className={`${thCls} text-right`}>스텝수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map((b) => (
                      <React.Fragment key={b.BoardSN}>
                        <tr
                          id={`row-${b.BoardSN}`}
                          onClick={() => handleBoardClick(b.BoardSN)}
                          className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                            highlightedRow?.section === 'cat-pcb' && highlightedRow?.id === b.BoardSN
                              ? 'bg-yellow-100 dark:bg-yellow-900/40'
                              : expandedBoard === b.BoardSN
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          <td className={`${tdCls} text-center text-gray-400`}>
                            {expandedBoard === b.BoardSN ? '▼' : '▶'}
                          </td>
                          <td className={`${tdCls} font-mono font-medium text-blue-600 dark:text-blue-400`}>{b.BoardSN}</td>
                          <td className={tdCls}>{b.LineNm}</td>
                          <td className={tdCls}>{b.EqpNm}</td>
                          <td className={`${tdCls} font-mono`}>{b.PartNo}</td>
                          <td className={`${tdCls} font-mono text-xs`}>{b.JobOrderNo}</td>
                          <td className={`${tdCls} text-xs text-gray-500`}>{b.StartDt?.slice(0, 19)}</td>
                          <td className={`${tdCls} text-xs text-gray-500`}>{b.EndDt?.slice(0, 19)}</td>
                          <td className={`${tdCls} text-right font-mono`}>{b.StepCount}</td>
                        </tr>
                        {expandedBoard === b.BoardSN && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <div className="bg-gray-50 dark:bg-gray-800/60 px-8 py-3">
                                {detailLoading ? (
                                  <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                                    <Spinner size="sm" label="장착 상세 조회 중..." className="gap-2" />
                                  </div>
                                ) : details.length > 0 ? (
                                  <table className="w-full text-xs">
                                    <thead className="text-gray-500 dark:text-gray-400">
                                      <tr>
                                        <th className="px-2 py-1 text-left">Step</th>
                                        <th className="px-2 py-1 text-left">ReferenceID</th>
                                        <th className="px-2 py-1 text-left">PartNo</th>
                                        <th className="px-2 py-1 text-left">SlotNo</th>
                                        <th className="px-2 py-1 text-center">Array</th>
                                        <th className="px-2 py-1 text-center">Block</th>
                                        <th className="px-2 py-1 text-left">시작</th>
                                        <th className="px-2 py-1 text-left">종료</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details.map((d, i) => (
                                        <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                                          <td className="px-2 py-1 font-mono">{d.StepNo}</td>
                                          <td className="px-2 py-1 font-mono text-blue-500">{d.ReferenceID}</td>
                                          <td className="px-2 py-1">{d.PartNo}</td>
                                          <td className="px-2 py-1">{d.SlotNo}</td>
                                          <td className="px-2 py-1 text-center">{d.ArrayIndex}</td>
                                          <td className="px-2 py-1 text-center">{d.BlockIndex}</td>
                                          <td className="px-2 py-1 text-gray-500">{d.StartDt?.slice(11, 19)}</td>
                                          <td className="px-2 py-1 text-gray-500">{d.EndDt?.slice(11, 19)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="py-2 text-xs text-gray-400">상세 데이터 없음</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* 분할 바 (최대화 시 숨김) */}
        {!maximized && hasData && (
          <ReverseTracePanelSplitter onChange={setRightWidth} />
        )}

        {/* 우측: 3D 그래프 */}
        {hasData && (
          <div
            ref={rightPanelRef}
            className="relative overflow-hidden border-l border-gray-200 dark:border-gray-700"
            style={{ width: maximized ? '100%' : `${rightWidth}%` }}
          >
            <button
              onClick={() => setMaximized((v) => !v)}
              className="absolute top-2 left-2 z-20 p-1.5 rounded bg-blue-600/70 text-white hover:bg-blue-500 transition-colors"
              title={maximized ? '원래 크기 (ESC)' : '최대화'}
            >
              {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <ReverseTrace3DGraph
              data={graphData}
              onCategoryToggle={handleCategoryToggle}
              onEntityClick={handleEntityClick}
              onReset={handleGraphReset}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
              width={panelDims.width}
              height={panelDims.height}
            />
          </div>
        )}
      </div>
    </div>
  );
}
