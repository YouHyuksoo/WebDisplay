/**
 * @file src/app/(ctq)/ctq/quality-dashboard/page.tsx
 * @description 품질 분석 대시보드 페이지 — 사이드바 설정 + QC/RAW 차트 통합
 *
 * 초보자 가이드:
 * 1. 왼쪽 사이드바: 차트 구성 설정 (레이아웃/높이/팔레트/17종 토글)
 * 2. 오른쪽: QC 테이블 차트 + RAW 테이블 인사이트 차트
 * 3. h-screen flex 레이아웃 — 차트 영역만 스크롤
 * 4. DisplayHeader: WebDisplay 공통 헤더 사용 (라인선택, 타이밍 통합)
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { usePersistedState } from "@/hooks/ctq/usePersistedState";
import { useQualityDashboard } from "@/hooks/ctq/useQualityDashboard";
import DashboardSidebar from "@/components/ctq/DashboardSidebar";
import DashboardCharts from "@/components/ctq/DashboardCharts";
import type { DashboardSettings } from "@/types/ctq/quality-dashboard";
import { DEFAULT_SETTINGS } from "@/types/ctq/quality-dashboard";

const SCREEN_ID = "ctq-dashboard";

export default function QualityDashboardPage() {
  const t = useTranslations("ctq");
  const timing = useDisplayTiming();

  /* -- 라인 선택 상태 (localStorage + window event) -- */
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

  /* -- 대시보드 설정 (localStorage 저장) -- */
  const [settings, setSettings] = usePersistedState<DashboardSettings>(
    "quality-dashboard-settings",
    DEFAULT_SETTINGS,
  );

  /* -- 데이터 조회 -- */
  const { data, rawData, error, loading, fetchData } = useQualityDashboard(selectedLines);

  /* -- 초기 로드 + 주기적 새로고침 -- */
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* -- WebDisplay 공통 헤더 -- */}
      <DisplayHeader title={t("pages.qualityDashboard.title")} screenId={SCREEN_ID} />

      <div className="flex flex-1 min-h-0">
        <DashboardSidebar settings={settings} onChange={setSettings} onRefresh={fetchData} loading={loading} />

        {error && !data && (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {t("common.dataError")}: {error}
            </div>
          </div>
        )}
        {loading && !data && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
            <span className="w-8 h-8 border-4 border-gray-700 border-t-blue-400 rounded-full animate-spin" />
            {t("common.dataLoading")}
          </div>
        )}
        {data && (
          <DashboardCharts data={data} settings={settings} rawData={rawData} />
        )}
      </div>

      <footer className="shrink-0 bg-gray-900 border-t border-gray-700 px-6 py-1.5">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
            <span>{loading ? t("common.dataLoading") : t("common.statusNormal")}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {data && (
              <span>{t("common.refresh")}: {new Date(data.lastUpdated).toLocaleTimeString()}</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
