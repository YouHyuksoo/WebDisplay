/**
 * @file src/components/u1/ict/IctDefectType.tsx
 * @description ICT 불량종류(C5)별 NG 분포 — 도넛 + 범례 리스트
 *
 * 초보자 가이드:
 * 1. C5 컬럼의 불량종류별 NG 건수를 도넛 차트로 표시
 * 2. 우측에 불량종류 TOP 리스트 + 건수/비율 표시
 * 3. ICT 테이블 전용 (ATE에는 없는 차트)
 */

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import type { IctDefectTypeItem } from "@/types/u1/ict-analysis";

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#14b8a6",
  "#a855f7", "#64748b", "#d946ef", "#0ea5e9", "#84cc16",
];

interface Props {
  defectTypes: IctDefectTypeItem[];
}

export default function IctDefectType({ defectTypes }: Props) {
  const t = useTranslations("common");
  if (defectTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        {t("noData")}
      </div>
    );
  }

  const totalNg = defectTypes.reduce((s, d) => s + d.ngCount, 0);
  const chartData = defectTypes.map((d, i) => ({
    name: d.defectType,
    value: d.ngCount,
    color: COLORS[i % COLORS.length],
    pct: totalNg > 0 ? ((d.ngCount / totalNg) * 100).toFixed(1) : "0",
  }));

  return (
    <div className="flex h-full gap-2">
      {/* 도넛 */}
      <div className="relative w-2/5 min-w-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="45%"
              outerRadius="80%"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              animationDuration={800}
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #4b5563", borderRadius: 8 }}
              formatter={(value: number | string | undefined, name: string | undefined) =>
                [`${(value ?? 0).toLocaleString()}건`, name ?? ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-red-400">{totalNg.toLocaleString()}</span>
          <span className="text-xs text-gray-500">총 NG</span>
        </div>
      </div>

      {/* 범례 리스트 */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto py-1 pr-1">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-gray-300 truncate flex-1" title={d.name}>{d.name}</span>
            <span className="text-gray-400 shrink-0 font-medium">{d.value}</span>
            <span className="text-gray-500 shrink-0 text-xs w-12 text-right">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
