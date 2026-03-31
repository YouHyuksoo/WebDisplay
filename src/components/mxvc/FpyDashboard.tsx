/**
 * @file src/components/mxvc/FpyDashboard.tsx
 * @description 직행율 차트 영역 — 설정에 따라 선택된 테이블 차트를 그리드로 배치
 *
 * 초보자 가이드:
 * 1. settings.visibleTables에 포함된 테이블만 표시
 * 2. settings.layout에 따라 grid-cols-2 또는 grid-cols-3
 * 3. 각 차트는 FpyChartCard 컴포넌트
 */
"use client";

import type { MxvcFpyResponse, MxvcFpySettings, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { PALETTES } from "@/types/ctq/quality-dashboard";
import FpyChartCard from "./FpyChartCard";

interface Props {
  data: MxvcFpyResponse;
  settings: MxvcFpySettings;
}

export default function FpyDashboard({ data, settings }: Props) {
  const colors = PALETTES[settings.palette] || PALETTES.blue;
  const gridCols = settings.layout === "3x2" ? "grid-cols-3" : "grid-cols-2";

  const visibleTables = settings.visibleTables.filter(
    (key) => data.tables[key],
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* 요약 바 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="작업일"
          value={`${data.workDay.start.slice(5)} ~ ${data.workDay.end.slice(11)}`}
          color="text-blue-400"
        />
        <SummaryCard
          label="조회 테이블"
          value={`${visibleTables.length}개`}
          color="text-cyan-400"
        />
        <SummaryCard
          label="설비"
          value={data.equipments.length > 0 ? `${data.equipments.length}대` : "-"}
          color="text-purple-400"
        />
        <OverallYieldCard tables={data.tables} visibleKeys={visibleTables} />
      </div>

      {/* 차트 그리드 */}
      <div className={`grid ${gridCols} gap-3`}>
        {visibleTables.map((key, i) => {
          const isLast = settings.layout === "2x2+1"
            && i === visibleTables.length - 1
            && visibleTables.length % 2 === 1;
          return (
            <div key={key} className={isLast ? "col-span-full" : ""}>
              <FpyChartCard
                tableKey={key}
                data={data.tables[key]}
                height={settings.chartHeight}
                palette={colors}
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

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
      <div className={`text-lg font-extrabold font-mono ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function OverallYieldCard({
  tables,
  visibleKeys,
}: {
  tables: MxvcFpyResponse["tables"];
  visibleKeys: MxvcFpyTableKey[];
}) {
  let totalAll = 0;
  let passAll = 0;
  for (const key of visibleKeys) {
    const t = tables[key];
    if (t) {
      totalAll += t.summary.total;
      passAll += t.summary.pass;
    }
  }
  const overall = totalAll > 0
    ? Math.round((passAll / totalAll) * 10000) / 100
    : 0;
  const color = overall < 90
    ? "text-red-400"
    : overall < 95
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="bg-gray-800/60 rounded-lg p-3 text-center">
      <div className={`text-2xl font-extrabold font-mono ${color}`}>{overall.toFixed(1)}%</div>
      <div className="text-[10px] text-gray-500 mt-1">종합 직행율</div>
    </div>
  );
}
