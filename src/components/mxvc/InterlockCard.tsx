/**
 * @file src/components/mxvc/InterlockCard.tsx
 * @description 인터락 공정 카드 — 공정 1개 = 카드 1장 (컴팩트)
 * 초보자 가이드:
 * 1. 헤더: 공정명 + OK/NG 건수 + 크게보기 아이콘
 * 2. 본문: 이력 리스트 — LINE·ADDR + REQ/RETURN 내용
 * 3. 하단: 더보기 페이지네이션
 * 4. 크게보기: 모달로 전체 이력 + REQ/RETURN 전문 표시
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { WorkstageCard, InterlockLog } from "@/types/mxvc/interlock";
import { useInterlockDetail } from "@/hooks/mxvc/useInterlock";

interface InterlockCardProps {
  card: WorkstageCard;
}

/** 이력 행 렌더링 (카드/모달 공용) */
function LogRow({ log, full }: { log: InterlockLog; full?: boolean }) {
  const isNg = log.result === "NG";
  const truncate = full ? "" : "truncate";
  return (
    <div className={`px-2 py-1.5 ${isNg ? "bg-red-950/10 dark:bg-red-950/20" : "bg-white dark:bg-transparent"}`}>
      <div className="flex items-center gap-1 text-[10px] mb-0.5">
        <span className="font-semibold text-gray-600 dark:text-gray-300">{log.lineCode}</span>
        <span className="text-gray-400">·</span>
        <span className="font-mono text-gray-500 dark:text-gray-400">{log.addr}</span>
        <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${isNg ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
          {log.result}
        </span>
        <span className="shrink-0 font-mono text-[9px] text-gray-400">{log.callDate.slice(11)}</span>
      </div>
      <p className={`text-[11px] text-gray-700 dark:text-gray-300 ${truncate}`} title={log.req}>
        <span className="text-gray-400 mr-1">REQ</span>{log.req}
      </p>
      <p className={`text-[11px] ${truncate} ${isNg ? "text-red-400" : "text-gray-500 dark:text-gray-400"}`} title={log.returnMsg}>
        <span className="text-gray-400 mr-1">RET</span>{log.returnMsg}
      </p>
    </div>
  );
}

export default function InterlockCard({ card }: InterlockCardProps) {
  const t = useTranslations("common");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { data: detail, loading, fetchData } = useInterlockDetail(card.workstageCode, page);

  useEffect(() => {
    if (expanded || modalOpen) fetchData();
  }, [expanded, modalOpen, fetchData]);

  const logs = expanded && detail ? detail.logs : card.logs;
  const modalLogs = detail ? detail.logs : card.logs;
  const totalPages = detail?.pagination?.totalPages ?? 1;

  return (
    <>
      <div className="rounded-lg border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900/50 shadow-sm overflow-hidden flex flex-col h-56">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-gradient-to-r from-purple-100 via-fuchsia-100 to-pink-100 dark:from-purple-900/40 dark:via-fuchsia-900/40 dark:to-pink-900/40 border-b border-purple-200 dark:border-fuchsia-700/50">
          <span className="text-xs font-bold text-purple-800 dark:text-purple-200">
            {card.workstageCode}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-green-600 dark:text-green-400">OK {card.okCount}</span>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-bold text-red-500 dark:text-red-400">NG {card.ngCount}</span>
            <span className="text-xs text-gray-400">({card.totalCount})</span>
            {/* 크게보기 아이콘 */}
            <button
              onClick={() => { setModalOpen(true); setExpanded(true); }}
              className="ml-1 p-0.5 rounded hover:bg-fuchsia-200 dark:hover:bg-fuchsia-800 text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-fuchsia-200 transition-colors"
              title="크게 보기"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
              </svg>
            </button>
          </div>
        </div>

        {/* 이력 리스트 */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-300 dark:divide-gray-600">
          {logs.map((log, idx) => (
            <LogRow key={`${log.callDate}-${idx}`} log={log} />
          ))}
          {logs.length === 0 && (
            <div className="px-2 py-4 text-center text-[10px] text-gray-400">{t("noData")}</div>
          )}
        </div>

        {/* 하단: 더보기 */}
        {card.totalCount > card.logs.length && !expanded && (
          <div className="shrink-0 px-2 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 text-[10px]">
            <button onClick={() => setExpanded(true)} className="text-blue-500 hover:text-blue-400 font-medium">
              +{card.totalCount - card.logs.length}건 더보기
            </button>
          </div>
        )}
        {expanded && (
          <div className="shrink-0 flex items-center justify-between px-2 py-1 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 text-[10px]">
            <span className="text-gray-400">{page}/{totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 disabled:opacity-30">&lsaquo;</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 disabled:opacity-30">&rsaquo;</button>
            </div>
          </div>
        )}
      </div>

      {/* 크게보기 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalOpen(false)}>
          <div
            className="w-[90vw] max-w-4xl max-h-[80vh] bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-md text-sm font-bold bg-blue-600 text-white">{card.workstageCode}</span>
                <span className="text-xs font-bold text-green-500">OK {card.okCount}</span>
                <span className="text-xs font-bold text-red-500">NG {card.ngCount}</span>
                <span className="text-xs text-gray-400">총 {card.totalCount}건</span>
              </div>
              <div className="flex items-center gap-2">
                {/* 페이지네이션 */}
                <span className="text-xs text-gray-400">{page}/{totalPages}</span>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs disabled:opacity-30">&lsaquo;</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs disabled:opacity-30">&rsaquo;</button>
                {/* 닫기 */}
                <button onClick={() => setModalOpen(false)}
                  className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  title="닫기">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* 모달 이력 — REQ/RETURN 전문 표시 */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-300 dark:divide-gray-600">
              {modalLogs.map((log, idx) => (
                <LogRow key={`${log.callDate}-${idx}`} log={log} full />
              ))}
              {modalLogs.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">{t("noData")}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
