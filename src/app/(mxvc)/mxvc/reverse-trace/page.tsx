/**
 * @file src/app/(mxvc)/mxvc/reverse-trace/page.tsx
 * @description 멕시코전장 역추적 — 자재릴번호(ReelCd)로 입고/출고/PCB 추적
 *
 * 초보자 가이드:
 * 1. 상단: ReelCd 입력 → 조회
 * 2. 중앙: 입고이력 → 출고이력 → 사용된 PCB 목록 순서로 그리드 표시
 * 3. PCB 행 클릭 → 장착 상세 펼침
 */
'use client';

import React, { useState, useCallback } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';

const SCREEN_ID = 'mxvc-reverse-trace';

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

const inputCls = 'px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm';
const thCls = 'px-3 py-2 text-left text-xs font-semibold';
const tdCls = 'px-3 py-1.5 text-sm';

export default function ReverseTracePage() {
  const [reelCd, setReelCd] = useState('');
  const [receipt, setReceipt] = useState<ReceiptInfo[]>([]);
  const [issues, setIssues] = useState<IssueInfo[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* 드릴다운: 선택된 BoardSN → 장착 상세 */
  const [expandedBoard, setExpandedBoard] = useState('');
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  /** ReelCd 조회 */
  const handleSearch = useCallback(async () => {
    const trimmed = reelCd.trim();
    if (!trimmed) return;
    setLoading(true);
    setReceipt([]);
    setIssues([]);
    setBoards([]);
    setExpandedBoard('');
    setDetails([]);
    setError('');
    try {
      const res = await fetch(`/api/mxvc/reverse-trace?reelCd=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setReceipt(json.receipt ?? []);
      setIssues(json.issues ?? []);
      setBoards(json.boards ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
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

  const hasData = receipt.length > 0 || issues.length > 0 || boards.length > 0;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 역추적(자재→PCB)" screenId={SCREEN_ID} />

      {/* 상단 바 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold shrink-0">자재릴번호</span>
          <input
            type="text"
            value={reelCd}
            onChange={(e) => setReelCd(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="ReelCd 입력 (예: 품번-LOT-수량)"
            className={`${inputCls} w-80 placeholder:text-gray-400`}
          />
        </label>
        <button
          onClick={handleSearch}
          disabled={loading || !reelCd.trim()}
          className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold
                     disabled:opacity-50 transition-colors"
        >
          {loading ? '조회중...' : '조회'}
        </button>

        {hasData && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              입고 <strong className="text-emerald-500">{receipt.length}</strong>건
              {' / '}출고 <strong className="text-orange-500">{issues.length}</strong>건
              {' / '}PCB <strong className="text-blue-500">{boards.length}</strong>건
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <span className="w-8 h-8 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
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
            <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">입고이력</h3>
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
                  {receipt.map((r, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
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
            <h3 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-2">출고이력 ({issues.length}건)</h3>
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
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
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

        {/* ═══ 3. 사용된 PCB 목록 ═══ */}
        {boards.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">사용된 PCB ({boards.length}건)</h3>
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
                        onClick={() => handleBoardClick(b.BoardSN)}
                        className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                          expandedBoard === b.BoardSN
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
                                  <span className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                                  장착 상세 조회 중...
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
          </section>
        )}
      </div>

      <DisplayFooter />
    </div>
  );
}
