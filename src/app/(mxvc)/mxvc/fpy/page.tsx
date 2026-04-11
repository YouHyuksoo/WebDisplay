/**
 * @file src/app/(mxvc)/mxvc/fpy/page.tsx
 * @description 멕시코전장 직행율(FPY) 대시보드 메인 페이지
 *
 * 초보자 가이드:
 * 1. 상단 요약바: 기간/프리셋/레이아웃/팔레트/차트높이 설정
 * 2. 왼쪽 사이드바: 차트 토글 (표시할 테이블 체크박스)
 * 3. 오른쪽: 13개 테이블 시간대별 직행율 바 차트 (스크롤)
 * 4. quality-dashboard 페이지와 동일한 레이아웃 패턴
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import DisplayHeader from "@/components/display/DisplayHeader";
import DisplayFooter from "@/components/display/DisplayFooter";
import { usePersistedState } from "@/hooks/ctq/usePersistedState";
import useDisplayTiming from "@/hooks/useDisplayTiming";
import { useMxvcFpy } from "@/hooks/mxvc/useMxvcFpy";
import { useServerTime } from "@/hooks/useServerTime";
import FpyChartSidebar from "@/components/mxvc/FpyChartSidebar";
import FpyDashboard from "@/components/mxvc/FpyDashboard";
import type { MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { DEFAULT_FPY_SETTINGS, FPY_PRESETS } from "@/types/mxvc/fpy";

const SCREEN_ID = "mxvc-fpy";

const PRESET_LABELS: Record<string, string> = {
  default: "기본",
  all: "전체",
  smt: "SMT",
  coating: "코팅",
  inspection: "검사",
};

const inputCls = "bg-gray-800 text-gray-200 border border-gray-600 rounded-md px-3 py-1.5 text-xs";

export default function MxvcFpyPage() {
  const t = useTranslations("common");
  const timing = useDisplayTiming();

  const [settings, setSettings] = usePersistedState<MxvcFpySettings>(
    "mxvc-fpy-settings",
    DEFAULT_FPY_SETTINGS,
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const serverToday = useServerTime();

  /* 서버 시간 로드 시 기본 기간 설정: 당일 08:00 ~ 현재 */
  useEffect(() => {
    if (serverToday && !settings.dateFrom) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setSettings({
        ...settings,
        dateFrom: `${serverToday}T08:00`,
        dateTo: `${serverToday}T${hh}:${mm}`,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverToday]);

  const { data, loading, error, fetchData } = useMxvcFpy(
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
      <DisplayHeader title="멕시코전장 직행율" screenId={SCREEN_ID} />

      {/* ═══════ 상단 설정 바 ═══════ */}
      <div className="shrink-0 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3" suppressHydrationWarning>
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

          {/* 차트 타입 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">차트</span>
            <select value={settings.chartType ?? "bar"}
              onChange={(e) => set({ chartType: e.target.value as MxvcFpySettings["chartType"] })}
              className={`${inputCls} min-w-20`}>
              <option value="bar">Bar</option>
              <option value="area">Area</option>
              <option value="line">Line</option>
            </select>
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

          {/* 팔레트 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">색상</span>
            <select value={settings.palette}
              onChange={(e) => set({ palette: e.target.value as MxvcFpySettings["palette"] })}
              className={`${inputCls} min-w-24`}>
              <option value="blue">Blue</option>
              <option value="rainbow">Rainbow</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          {/* 차트 높이 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">높이</span>
            <input type="range" min={120} max={350} value={settings.chartHeight}
              onChange={(e) => set({ chartHeight: Number(e.target.value) })}
              className="w-28 accent-blue-500" />
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono min-w-12">{mounted ? `${settings.chartHeight}px` : ""}</span>
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
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
              <span className="w-8 h-8 border-4 border-gray-300 dark:border-gray-700 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin" />
              {t("loading")}
            </div>
          )}
          {data && <FpyDashboard data={data} settings={settings} />}
        </div>
      </div>

      <DisplayFooter loading={loading} lastUpdated={data?.lastUpdated} />
    </div>
  );
}
