/**
 * @file src/app/(mxvc)/mxvc/fpy/page.tsx
 * @description 멕시코전장 직행율(FPY) 대시보드 메인 페이지
 *
 * 초보자 가이드:
 * 1. 왼쪽 사이드바: 차트 설정 (프리셋/레이아웃/설비필터/차트토글)
 * 2. 오른쪽: 13개 테이블 시간대별 직행율 바 차트 (스크롤)
 * 3. quality-dashboard 페이지와 동일한 레이아웃 패턴
 * 4. 작업일 08:00 기준
 */
"use client";

import { useState, useEffect } from "react";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import { usePersistedState } from "@/hooks/ctq/usePersistedState";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useMxvcFpy } from "@/hooks/mxvc/useMxvcFpy";
import FpySidebar from "@/components/mxvc/FpySidebar";
import FpyDashboard from "@/components/mxvc/FpyDashboard";
import type { MxvcFpySettings } from "@/types/mxvc/fpy";
import { DEFAULT_FPY_SETTINGS } from "@/types/mxvc/fpy";

const SCREEN_ID = "mxvc-fpy";

export default function MxvcFpyPage() {
  const timing = useDisplayTiming();

  const [settings, setSettings] = usePersistedState<MxvcFpySettings>(
    "mxvc-fpy-settings",
    DEFAULT_FPY_SETTINGS,
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data, loading, error, fetchData } = useMxvcFpy(
    settings.dayOffset ?? 0,
  );

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 직행율" screenId={SCREEN_ID} />

      <div className="flex flex-1 min-h-0 relative">
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute top-4 left-0 z-20 p-1.5 rounded-r-md bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-300 dark:border-gray-700 text-blue-500 dark:text-blue-400 hover:text-white hover:bg-blue-600 transition-all shadow-lg"
            title="사이드바 열기"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        <FpySidebar
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
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                데이터 조회 실패: {error}
              </div>
            </div>
          )}
          {loading && !data && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
              <span className="w-8 h-8 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
              데이터 조회 중...
            </div>
          )}
          {data && <FpyDashboard data={data} settings={settings} />}
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
