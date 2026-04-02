/**
 * @file src/components/u1/fw/FwYesterdayCompare.tsx
 * @description FW 전일 vs 당일 합격률 비교 — 그룹 바 + 증감 표시 + 요약 통계
 *
 * 초보자 가이드:
 * 1. X축: LINE_CODE, Y축: 합격률(%)
 * 2. 전일=반투명 바, 당일=색상 바 (상태별 빨/노/파)
 * 3. 바 위에 증감 화살표 + 차이값 표시
 * 4. 상단에 전체 평균 합격률 요약
 */

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from "recharts";
import { useTranslations } from "next-intl";
import type { FwLineStat } from "@/types/u1/fw-analysis";

interface Props {
  lineStats: FwLineStat[];
}

export default function FwYesterdayCompare({ lineStats }: Props) {
  const t = useTranslations("common");
  if (lineStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        {t("noData")}
      </div>
    );
  }

  const avgYesterday = lineStats.reduce((s, l) => s + l.yesterday.rate, 0) / lineStats.length;
  const avgToday = lineStats.reduce((s, l) => s + l.today.rate, 0) / lineStats.length;
  const avgDiff = avgToday - avgYesterday;

  const chartData = lineStats.map((line) => ({
    name: line.lineName.length > 8 ? line.lineName.slice(0, 8) + ".." : line.lineName,
    yesterday: line.yesterday.rate,
    today: line.today.rate,
    diff: line.today.rate - line.yesterday.rate,
  }));

  const minRate = Math.min(
    ...lineStats.map((l) => Math.min(l.yesterday.rate, l.today.rate))
  );
  const yMin = Math.max(0, Math.floor((minRate - 5) / 10) * 10);

  return (
    <div className="flex flex-col h-full gap-1">
      {/* 요약 바 */}
      <div className="flex items-center gap-4 px-3 py-1.5 rounded bg-gray-800/60 text-sm">
        <span className="text-gray-500">평균</span>
        <span className="text-gray-400">전일 {avgYesterday.toFixed(1)}%</span>
        <span className="text-blue-400 font-semibold">당일 {avgToday.toFixed(1)}%</span>
        <span className={`ml-auto text-base font-bold ${avgDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
          {avgDiff >= 0 ? "▲" : "▼"}{Math.abs(avgDiff).toFixed(1)}%p
        </span>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }} barCategoryGap="25%">
            <defs>
              <linearGradient id="fwBarBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 13 }} axisLine={{ stroke: "#374151" }} />
            <YAxis domain={[yMin, 100]} tick={{ fill: "#9ca3af", fontSize: 13 }} tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: "#374151" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #4b5563", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
              labelStyle={{ color: "#e5e7eb", fontWeight: "bold" }}
              itemStyle={{ color: "#e5e7eb" }}
              formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`]}
            />
            <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5"
              label={{ value: "90%", fill: "#ef4444", fontSize: 13, position: "right" }} />
            <Bar dataKey="yesterday" name="전일" fill="#4b5563" fillOpacity={0.6} radius={[3, 3, 0, 0]}>
              <LabelList dataKey="yesterday" position="top"
                formatter={(v: string | number | boolean | null | undefined) => `${(typeof v === "number" ? v : 0).toFixed(0)}%`}
                style={{ fill: "#6b7280", fontSize: 12 }} />
            </Bar>
            <Bar dataKey="today" name="당일" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry.today < 90 ? "#ef4444" : entry.today < 95 ? "#eab308" : "url(#fwBarBlue)"} />
              ))}
              <LabelList dataKey="diff" position="top"
                formatter={(v: string | number | boolean | null | undefined) => {
                  const n = typeof v === "number" ? v : 0;
                  return `${n >= 0 ? "▲" : "▼"}${Math.abs(n).toFixed(1)}`;
                }}
                style={{ fill: "#d1d5db", fontSize: 13, fontWeight: "bold" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
