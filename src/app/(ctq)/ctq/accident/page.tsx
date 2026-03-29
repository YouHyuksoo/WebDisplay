/**
 * @file src/app/(ctq)/ctq/accident/page.tsx
 * @description CTQ 사고성 모니터링 - HIPOT/BURNIN/ATE 공정 NG 등급 판정
 *
 * 초보자 가이드:
 * 1. **대상 공정**: HIPOT, BURNIN, ATE
 * 2. **판정 기준**:
 *    - HIPOT: 1건+ → A급
 *    - BURNIN/ATE: 2건+ → A급, 1건 → B급
 * 3. **DisplayHeader**: WebDisplay 공통 헤더 사용 (라인선택, 타이밍 설정 통합)
 * 4. **라인 선택**: display-lines-ctq-accident localStorage 키 사용
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import { useAutoRolling } from "@/hooks/ctq/useAutoRolling";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useSelectedLines } from "@/hooks/ctq/useSelectedLines";
import AccidentLineCard from "@/components/ctq/AccidentLineCard";
import type { AccidentResponse } from "@/types/ctq/accident";

const SCREEN_ID = "ctq-accident";
const ITEMS_PER_PAGE = 12;

export default function AccidentPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  /* ── 라인 선택 상태 ── */
  const selectedLines = useSelectedLines(SCREEN_ID);

  /* ── 데이터 폴링 ── */
  const [data, setData] = useState<AccidentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ctq/accident?lines=${encodeURIComponent(selectedLines)}`);
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

  /* ── 자동 롤링 ── */
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
  const bCount = data?.lines.filter((l) => l.overallGrade === "B").length ?? 0;
  const okCount = data?.lines.filter((l) => l.overallGrade === "OK").length ?? 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── WebDisplay 공통 헤더 ── */}
      <DisplayHeader title={t("pages.accident.title")} screenId={SCREEN_ID} />

      {/* ── 요약 바 ── */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-2">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{t("table.process")}: HIPOT, BURN-IN, ATE</span>
            <span>
              <span className="text-red-400 font-bold">{t("grade.a")}</span>: HIPOT 1+, BURN-IN/ATE 2+
            </span>
            <span>
              <span className="text-orange-400 font-bold">{t("grade.b")}</span>: BURN-IN/ATE 1
            </span>
          </div>
          <div className="flex items-center gap-4">
            {data && data.lines.length > 0 && (
              <>
                <SummaryBadge label={t("pages.accident.gradeALabel")} count={aCount} color="bg-red-600" />
                <SummaryBadge label={t("pages.accident.gradeBLabel")} count={bCount} color="bg-yellow-600" />
                <SummaryBadge label={t("grade.running")} count={okCount} color="bg-green-700" />
              </>
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

      {/* ── 본문 ── */}
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
            {t("common.noActiveLines")}
          </div>
        )}
        {data && data.lines.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {visibleLines.map((line) => (
                <AccidentLineCard key={line.lineCode} line={line} compact />
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
