/**
 * @file src/components/mxvc/FpyChartSidebar.tsx
 * @description 직행율 대시보드 사이드바 — 차트 토글(표시할 테이블)만 표시
 *
 * 초보자 가이드:
 * 1. 상단 설정 바로 이동된 항목: 기간/프리셋/레이아웃/팔레트/차트높이
 * 2. 사이드바에는 차트 표시/숨김 체크박스만 남김
 * 3. quality-dashboard의 DashboardSidebar 패턴과 동일
 */
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { TABLE_KEYS, TABLE_LABELS } from "@/types/mxvc/fpy";

interface Props {
  settings: MxvcFpySettings;
  onChange: (s: MxvcFpySettings) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function FpyChartSidebar({
  settings, onChange, collapsed, onToggleCollapse,
}: Props) {
  const tc = useTranslations('common');
  const tf = useTranslations('mxvcFpy');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const toggleTable = (key: MxvcFpyTableKey) => {
    const curr = settings.visibleTables;
    const next = curr.includes(key)
      ? curr.filter((k) => k !== key)
      : [...curr, key];
    onChange({ ...settings, visibleTables: next });
  };

  const allChecked = settings.visibleTables.length === TABLE_KEYS.length;

  if (!mounted) {
    return (
      <div className="w-[180px] min-w-[180px] bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-3">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`
      relative bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out
      ${collapsed ? "w-0 min-w-0 p-0 overflow-hidden border-none" : "w-[180px] min-w-[180px] p-3 overflow-y-auto"}
    `}>
      {/* 접기 버튼 */}
      <button
        onClick={onToggleCollapse}
        className={`absolute top-3 right-2 z-10 p-1 rounded-md bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-white hover:bg-blue-600 transition-all ${collapsed ? "hidden" : "block"}`}
        title={tc('collapse')}
      >
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className={collapsed ? "opacity-0 invisible" : "opacity-100 visible transition-opacity duration-300 delay-100"}>
        <div className="mb-3">
          <h3 className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">{tf('chartsToShow')}</h3>
        </div>

        {/* 전체 선택/해제 */}
        <label className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 cursor-pointer">
          <input type="checkbox"
            checked={allChecked}
            onChange={() => {
              onChange({ ...settings, visibleTables: allChecked ? [] : [...TABLE_KEYS] });
            }}
            className="accent-blue-500" />
          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{tc('all')}</span>
        </label>

        {/* 개별 테이블 토글 */}
        {TABLE_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-2 py-0.5 cursor-pointer">
            <input type="checkbox"
              checked={settings.visibleTables.includes(key)}
              onChange={() => toggleTable(key)}
              className="accent-blue-500" />
            <span className="text-[11px] text-gray-600 dark:text-gray-300">{TABLE_LABELS[key]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
