/**
 * @file src/components/mxvc/FpyChartCard.tsx
 * @description 개별 테이블 직행율 차트 카드 — 시간대별 바 차트 + 요약
 *
 * 초보자 가이드:
 * 1. X축: 시간(08~), Y축: 직행율(0~100%)
 * 2. 90% 기준선: 빨간 점선 (ReferenceLine)
 * 3. 바 색상: 95%+→초록, 90~95%→노란, <90%→빨간
 * 4. 요약 라인: 전체 직행율% + PASS/Total
 */
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import type { TableFpyData, MxvcFpyTableKey } from "@/types/mxvc/fpy";
import { TABLE_LABELS } from "@/types/mxvc/fpy";

interface Props {
  tableKey: MxvcFpyTableKey;
  data: TableFpyData;
  height: number;
  palette: string[];
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

export default function FpyChartCard({ tableKey, data, height }: Props) {
  const label = TABLE_LABELS[tableKey];
  const { summary, hourly } = data;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-gray-400 font-bold uppercase">{label}</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-bold font-mono ${getSummaryColor(summary.yield)}`}>
            {summary.yield.toFixed(1)}%
          </span>
          <span className="text-gray-500">
            ({summary.pass}/{summary.total})
          </span>
        </div>
      </div>

      {hourly.length === 0 ? (
        <div
          className="flex items-center justify-center text-gray-600 text-xs"
          style={{ height }}
        >
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickFormatter={(v: string) => `${v}시`}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                fontSize: 12,
              }}
            />
            <ReferenceLine
              y={90}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
            />
            <Bar dataKey="yield" name="직행율">
              {hourly.map((entry, i) => (
                <Cell key={i} fill={getYieldColor(entry.yield)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
