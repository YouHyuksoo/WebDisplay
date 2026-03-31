/**
 * @file src/components/u1/ate/AteMonthlyHeatmap.tsx
 * @description ATE 월간 ZONE별 합격률 히트맵 — 커스텀 CSS 그리드
 *
 * 초보자 가이드:
 * 1. X축: 날짜(30일), Y축: ZONE_CODE
 * 2. 셀 색상: 합격률 높을수록 초록, 낮을수록 빨강
 * 3. recharts에 네이티브 히트맵이 없어 CSS Grid + div 셀로 구현
 * 4. hover 시 툴팁으로 날짜/ZONE/합격률 표시
 */

"use client";

import { useState } from "react";
import type { AteHeatmapCell } from "@/types/u1/ate-analysis";

function getCellColor(rate: number): string {
  if (rate >= 98) return "bg-green-600";
  if (rate >= 95) return "bg-green-500/70";
  if (rate >= 90) return "bg-yellow-500/70";
  if (rate >= 85) return "bg-orange-500/70";
  return "bg-red-500/70";
}

interface Props {
  heatmapData: AteHeatmapCell[];
  zones: string[];
}

export default function AteMonthlyHeatmap({ heatmapData, zones }: Props) {
  const [tooltip, setTooltip] = useState<{ cell: AteHeatmapCell; x: number; y: number } | null>(null);

  if (heatmapData.length === 0 || zones.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  const dates = [...new Set(heatmapData.map((d) => d.date))].sort();
  const cellMap = new Map<string, AteHeatmapCell>();
  for (const cell of heatmapData) {
    cellMap.set(`${cell.date}|${cell.zoneCode}`, cell);
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-1 px-1">
        <span>낮음</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/70" />
          <div className="w-3 h-3 rounded-sm bg-orange-500/70" />
          <div className="w-3 h-3 rounded-sm bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-sm bg-green-500/70" />
          <div className="w-3 h-3 rounded-sm bg-green-600" />
        </div>
        <span>높음</span>
      </div>
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-fit">
          <div className="flex">
            <div className="w-16 shrink-0" />
            {dates.map((d) => (
              <div key={d} className="w-5 shrink-0 text-center">
                <span className="text-[9px] text-gray-500 dark:text-gray-600 -rotate-45 inline-block">{d.slice(8)}</span>
              </div>
            ))}
          </div>
          {zones.map((zone) => (
            <div key={zone} className="flex items-center">
              <div className="w-16 shrink-0 text-xs text-gray-400 dark:text-gray-500 truncate pr-1">{zone}</div>
              {dates.map((date) => {
                const cell = cellMap.get(`${date}|${zone}`);
                const colorClass = cell ? getCellColor(cell.rate) : "bg-gray-800";
                return (
                  <div
                    key={date}
                    className={`w-5 h-4 shrink-0 m-px rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${colorClass}`}
                    onMouseEnter={(e) => {
                      if (cell) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ cell, x: rect.left, y: rect.top - 40 });
                      }
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {tooltip && (
        <div
          className="fixed z-50 px-2 py-1 rounded bg-gray-800 dark:bg-gray-700 border border-gray-600 text-xs text-white shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.cell.date} | {tooltip.cell.zoneCode} | {tooltip.cell.rate.toFixed(1)}% ({tooltip.cell.pass}/{tooltip.cell.total})
        </div>
      )}
    </div>
  );
}
