/**
 * @file src/components/u1/ate/AteYesterdayCompare.tsx
 * @description ATE 전일 vs 당일 합격률 비교 그룹 바 차트
 *
 * 초보자 가이드:
 * 1. X축: LINE_CODE, Y축: 합격률(%)
 * 2. 전일=회색 바, 당일=파란색 바
 * 3. 바 위에 증감 화살표(▲▼) + 차이값 표시
 */

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import type { AteLineStat } from "@/types/u1/ate-analysis";

interface Props {
  lineStats: AteLineStat[];
}

export default function AteYesterdayCompare({ lineStats }: Props) {
  if (lineStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  const chartData = lineStats.map((line) => ({
    name: line.lineName.length > 6 ? line.lineName.slice(0, 6) + ".." : line.lineName,
    yesterday: line.yesterday.rate,
    today: line.today.rate,
    diff: line.today.rate - line.yesterday.rate,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis domain={[80, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          itemStyle={{ color: "#e5e7eb" }}
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`]}
        />
        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "90%", fill: "#ef4444", fontSize: 10 }} />
        <Bar dataKey="yesterday" name="전일" fill="#6b7280" radius={[2, 2, 0, 0]} />
        <Bar dataKey="today" name="당일" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.today < 90 ? "#ef4444" : entry.today < 95 ? "#eab308" : "#3b82f6"} />
          ))}
          <LabelList
            dataKey="diff"
            position="top"
            formatter={(v: string | number | boolean | null | undefined) => { const n = typeof v === "number" ? v : 0; return `${n >= 0 ? "▲" : "▼"}${Math.abs(n).toFixed(1)}`; }}
            style={{ fill: "#9ca3af", fontSize: 9 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
