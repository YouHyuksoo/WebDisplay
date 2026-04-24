/**
 * @file src/components/mxvc/FpySidebar.tsx
 * @description 직행율 대시보드 사이드바 — 프리셋/레이아웃/팔레트/설비필터/차트토글
 *
 * 초보자 가이드:
 * 1. quality-dashboard DashboardSidebar 패턴과 동일한 구조
 * 2. 프리셋: 기본/전체/SMT/코팅/검사
 * 3. 설비필터: API에서 받아온 EQUIPMENT_ID 체크박스
 * 4. 차트토글: 13개 테이블 표시/숨김 체크박스
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import {
  DEFAULT_FPY_SETTINGS, FPY_PRESETS,
  TABLE_KEYS, TABLE_LABELS,
} from "@/types/mxvc/fpy";

interface Props {
  settings: MxvcFpySettings;
  onChange: (s: MxvcFpySettings) => void;
  onRefresh: () => void;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const PRESET_KEYS: Record<string, string> = {
  default: "presetDefault",
  all: "presetAll",
  smt: "presetSmt",
  coating: "presetCoating",
  inspection: "presetInspection",
};

export default function FpySidebar({
  settings, onChange, onRefresh, loading,
  collapsed, onToggleCollapse,
}: Props) {
  const t = useTranslations("common");
  const tf = useTranslations("mxvcFpy");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const set = (patch: Partial<MxvcFpySettings>) =>
    onChange({ ...settings, ...patch });

  const toggleTable = (key: MxvcFpyTableKey) => {
    const curr = settings.visibleTables;
    const next = curr.includes(key)
      ? curr.filter((k) => k !== key)
      : [...curr, key];
    set({ visibleTables: next });
  };

  if (!mounted) {
    return (
      <div className="w-[260px] min-w-[260px] bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col gap-3 transition-all duration-300 ease-in-out
      ${collapsed ? "w-0 min-w-0 p-0 overflow-hidden border-none" : "w-[260px] min-w-[260px] p-4 overflow-y-auto"}
    `}>
      <button
        onClick={onToggleCollapse}
        className={`absolute top-4 right-2 z-10 p-1.5 rounded-md bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-white hover:bg-blue-600 transition-all ${collapsed ? "hidden" : "block"}`}
        title={t('collapse')}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={collapsed ? "opacity-0 invisible" : "opacity-100 visible transition-opacity duration-300 delay-100"}>
        <div>
          <h2 className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">{tf('yieldFpy')}</h2>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{tf('chartSettings')}</p>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <button onClick={onRefresh} disabled={loading}
            className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold disabled:opacity-50 transition-colors">
            {loading ? t("loading") : t("refresh")}
          </button>

          {/* 조회 기간 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {tf('dateRange')}
              {!settings.dateFrom && !settings.dateTo && (
                <span className="text-blue-600 dark:text-blue-400 font-mono float-right">{tf('today')}</span>
              )}
            </label>
            <div className="flex flex-col gap-1.5">
              <input type="date" value={settings.dateFrom ?? ""}
                onChange={(e) => set({ dateFrom: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs" />
              <div className="text-center text-[10px] text-gray-400">~</div>
              <input type="date" value={settings.dateTo ?? ""}
                onChange={(e) => set({ dateTo: e.target.value })}
                className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs" />
            </div>
            <button
              onClick={() => set({ dateFrom: "", dateTo: "" })}
              className="mt-2 w-full px-2 py-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
              {tf('todayReset')}
            </button>
          </div>

          {/* 프리셋 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{tf('preset')}</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(PRESET_KEYS).map(([k, labelKey]) => (
                <button key={k}
                  onClick={() => set({ ...DEFAULT_FPY_SETTINGS, ...FPY_PRESETS[k] })}
                  className="px-2 py-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  {tf(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* 레이아웃 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{tf('layout')}</label>
            <select value={settings.layout}
              onChange={(e) => set({ layout: e.target.value as MxvcFpySettings["layout"] })}
              className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs">
              <option value="2x3">{tf('layout2x3')}</option>
              <option value="3x2">{tf('layout3x2')}</option>
              <option value="2x2+1">{tf('layout2x2plus1')}</option>
            </select>
          </div>

          {/* 차트 높이 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {tf('chartHeight')} <span className="text-blue-600 dark:text-blue-400 font-mono float-right">{settings.chartHeight}px</span>
            </label>
            <input type="range" min={120} max={350} value={settings.chartHeight}
              onChange={(e) => set({ chartHeight: Number(e.target.value) })}
              className="w-full accent-blue-500" />
          </div>

          {/* 팔레트 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{tf('colorPalette')}</label>
            <select value={settings.palette}
              onChange={(e) => set({ palette: e.target.value as MxvcFpySettings["palette"] })}
              className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs">
              <option value="blue">Blue</option>
              <option value="rainbow">Rainbow</option>
              <option value="warm">Warm</option>
              <option value="cool">Cool</option>
            </select>
          </div>

          {/* 차트 토글 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{tf('chartsToShow')}</label>
            {TABLE_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 mt-1 cursor-pointer">
                <input type="checkbox"
                  checked={settings.visibleTables.includes(key)}
                  onChange={() => toggleTable(key)}
                  className="accent-blue-500" />
                <span className="text-[11px] text-gray-600 dark:text-gray-300">{TABLE_LABELS[key]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
