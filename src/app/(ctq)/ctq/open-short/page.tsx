/**
 * @file src/app/(ctq)/ctq/open-short/page.tsx
 * @description CTQ 공용부품 Open/Short 모니터링 (ICT 공정)
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
import OpenShortLineCard from "@/components/ctq/OpenShortLineCard";
import Spinner from "@/components/ui/Spinner";
import type { OpenShortResponse } from "@/types/ctq/open-short";

const SCREEN_ID = "ctq-open-short";
const ITEMS_PER_PAGE = 12;

export default function OpenShortPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  const selectedLines = useSelectedLines(SCREEN_ID);

  const [data, setData] = useState<OpenShortResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ctq/open-short?lines=${encodeURIComponent(selectedLines)}`);
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

  const totalItems = data?.lines.length ?? 0;
  const { currentPage, totalPages, startIdx, endIdx, progress, setCurrentPage } =
    useAutoRolling({
      totalItems,
      itemsPerPage: ITEMS_PER_PAGE,
      intervalMs: timing.scrollSeconds * 1000,
      enabled: true,
    });

  const visibleLines = data?.lines.slice(startIdx, endIdx) ?? [];
  const bCount = data?.lines.filter((l) => l.overallGrade === "B").length ?? 0;

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      <DisplayHeader title={t("pages.openShort.title")} screenId={SCREEN_ID} />

      <div className="bg-gray-900 border-b border-gray-700 px-6 py-2 shrink-0">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <CriteriaTooltip pageKey="openShort" />
            <span>{t("table.process")}: ICT</span>
            <span>
              <span className="text-orange-400 font-bold">{t("grade.b")}</span>: {t("table.sameComponent")} + {t("table.sameBadCode")} {t("table.dailyNg")} 2+
            </span>
          </div>
          <div className="flex items-center gap-4">
            {data && data.lines.length > 0 && (
              <SummaryBadge label={t("pages.openShort.gradeBLabel")} count={bCount} color="bg-orange-600" />
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

      <main className="flex-1 overflow-y-auto px-4 py-2">
        <div className="max-w-[1920px] mx-auto">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {t("common.dataError")}: {error}
            </div>
          )}
          {loading && !data && (
            <Spinner fullscreen size="lg" vertical label={t("common.dataLoading")} />
          )}
          {data && data.lines.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {t("pages.openShort.noData")}
            </div>
          )}
          {data && data.lines.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {visibleLines.map((line) => (
                  <OpenShortLineCard key={line.lineCode} line={line} compact />
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
        </div>
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
