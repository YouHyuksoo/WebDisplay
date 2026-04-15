/**
 * @file src/app/(ctq)/ctq/analysis/page.tsx
 * @description CTQ 종합분석 페이지 — 8개 모니터링 요약 + 상세 보고서
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import AnalysisSummaryCards from "@/components/ctq/AnalysisSummaryCards";
import AnalysisDetailReport from "@/components/ctq/AnalysisDetailReport";
import Spinner from "@/components/ui/Spinner";
import { useAnalysis } from "@/hooks/ctq/useAnalysis";

const SCREEN_ID = "ctq-analysis";

export default function AnalysisPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  const [selectedLines, setSelectedLines] = useState<string>("%");

  const readLines = useCallback(() => {
    try {
      const saved = localStorage.getItem(`display-lines-${SCREEN_ID}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedLines(parsed.includes("%") ? "%" : parsed.join(","));
        }
      }
    } catch { /* 무시 */ }
  }, []);

  useEffect(() => {
    readLines();
    const handler = () => readLines();
    window.addEventListener(`line-config-changed-${SCREEN_ID}`, handler);
    return () => window.removeEventListener(`line-config-changed-${SCREEN_ID}`, handler);
  }, [readLines]);

  const { data, loading, fetchAll } = useAnalysis(selectedLines);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchAll, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      <DisplayHeader title={t("pages.analysis.title")} screenId={SCREEN_ID} />

      <div className="bg-gray-900 border-b border-gray-700 px-6 py-2 shrink-0">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{t("pages.analysis.overallStatus")}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAll}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h5M20 20v-5h-5M5.1 15A7 7 0 0118.9 9M18.9 15a7 7 0 01-13.8 0"
                />
              </svg>
              {loading ? t("common.loading") : t("common.refresh")}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div className="max-w-[1920px] mx-auto w-full">
          {loading && !data && (
            <Spinner fullscreen size="lg" vertical label={t("common.dataLoading")} />
          )}

          {data && (
            <>
              <AnalysisSummaryCards
                summaries={data.summaries}
                overall={data.overall}
              />
              <AnalysisDetailReport summaries={data.summaries} />
            </>
          )}
        </div>
      </main>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
