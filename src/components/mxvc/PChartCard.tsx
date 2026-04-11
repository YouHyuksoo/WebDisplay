/**
 * @file src/components/mxvc/PChartCard.tsx
 * @description 개별 테이블 p 관리도 차트 카드 — 일별 + 시간별 드릴다운
 *
 * 초보자 가이드:
 * 1. 기본: X축 일별(MM/DD), Y축 불량률(%)
 * 2. 날짜 포인트 클릭 → 해당 일자의 시간별 차트로 드릴다운
 * 3. "← 일별" 버튼으로 복귀
 * 4. UCL/LCL: 3시그마 관리한계 (서브그룹별 변동)
 */
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { TABLE_LABELS } from "@/types/mxvc/fpy";
import type { DailyP, TablePData } from "@/hooks/mxvc/useMxvcPChart";

interface Props {
  tableKey: MxvcFpyTableKey;
  data: TablePData;
  height: number;
}

interface DrillState {
  date: string;
  dateLabel: string;
  hourly: DailyP[];
  stats: { total: number; pass: number; pBar: number; oocCount: number };
}

function getPColor(p: number, ucl: number, lcl: number): string {
  if (p > ucl || p < lcl) return "#ef4444";
  if (p > ucl * 0.8) return "#facc15";
  return "#4ade80";
}

export default function PChartCard({ tableKey, data, height }: Props) {
  const t = useTranslations("common");
  const label = TABLE_LABELS[tableKey];
  const { stats, daily } = data;

  const [drill, setDrill] = useState<DrillState | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const handleDrillDown = useCallback(async (date: string, dateLabel: string) => {
    setDrillLoading(true);
    try {
      const res = await fetch(`/api/mxvc/p-chart?drillTable=${tableKey}&drillDate=${date}`);
      if (!res.ok) return;
      const json = await res.json();
      setDrill({ date, dateLabel, hourly: json.hourly, stats: json.stats });
    } finally {
      setDrillLoading(false);
    }
  }, [tableKey]);

  const handleBack = () => setDrill(null);

  /* 현재 표시할 데이터 */
  const chartData = drill ? drill.hourly : daily;
  const chartStats = drill ? drill.stats : stats;
  const isDrill = !!drill;

  const pBarColor = chartStats.pBar < 90 ? "text-red-400" : chartStats.pBar < 95 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isDrill && (
            <button onClick={handleBack}
              className="px-2 py-0.5 text-[10px] rounded border border-gray-300 dark:border-gray-600 text-blue-500 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors">
              ← 일별
            </button>
          )}
          <h3 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">
            {label}
            {isDrill && <span className="text-blue-400 ml-1.5">({drill.dateLabel} 시간별)</span>}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`font-bold font-mono ${pBarColor}`}>
            p̄={chartStats.pBar.toFixed(2)}%
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            ({chartStats.pass}/{chartStats.total})
          </span>
          {chartStats.oocCount > 0 && (
            <span className="text-red-400 font-bold">OOC: {chartStats.oocCount}</span>
          )}
          {!isDrill && daily.length > 0 && (
            <span className="text-[10px] text-gray-500">클릭하여 드릴다운</span>
          )}
        </div>
      </div>

      {/* 차트 */}
      {drillLoading ? (
        <div className="flex items-center justify-center text-gray-400 text-xs" style={{ height }}>
          로딩중...
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs" style={{ height }}>
          {t("noData")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 10, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="dateLabel"
              tick={isDrill ? { fill: "#94a3b8", fontSize: 10 } : (props: Record<string, unknown>) => {
                const { x, y, payload } = props as { x: number; y: number; payload: { value: string; index: number } };
                const item = chartData[payload.index];
                return (
                  <text
                    x={x} y={y + 12}
                    textAnchor="middle"
                    fill="#60a5fa"
                    fontSize={10}
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => { if (item) handleDrillDown(item.date, item.dateLabel); }}
                  >
                    {payload.value}
                  </text>
                );
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: "#1e293b", border: "1px solid #334155", fontSize: 12 }}
              formatter={(value, name) => {
                const labels: Record<string, string> = { p: "양품률", ucl: "UCL", lcl: "LCL" };
                return [`${Number(value).toFixed(2)}%`, labels[String(name)] ?? name];
              }}
            />
            {/* UCL / LCL */}
            <Line type="monotone" dataKey="ucl" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="ucl" />
            <Line type="monotone" dataKey="lcl" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="lcl" />
            {/* CL */}
            <Line type="monotone" dataKey={() => chartStats.pBar} stroke="#22c55e" strokeWidth={1} strokeDasharray="3 3" dot={false} name="CL" />
            {/* 불량률 */}
            <Line
              type="monotone"
              dataKey="p"
              stroke={isDrill ? "#f59e0b" : "#8b5cf6"}
              strokeWidth={2.5}
              name="p"
              dot={({ cx, cy, payload }: Record<string, unknown>) => {
                if (cx == null || cy == null) return <></>;
                const pt = payload as DailyP;
                const color = getPColor(pt.p, pt.ucl, pt.lcl);
                const isOoc = pt.p > pt.ucl || pt.p < pt.lcl;
                return (
                  <circle
                    key={String(cx)}
                    cx={Number(cx)}
                    cy={Number(cy)}
                    r={isOoc ? 6 : 4}
                    fill={color}
                    stroke={isOoc ? "#fff" : "none"}
                    strokeWidth={isOoc ? 2 : 0}
                  />
                );
              }}
              activeDot={{ r: 6, fill: isDrill ? "#fbbf24" : "#a78bfa" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
