/**
 * @file src/components/u1/ate/AteWeeklyTrend.tsx
 * @description ATE 주간 일별 합격률 추이 — LINE별 색상 구분 멀티라인 차트
 *
 * 초보자 가이드:
 * 1. 최근 7일간 일별 합격률을 라인별로 표시
 * 2. LINE마다 다른 색상, 90% 기준선(빨간 점선) 표시
 * 3. AteWeeklyPoint[]를 날짜 x 라인 pivot으로 변환
 */

"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import type { AteWeeklyPoint } from "@/types/u1/ate-analysis";

const LINE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

interface Props {
  dailyTrend: AteWeeklyPoint[];
}

export default function AteWeeklyTrend({ dailyTrend }: Props) {
  if (dailyTrend.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  const lines = [...new Set(dailyTrend.map((d) => d.lineCode))].sort();
  const dateMap = new Map<string, Record<string, number>>();
  for (const p of dailyTrend) {
    if (!dateMap.has(p.date)) dateMap.set(p.date, {});
    dateMap.get(p.date)![p.lineCode] = p.rate;
  }
  const chartData = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rates]) => ({ date: date.slice(5), ...rates }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis domain={[80, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} />
        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "90%", fill: "#ef4444", fontSize: 10 }} />
        {lines.map((lineCode, i) => (
          <Line key={lineCode} type="monotone" dataKey={lineCode} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
