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
import DisplayFooter from "@/components/display/DisplayFooter";
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

  /* -- 사이드바 접기 상태 -- */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

      <div className="flex flex-1 min-h-0 relative">
        {/* 접혔을 때 나타나는 펴기 버튼 */}
        {sidebarCollapsed && (
          <button 
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-4 left-0 z-20 p-1.5 rounded-r-md bg-gray-800 border border-l-0 border-gray-700 text-blue-400 hover:text-white hover:bg-blue-600 transition-all shadow-lg"
            title="Expand Sidebar"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        <DashboardSidebar 
          settings={settings} 
          onChange={setSettings} 
          onRefresh={fetchData} 
          loading={loading}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(true)}
        />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "ml-0" : ""}`}>
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
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
