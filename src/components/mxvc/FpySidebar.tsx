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

const PRESET_LABELS: Record<string, string> = {
  default: "기본",
  all: "전체",
  smt: "SMT",
  coating: "코팅",
  inspection: "검사",
};

export default function FpySidebar({
  settings, onChange, onRefresh, loading,
  collapsed, onToggleCollapse,
}: Props) {
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
        title="접기"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={collapsed ? "opacity-0 invisible" : "opacity-100 visible transition-opacity duration-300 delay-100"}>
        <div>
          <h2 className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold">직행율 FPY</h2>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">차트 설정</p>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <button onClick={onRefresh} disabled={loading}
            className="w-full px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold disabled:opacity-50 transition-colors">
            {loading ? "조회 중..." : "새로고침"}
          </button>

          {/* 일자 조정 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              조회 일자
              <span className="text-blue-600 dark:text-blue-400 font-mono float-right">
                {(settings.dayOffset ?? 0) === 0 ? "오늘" : `${Math.abs(settings.dayOffset ?? 0)}일 전`}
              </span>
            </label>
            <input type="range" min={-7} max={0} value={settings.dayOffset ?? 0}
              onChange={(e) => set({ dayOffset: Number(e.target.value) })}
              onWheel={(e) => {
                e.preventDefault();
                const cur = settings.dayOffset ?? 0;
                const next = e.deltaY < 0
                  ? Math.min(cur + 1, 0)
                  : Math.max(cur - 1, -7);
                set({ dayOffset: next });
              }}
              className="w-full accent-blue-500" />
            <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500 mt-1">
              <span>7일 전</span>
              <span>오늘</span>
            </div>
          </div>

          {/* 프리셋 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">프리셋</label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(PRESET_LABELS).map(([k, v]) => (
                <button key={k}
                  onClick={() => set({ ...DEFAULT_FPY_SETTINGS, ...FPY_PRESETS[k] })}
                  className="px-2 py-1 text-[10px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* 레이아웃 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">레이아웃</label>
            <select value={settings.layout}
              onChange={(e) => set({ layout: e.target.value as MxvcFpySettings["layout"] })}
              className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs">
              <option value="2x3">2열</option>
              <option value="3x2">3열</option>
              <option value="2x2+1">2열+1</option>
            </select>
          </div>

          {/* 차트 높이 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              차트 높이 <span className="text-blue-600 dark:text-blue-400 font-mono float-right">{settings.chartHeight}px</span>
            </label>
            <input type="range" min={120} max={350} value={settings.chartHeight}
              onChange={(e) => set({ chartHeight: Number(e.target.value) })}
              className="w-full accent-blue-500" />
          </div>

          {/* 팔레트 */}
          <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3">
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">색상 팔레트</label>
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
            <label className="block text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">표시할 차트</label>
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
