/**
 * @file src/app/(mxvc)/mxvc/interlock/page.tsx
 * @description 멕시코전장 설비호출이력 — 공정별 카드형 대시보드
 * 초보자 가이드:
 * 1. 공정(WORKSTAGE_CODE) 1개 = 카드 1장
 * 2. 상단 필터: 라인 + 공정 동시 필터 (클라이언트 사이드)
 * 3. 각 카드 안에 해당 공정의 최근 호출이력 10건 표시
 * 4. 카드별 '더보기' 페이지네이션으로 추가 이력 조회
 * 5. 10초 폴링 (useDisplayTiming)
 */
"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useInterlock } from "@/hooks/mxvc/useInterlock";
import InterlockCardGrid from "@/components/mxvc/InterlockCardGrid";
import Spinner from "@/components/ui/Spinner";
import type { WorkstageCard } from "@/types/mxvc/interlock";

const SCREEN_ID = "mxvc-interlock";

export default function InterlockPage() {
  const t = useTranslations("common");
  const timing = useDisplayTiming();
  const { data, loading, error, fetchData } = useInterlock();
  const [filterLine, setFilterLine] = useState("");
  const [filterWorkstage, setFilterWorkstage] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  /** 전체 카드에서 고유 라인/공정 목록 추출 */
  const { lineOptions, workstageOptions } = useMemo(() => {
    if (!data?.cards) return { lineOptions: [], workstageOptions: [] };
    const lines = new Set<string>();
    const workstages = new Set<string>();
    for (const card of data.cards) {
      workstages.add(card.workstageCode);
      for (const log of card.logs) {
        if (log.lineCode !== "-") lines.add(log.lineCode);
      }
    }
    return {
      lineOptions: Array.from(lines).sort(),
      workstageOptions: Array.from(workstages).sort(),
    };
  }, [data]);

  /** 필터 적용 */
  const filteredCards = useMemo((): WorkstageCard[] => {
    if (!data?.cards) return [];
    let cards = data.cards;

    if (filterWorkstage) {
      cards = cards.filter((c) => c.workstageCode === filterWorkstage);
    }

    if (filterLine) {
      cards = cards
        .map((c) => ({ ...c, logs: c.logs.filter((l) => l.lineCode === filterLine) }))
        .filter((c) => c.logs.length > 0);
    }

    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase();
      cards = cards
        .map((c) => ({
          ...c,
          logs: c.logs.filter((l) =>
            l.req.toLowerCase().includes(kw) || l.returnMsg.toLowerCase().includes(kw),
          ),
        }))
        .filter((c) => c.logs.length > 0);
    }

    return cards;
  }, [data, filterLine, filterWorkstage, filterKeyword]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="설비호출이력" screenId={SCREEN_ID} />

      {error && (
        <div className="shrink-0 px-6 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-300 dark:border-red-700 text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* 필터 바 */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">LINE</span>
          <select
            value={filterLine}
            onChange={(e) => setFilterLine(e.target.value)}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-w-[120px]"
          >
            <option value="">전체</option>
            {lineOptions.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">공정</span>
          <select
            value={filterWorkstage}
            onChange={(e) => setFilterWorkstage(e.target.value)}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-w-[120px]"
          >
            <option value="">전체</option>
            {workstageOptions.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold">검색</span>
          <input
            type="text"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            placeholder="REQ / RETURN 내용 검색"
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm w-56 placeholder:text-gray-400"
          />
        </div>
        {(filterLine || filterWorkstage || filterKeyword) && (
          <button
            onClick={() => { setFilterLine(""); setFilterWorkstage(""); setFilterKeyword(""); }}
            className="text-sm text-blue-500 hover:text-blue-400 font-medium"
          >
            초기화
          </button>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {filteredCards.length}개 공정
          </span>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      {/* 카드 그리드 영역 */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
        {loading && !data && (
          <div className="flex items-center justify-center h-64">
            <Spinner size="md" label={t("loading")} />
          </div>
        )}
        {data && <InterlockCardGrid cards={filteredCards} />}
        {!data && !loading && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {t("noData")}
          </div>
        )}
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
