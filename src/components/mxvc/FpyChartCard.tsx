/**
 * @file src/components/mxvc/FpyChartCard.tsx
 * @description 개별 테이블 직행율 차트 카드 — Bar/Area/Line 타입 지원
 *
 * 초보자 가이드:
 * 1. X축: 시간(08~), Y축: 직행율(0~100%)
 * 2. 90% 기준선: 빨간 점선 (ReferenceLine)
 * 3. chartType에 따라 Bar/AreaChart/LineChart 렌더링
 * 4. 요약 라인: 전체 직행율% + PASS/Total
 */
"use client";

import { useTranslations } from "next-intl";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { TableFpyData, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { TABLE_LABELS } from "@/types/mxvc/fpy";

interface Props {
  tableKey: MxvcFpyTableKey;
  data: TableFpyData;
  height: number;
  palette: string[];
  chartType: "bar" | "area" | "line";
}

function getYieldColor(y: number): string {
  if (y < 90) return "#f87171";
  if (y < 95) return "#facc15";
  return "#4ade80";
}

function getSummaryColor(y: number): string {
  if (y < 90) return "text-red-400";
  if (y < 95) return "text-yellow-400";
  return "text-green-400";
}

const TOOLTIP_STYLE = {
  background: "#1e293b",
  border: "1px solid #334155",
  fontSize: 12,
};

const GRID_STROKE = "#1f2937";

export default function FpyChartCard({ tableKey, data, height, chartType }: Props) {
  const t = useTranslations("common");
  const label = TABLE_LABELS[tableKey];
  const { summary, hourly } = data;

  const xAxisProps = {
    dataKey: "hour" as const,
    tick: { fill: "#94a3b8", fontSize: 10 },
    tickFormatter: (v: string) => `${v}시`,
  };
  const yAxisProps = {
    domain: [0, 100] as [number, number],
    tick: { fill: "#64748b", fontSize: 10 },
    tickFormatter: (v: number) => `${v}%`,
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">{label}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-bold font-mono ${getSummaryColor(summary.yield)}`}>
            {summary.yield.toFixed(1)}%
          </span>
          <span className="text-gray-400 dark:text-gray-500">
            ({summary.pass}/{summary.total})
          </span>
        </div>
      </div>

      {hourly.length === 0 ? (
        <div
          className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs"
          style={{ height }}
        >
          {t("noData")}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chartType === "area" ? (
            <AreaChart data={hourly}>
              <defs>
                <linearGradient id={`grad-${tableKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Area
                type="monotone"
                dataKey="yield"
                name="직행율"
                stroke="#4ade80"
                strokeWidth={2}
                fill={`url(#grad-${tableKey})`}
                dot={({ cx, cy, payload }: Record<string, unknown>) => {
                  if (cx == null || cy == null) return <></>;
                  const y = (payload as { yield: number }).yield;
                  return <circle key={String(cx)} cx={Number(cx)} cy={Number(cy)} r={4} fill={getYieldColor(y)} stroke="#fff" strokeWidth={1.5} />;
                }}
              />
            </AreaChart>
          ) : chartType === "line" ? (
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line
                type="monotone"
                dataKey="yield"
                name="직행율"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={({ cx, cy, payload }: Record<string, unknown>) => {
                  if (cx == null || cy == null) return <></>;
                  const y = (payload as { yield: number }).yield;
                  return <circle key={String(cx)} cx={Number(cx)} cy={Number(cy)} r={4} fill={getYieldColor(y)} stroke="#fff" strokeWidth={1.5} />;
                }}
                activeDot={{ r: 6, fill: "#a78bfa" }}
              />
            </LineChart>
          ) : (
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} />
              <Bar dataKey="yield" name="직행율">
                {hourly.map((entry, i) => (
                  <Cell key={i} fill={getYieldColor(entry.yield)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
