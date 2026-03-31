/**
 * @file src/components/u1/ate/AteHourlyTrend.tsx
 * @description ATE 시간대별 검사 추이 — 그라데이션 면적 + 합격률 라인 + 요약
 *
 * 초보자 가이드:
 * 1. X축: 시간대(00~23), Y축 좌: 검사수량, Y축 우: 합격률(%)
 * 2. 그라데이션 면적으로 볼륨, 점선으로 품질 추이 동시 표현
 * 3. SHIFT 경계(D/N) 수직 참조선, 현재 시간 강조
 * 4. 상단 요약: 총 검사수, 평균 합격률, 피크 시간
 */

"use client";

import React from "react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { AteHourlyPoint } from "@/types/u1/ate-analysis";

/* 근무일 기준 08시~다음날07시 순서 */
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => String((i + 8) % 24).padStart(2, "0"));

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

  /* 전체 24시간 슬롯에 데이터 매핑 (빈 시간대도 표시) */
  const dataMap = new Map(hourlyTrend.map((p) => [p.hour, p]));
  const fullData = ALL_HOURS.map((h) => {
    const p = dataMap.get(h);
    return {
      hour: h,
      total: p?.total ?? 0,
      pass: p?.pass ?? 0,
      rate: p?.rate ?? null,
      shift: p?.shift ?? (Number(h) >= 8 && Number(h) < 20 ? "D" : "N"),
      hasData: !!p,
    };
  });

  /* 요약 통계 */
  const totalInspect = hourlyTrend.reduce((s, p) => s + p.total, 0);
  const totalPass = hourlyTrend.reduce((s, p) => s + p.pass, 0);
  const avgRate = totalInspect > 0 ? Math.round((totalPass / totalInspect) * 10000) / 100 : 0;
  const peakHour = hourlyTrend.reduce((max, p) => (p.total > max.total ? p : max), hourlyTrend[0]);

  /* SHIFT 경계 */
  const shiftBoundary = hourlyTrend.find((p, i) =>
    i > 0 && hourlyTrend[i - 1].shift === "D" && p.shift === "N"
  )?.hour;

  return (
    <div className="flex flex-col h-full gap-1">
      {/* 요약 바 */}
      <div className="flex items-center gap-4 px-3 py-1.5 rounded bg-gray-800/60 text-sm">
        <span className="text-gray-500">총</span>
        <span className="text-blue-400 font-semibold">{totalInspect.toLocaleString()}건</span>
        <span className="text-gray-500">합격률</span>
        <span className="text-green-400 font-semibold text-base">{avgRate.toFixed(1)}%</span>
        <span className="text-gray-500 ml-auto">피크</span>
        <span className="text-yellow-400 font-semibold">{peakHour.hour}시 ({peakHour.total}건)</span>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fullData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 12 }}
              interval={1} axisLine={{ stroke: "#374151" }} />
            <YAxis yAxisId="left" tick={{ fill: "#9ca3af", fontSize: 13 }} axisLine={{ stroke: "#374151" }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]}
              tick={{ fill: "#9ca3af", fontSize: 13 }} tickFormatter={(v: number) => `${v}%`}
              axisLine={{ stroke: "#374151" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #4b5563", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
              labelStyle={{ color: "#e5e7eb" }}
              formatter={(value: number | string | undefined, name: string | undefined) => {
                const num = typeof value === "number" ? value : Number(value ?? 0);
                if (value === null) return ["--", name === "rate" ? "합격률" : "검사수"];
                return [name === "rate" ? `${num.toFixed(1)}%` : `${num.toLocaleString()}건`, name === "rate" ? "합격률" : "검사수"];
              }}
              labelFormatter={(label: React.ReactNode) => `${label}시`}
            />
            {shiftBoundary && (
              <ReferenceLine x={shiftBoundary} yAxisId="left" stroke="#f59e0b"
                strokeDasharray="5 5" strokeWidth={2}
                label={{ value: "야간", fill: "#f59e0b", fontSize: 13, position: "top" }} />
            )}
            <ReferenceLine yAxisId="right" y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area yAxisId="left" type="monotone" dataKey="total" fill="url(#areaGrad)"
              stroke="#3b82f6" strokeWidth={2} name="total" animationDuration={800}
              dot={{ r: 2, fill: "#3b82f6", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#60a5fa", stroke: "#3b82f6", strokeWidth: 2 }} />
            <Line yAxisId="right" type="monotone" dataKey="rate" stroke="#22c55e"
              strokeWidth={2} strokeDasharray="6 3" name="rate" connectNulls
              dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#4ade80", stroke: "#22c55e", strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
