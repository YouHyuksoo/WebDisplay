/**
 * @file src/app/(ctq)/ctq/analysis/page.tsx
 * @description CTQ 종합분석 페이지 — 8개 모니터링 요약 + 상세 보고서
 *
 * 초보자 가이드:
 * 1. **useAnalysis 훅**: 8개 CTQ API를 병렬 호출하여 등급 집계
 * 2. **SummaryCards**: 요약 카드 8개 + 전체 현황 바
 * 3. **DetailReport**: 이상 라인 상세 보고서 8섹션
 * 4. **자동 갱신**: useDisplayTiming 기반 polling (수동 새로고침도 가능)
 * 5. **DisplayHeader**: WebDisplay 공통 헤더 사용 (라인선택, 타이밍 설정 통합)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import AnalysisSummaryCards from "@/components/ctq/AnalysisSummaryCards";
import AnalysisDetailReport from "@/components/ctq/AnalysisDetailReport";
import { useAnalysis } from "@/hooks/ctq/useAnalysis";

const SCREEN_ID = "ctq-analysis";

export default function AnalysisPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  /* ── 라인 선택 상태 (localStorage + window event) ── */
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
    } catch {
      /* 무시 */
    }
  }, []);

  useEffect(() => {
    readLines();
    const handler = () => readLines();
    window.addEventListener(`line-config-changed-${SCREEN_ID}`, handler);
    return () =>
      window.removeEventListener(`line-config-changed-${SCREEN_ID}`, handler);
  }, [readLines]);

  /* ── 데이터 훅 ── */
  const { data, loading, fetchAll } = useAnalysis(selectedLines);

  /* ── 자동 갱신 (polling) ── */
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchAll, timing.refreshSeconds]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── WebDisplay 공통 헤더 ── */}
      <DisplayHeader title={t("pages.analysis.title")} screenId={SCREEN_ID} />

      {/* ── 요약 바 ── */}
      <div className="bg-gray-900 border-b border-gray-700 px-6 py-2">
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
            {data && (
              <span className="text-xs text-gray-500">
                {t("pages.analysis.reportTime")}:{" "}
                {new Date(data.lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── 본문 ── */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full px-4 py-4 space-y-6">
        {/* 로딩 스피너 */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
            <span className="w-8 h-8 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
            {t("common.dataLoading")}
          </div>
        )}

        {/* 데이터 렌더링 */}
        {data && (
          <>
            <AnalysisSummaryCards
              summaries={data.summaries}
              overall={data.overall}
            />
            <AnalysisDetailReport summaries={data.summaries} />
          </>
        )}
      </main>
    </div>
  );
}
