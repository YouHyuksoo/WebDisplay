/**
 * @file src/components/u1/ate/AteHourlyTrend.tsx
 * @description ATE 시간대별 검사 추이 — 면적 차트(검사수량) + 점선 라인(합격률)
 *
 * 초보자 가이드:
 * 1. X축: 시간대(HH), Y축 좌: 검사수량, Y축 우: 합격률(%)
 * 2. 면적으로 검사 볼륨, 점선으로 품질 추이 동시 표현
 * 3. SHIFT 경계(D/N)를 수직 참조선으로 표시
 */

"use client";

import React from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { AteHourlyPoint } from "@/types/u1/ate-analysis";

interface Props {
  hourlyTrend: AteHourlyPoint[];
}

export default function AteHourlyTrend({ hourlyTrend }: Props) {
  if (hourlyTrend.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  const shiftBoundary = hourlyTrend.find((p, i) =>
    i > 0 && hourlyTrend[i - 1].shift === "D" && p.shift === "N"
  )?.hour;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={hourlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis yAxisId="right" orientation="right" domain={[80, 100]} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value: number | string | undefined, name: string | undefined) => {
            const num = typeof value === "number" ? value : Number(value ?? 0);
            return [name === "rate" ? `${num.toFixed(1)}%` : `${num}건`, name === "rate" ? "합격률" : "검사수"];
          }}
          labelFormatter={(label: React.ReactNode) => `${label}시`}
        />
        {shiftBoundary && (
          <ReferenceLine x={shiftBoundary} yAxisId="left" stroke="#f59e0b" strokeDasharray="5 5"
            label={{ value: "N교대", fill: "#f59e0b", fontSize: 10, position: "top" }} />
        )}
        <Area yAxisId="left" type="monotone" dataKey="total" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" name="total" />
        <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} name="rate" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
