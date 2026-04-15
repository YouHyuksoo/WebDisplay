/**
 * @file src/app/(mxvc)/mxvc/p-chart/page.tsx
 * @description 멕시코전장 p 관리도 대시보드 — 테이블별 불량률 관리도
 *
 * 초보자 가이드:
 * 1. FPY 페이지와 동일한 레이아웃 (상단 설정 바 + 사이드바 차트 토글)
 * 2. 각 LOG 테이블의 시간대별 불량률(p)을 관리도로 표현
 * 3. UCL/LCL은 서브그룹 크기에 따라 변동 (물결 모양)
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import { usePersistedState } from "@/hooks/ctq/usePersistedState";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useServerTime } from "@/hooks/useServerTime";
import { useMxvcPChart } from "@/hooks/mxvc/useMxvcPChart";
import FpyChartSidebar from "@/components/mxvc/FpyChartSidebar";
import PChartDashboard from "@/components/mxvc/PChartDashboard";
import Spinner from "@/components/ui/Spinner";
import type { MxvcFpySettings } from "@/types/mxvc/fpy";
import { DEFAULT_FPY_SETTINGS, FPY_PRESETS } from "@/types/mxvc/fpy";

const SCREEN_ID = "mxvc-p-chart";

const PRESET_LABELS: Record<string, string> = {
  default: "기본",
  all: "전체",
  smt: "SMT",
  coating: "코팅",
  inspection: "검사",
};

const inputCls = "bg-gray-800 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-xs";

export default function MxvcPChartPage() {
  const t = useTranslations("common");
  const timing = useDisplayTiming();

  const [settings, setSettings] = usePersistedState<MxvcFpySettings>(
    "mxvc-pchart-settings",
    DEFAULT_FPY_SETTINGS,
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const serverToday = useServerTime();

  /* 서버 시간 로드 시 기본 기간 설정: 30일 전 ~ 현재 */
  useEffect(() => {
    if (serverToday && !settings.dateFrom) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const from = new Date(serverToday + "T00:00:00");
      from.setDate(from.getDate() - 30);
      const fromStr = from.toISOString().slice(0, 10);
      setSettings({
        ...settings,
        dateFrom: `${fromStr}T08:00`,
        dateTo: `${serverToday}T${hh}:${mm}`,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToday]);

  const { data, loading, error, fetchData } = useMxvcPChart(
    settings.dateFrom ?? "",
    settings.dateTo ?? "",
  );

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, timing.refreshSeconds * 1000);
    return () => clearInterval(id);
  }, [fetchData, timing.refreshSeconds]);

  const set = (patch: Partial<MxvcFpySettings>) =>
    setSettings({ ...settings, ...patch });

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 양품률 관리도" screenId={SCREEN_ID} />

      {/* ═══════ 상단 설정 바 ═══════ */}
      <div className="shrink-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center gap-6 max-w-[1920px] mx-auto min-h-12 flex-wrap">
          {/* 조회 기간 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">기간</span>
            <input type="datetime-local" value={settings.dateFrom ?? ""}
              onChange={(e) => set({ dateFrom: e.target.value })}
              className={`${inputCls} w-44`} />
            <span className="text-xs text-gray-500">~</span>
            <input type="datetime-local" value={settings.dateTo ?? ""}
              onChange={(e) => set({ dateTo: e.target.value })}
              className={`${inputCls} w-44`} />
            <button onClick={() => {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, "0");
                const mm = String(now.getMinutes()).padStart(2, "0");
                const today = serverToday || now.toISOString().slice(0, 10);
                set({ dateFrom: `${today}T08:00`, dateTo: `${today}T${hh}:${mm}` });
              }}
              className="px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
              오늘
            </button>
          </div>

          {/* 프리셋 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">프리셋</span>
            {Object.entries(PRESET_LABELS).map(([k, v]) => (
              <button key={k}
                onClick={() => setSettings({ ...settings, ...FPY_PRESETS[k] })}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-300 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors whitespace-nowrap">
                {v}
              </button>
            ))}
          </div>

          {/* 레이아웃 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">레이아웃</span>
            <select value={settings.layout}
              onChange={(e) => set({ layout: e.target.value as MxvcFpySettings["layout"] })}
              className={`${inputCls} min-w-24`}>
              <option value="2x3">2열</option>
              <option value="3x2">3열</option>
              <option value="2x2+1">2열+1</option>
            </select>
          </div>

          {/* 차트 높이 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">높이</span>
            <input type="range" min={120} max={350} value={settings.chartHeight}
              onChange={(e) => set({ chartHeight: Number(e.target.value) })}
              className="w-28 accent-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono min-w-12">
              {mounted ? `${settings.chartHeight}px` : ""}
            </span>
          </div>

          {/* 새로고침 */}
          <button onClick={fetchData} disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors whitespace-nowrap">
            {loading ? t("loading") : t("refresh")}
          </button>
        </div>
      </div>

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

        <FpyChartSidebar
          settings={settings}
          onChange={setSettings}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(true)}
        />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? "ml-0" : ""}`}>
          {error && !data && (
            <div className="flex-1 flex items-center justify-center">
              <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-300 text-sm">
                {t("error")}: {error}
              </div>
            </div>
          )}
          {loading && !data && (
            <div className="flex-1 flex items-center justify-center">
              <Spinner size="lg" vertical label={t("loading")} />
            </div>
          )}
          {data && <PChartDashboard data={data} settings={settings} />}
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
