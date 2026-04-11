/**
 * @file src/components/mxvc/PChartDashboard.tsx
 * @description p 관리도 차트 영역 — 선택된 테이블의 p-chart를 그리드 배치
 *
 * 초보자 가이드:
 * 1. FpyDashboard와 동일한 구조
 * 2. PChartCard로 개별 테이블 p 관리도 렌더링
 */
"use client";

import type { MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import type { PChartResponse } from "@/hooks/mxvc/useMxvcPChart";
import PChartCard from "./PChartCard";

interface Props {
  data: PChartResponse;
  settings: MxvcFpySettings;
}

export default function PChartDashboard({ data, settings }: Props) {
  const gridCols = settings.layout === "3x2" ? "grid-cols-3" : "grid-cols-2";

  const visibleTables = settings.visibleTables.filter(
    (key) => data.tables[key],
  );

  /* 전체 통계 */
  let totalAll = 0;
  let passAll = 0;
  for (const key of visibleTables) {
    const t = data.tables[key];
    if (t) {
      totalAll += t.stats.total;
      passAll += t.stats.pass;
    }
  }
  const overallP = totalAll > 0 ? (passAll / totalAll) * 100 : 100;
  const oocTotal = visibleTables.reduce((s, k) => s + (data.tables[k]?.stats.oocCount ?? 0), 0);

  const pColor = overallP < 90 ? "text-red-400" : overallP < 95 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 요약 바 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg p-3 text-center">
          <div className="text-lg font-extrabold font-mono text-blue-400">
            {data.workDay.start.slice(5)} ~ {data.workDay.end.slice(11)}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">조회 기간</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg p-3 text-center">
          <div className="text-lg font-extrabold font-mono text-cyan-400">{visibleTables.length}개</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">조회 테이블</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg p-3 text-center">
          <div className={`text-2xl font-extrabold font-mono ${pColor}`}>{overallP.toFixed(2)}%</div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">종합 양품률 (p̄)</div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-800/60 rounded-lg p-3 text-center">
          <div className={`text-2xl font-extrabold font-mono ${oocTotal > 0 ? "text-red-400" : "text-green-400"}`}>
            {oocTotal}
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">이탈점 (OOC)</div>
        </div>
      </div>

      {/* 차트 그리드 */}
      <div className={`grid ${gridCols} gap-3`}>
        {visibleTables.map((key, i) => {
          const isLast = settings.layout === "2x2+1"
            && i === visibleTables.length - 1
            && visibleTables.length % 2 === 1;
          return (
            <div key={key} className={isLast ? "col-span-full" : ""}>
              <PChartCard
                tableKey={key}
                data={data.tables[key]}
                height={settings.chartHeight}
              />
            </div>
          );
        })}
      </div>

      {visibleTables.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
          사이드바에서 표시할 차트를 선택하세요
        </div>
      )}
    </div>
  );
}
