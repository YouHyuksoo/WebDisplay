/**
 * @file src/app/(u1)/u1/fpy/page.tsx
 * @description U1전용 직행율(First Pass Yield) 모니터링 페이지
 *
 * 초보자 가이드:
 * 1. **대상 공정**: HIPOT, ATE, 펌웨어(FW), ICT, BURNIN
 * 2. **판정 기준**: 당일 직행율 90% 미만 -> A급 (Line Stop)
 * 3. **DisplayHeader**: WebDisplay 공통 헤더 사용 (라인선택, 타이밍 설정 통합)
 * 4. **라인 선택**: display-lines-u1-fpy localStorage 키 사용
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import { useAutoRolling } from "@/hooks/ctq/useAutoRolling";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useSelectedLines } from "@/hooks/ctq/useSelectedLines";
import CriteriaTooltip from "@/components/ctq/CriteriaTooltip";
import U1FpyLineCard from "@/components/u1/U1FpyLineCard";
import type { U1FpyResponse } from "@/types/u1/fpy";

const SCREEN_ID = "u1-fpy";
const ITEMS_PER_PAGE = 12;

export default function U1FpyPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  /* -- 라인 선택 상태 -- */
  const selectedLines = useSelectedLines(SCREEN_ID);

  /* -- 데이터 폴링 -- */
  const [data, setData] = useState<U1FpyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/u1/fpy?lines=${encodeURIComponent(selectedLines)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (active) { setData(json); setError(null); }
      } catch (e) {
        if (active) setError(String(e));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => { active = false; clearInterval(id); };
  }, [selectedLines, timing.refreshSeconds]);

  /* -- 자동 롤링 -- */
  const totalItems = data?.lines.length ?? 0;
  const { currentPage, totalPages, startIdx, endIdx, progress, setCurrentPage } =
    useAutoRolling({
      totalItems,
      itemsPerPage: ITEMS_PER_PAGE,
      intervalMs: timing.scrollSeconds * 1000,
      enabled: true,
    });

  const visibleLines = data?.lines.slice(startIdx, endIdx) ?? [];
  const aCount = data?.lines.filter((l) => l.overallGrade === "A").length ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* -- WebDisplay 공통 헤더 -- */}
      <DisplayHeader title={t("pages.u1fpy.title")} screenId={SCREEN_ID} />

      {/* -- 요약 바 -- */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <CriteriaTooltip pageKey="u1fpy" />
            <span>{t("table.process")}: HIPOT, ATE, 펌웨어, ICT, BURNIN</span>
            <span>
              <span className="text-red-400 font-bold">{t("grade.a")}</span>: {t("pages.u1fpy.gradeDesc")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {data && data.lines.length > 0 && aCount > 0 && (
              <SummaryBadge label={t("pages.u1fpy.gradeALabel")} count={aCount} color="bg-red-600" />
            )}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="max-w-[1920px] mx-auto mt-1">
            <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* -- 본문 -- */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-4 py-2">
        {error && (
          <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {t("common.dataError")}: {error}
          </div>
        )}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
            <span className="w-8 h-8 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
            {t("common.dataLoading")}
          </div>
        )}
        {data && data.lines.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            {t("pages.u1fpy.noData")}
          </div>
        )}
        {data && data.lines.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {visibleLines.map((line) => (
                <U1FpyLineCard key={line.lineCode} line={line} dateRange={data.dateRange} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pb-4">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === currentPage ? "bg-blue-500" : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  />
                ))}
                <span className="ml-2 text-xs text-gray-500">
                  {currentPage + 1} / {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </main>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}

function SummaryBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-800 rounded-lg border border-gray-700">
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{count}</span>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
}
