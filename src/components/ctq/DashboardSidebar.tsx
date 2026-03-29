/**
 * @file src/components/ctq/DashboardSidebar.tsx
 * @description 대시보드 사이드바 — 차트 설정 컨트롤 패널 (17종 차트 토글)
 *
 * 초보자 가이드:
 * 1. 레이아웃, 차트 높이, 색상 팔레트, 17종 차트 토글 제어
 * 2. 프리셋으로 빠른 구성 전환
 */

"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { DashboardSettings } from "@/types/ctq/quality-dashboard";
import { DEFAULT_SETTINGS } from "@/types/ctq/quality-dashboard";

const PRESETS: Record<string, Partial<DashboardSettings>> = {
  default: { ...DEFAULT_SETTINGS },
  manager: { layout: "2x2+1", chartHeight: 220, palette: "rainbow", showProcess: true, showBadCode: true, showLine: false, showRepair: true, showHourly: true, showModel: false, showDefectItem: false, showLocation: false, showRepairWorkstage: false, showReceipt: true, showSummary: true },
  line: { layout: "2x3", chartHeight: 200, palette: "cool", showProcess: true, showBadCode: false, showLine: true, showRepair: false, showHourly: true, showModel: true, showDefectItem: false, showLocation: true, showRepairWorkstage: false, showReceipt: false, showSummary: true },
  quality: { layout: "3x2", chartHeight: 180, palette: "warm", showProcess: true, showBadCode: true, showLine: true, showRepair: true, showHourly: false, showModel: false, showDefectItem: true, showLocation: false, showRepairWorkstage: true, showReceipt: false, showSummary: true },
  all: { layout: "3x2", chartHeight: 160, palette: "blue", showProcess: true, showBadCode: true, showLine: true, showRepair: true, showHourly: true, showModel: true, showDefectItem: true, showLocation: true, showRepairWorkstage: true, showReceipt: true, showFpy: true, showInspVolume: true, showHourlyInsp: true, showLineProd: true, showNgMatrix: true, showRetestRate: true, showWeeklyTrend: true, showSummary: true },
};

interface Props {
  settings: DashboardSettings;
  onChange: (s: DashboardSettings) => void;
  onRefresh: () => void;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function DashboardSidebar({ settings, onChange, onRefresh, loading, collapsed, onToggleCollapse }: Props) {
  const t = useTranslations("ctq");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const set = (patch: Partial<DashboardSettings>) => onChange({ ...settings, ...patch });

  // 하이드레이션 불일치 방지: 마운트 전에는 껍데기만 렌더링
  if (!mounted) {
    return (
      <div className="w-[260px] min-w-[260px] bg-gray-900 border-r border-gray-700 p-4 overflow-y-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs text-blue-400 uppercase tracking-wider font-bold">Dashboard</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      relative bg-gray-900 border-r border-gray-700 flex flex-col gap-3 transition-all duration-300 ease-in-out
      ${collapsed ? "w-0 min-w-0 p-0 overflow-hidden border-none" : "w-[260px] min-w-[260px] p-4 overflow-y-auto"}
    `}>
      {/* 접기 버튼 */}
      <button 
        onClick={onToggleCollapse}
        className={`
          absolute top-4 right-2 z-10 p-1.5 rounded-md bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:bg-blue-600 transition-all
          ${collapsed ? "hidden" : "block"}
        `}
        title="Collapse Sidebar"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={collapsed ? "opacity-0 invisible" : "opacity-100 visible transition-opacity duration-300 delay-100"}>
        <div>
          <h2 className="text-xs text-blue-400 uppercase tracking-wider font-bold">Dashboard</h2>
          <p className="text-[10px] text-gray-500 mt-1">{t("pages.qualityDashboard.chartConfig")}</p>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <button onClick={onRefresh} disabled={loading}
            className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold disabled:opacity-50 transition-colors">
            {loading ? t("common.loading") : t("pages.qualityDashboard.refreshBtn")}
          </button>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">{t("pages.qualityDashboard.preset")}</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries({ default: "presetDefault", manager: "presetManager", line: "presetLine", quality: "presetQuality", all: "presetAll" }).map(([k, v]) => (
                <button key={k} onClick={() => set(PRESETS[k] as DashboardSettings)}
                  className="px-2 py-1 text-[10px] border border-gray-600 rounded bg-gray-900 text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors">
                  {t(`pages.qualityDashboard.${v}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">{t("pages.qualityDashboard.layout")}</label>
            <select value={settings.layout} onChange={e => set({ layout: e.target.value as DashboardSettings["layout"] })}
              className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-2 py-1 text-xs">
              <option value="2x3">{t("pages.qualityDashboard.layout2x3")}</option>
              <option value="3x2">{t("pages.qualityDashboard.layout3x2")}</option>
              <option value="2x2+1">{t("pages.qualityDashboard.layout2x2p1")}</option>
            </select>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">
              {t("pages.qualityDashboard.chartHeight")} <span className="text-blue-400 font-mono float-right">{settings.chartHeight}px</span>
            </label>
            <input type="range" min={120} max={350} value={settings.chartHeight}
              onChange={e => set({ chartHeight: Number(e.target.value) })}
              className="w-full accent-blue-500" />
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">{t("pages.qualityDashboard.palette")}</label>
            <select value={settings.palette} onChange={e => set({ palette: e.target.value as DashboardSettings["palette"] })}
              className="w-full bg-gray-900 text-gray-200 border border-gray-600 rounded px-2 py-1 text-xs">
              <option value="blue">{t("pages.qualityDashboard.paletteBlue")}</option>
              <option value="rainbow">{t("pages.qualityDashboard.paletteRainbow")}</option>
              <option value="warm">{t("pages.qualityDashboard.paletteWarm")}</option>
              <option value="cool">{t("pages.qualityDashboard.paletteCool")}</option>
            </select>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-wide mb-2">{t("pages.qualityDashboard.chartsToShow")}</label>
            {([
              ["showSummary", "summaryCard"],
              ["showProcess", "processByDefect"],
              ["showBadCode", "badCodeTop10"],
              ["showLine", "lineByDefect"],
              ["showRepair", "repairCompletion"],
              ["showModel", "modelByDefect"],
              ["showHourly", "hourlyDist"],
              ["showDefectItem", "defectItemTop10"],
              ["showLocation", "locationTop10"],
              ["showRepairWorkstage", "repairByProcess"],
              ["showReceipt", "receiptByType"],
              ["showFpy", "fpyByProcess"],
              ["showInspVolume", "inspVolume"],
              ["showHourlyInsp", "hourlyInsp"],
              ["showLineProd", "lineProd"],
              ["showNgMatrix", "ngMatrix"],
              ["showRetestRate", "retestRate"],
              ["showWeeklyTrend", "weeklyTrend"],
            ] as [keyof DashboardSettings, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 mt-1 cursor-pointer">
                <input type="checkbox" checked={!!(settings[key])}
                  onChange={e => set({ [key]: e.target.checked })}
                  className="accent-blue-500" />
                <span className="text-[11px] text-gray-300">{t(`pages.qualityDashboard.${label}`)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

