/**
 * @file src/components/u1/ate/AteWeeklyTrend.tsx
 * @description ATE 주간 일별 합격률 — 면적 라인 + 포인트 강조 + 값 레이블
 *
 * 초보자 가이드:
 * 1. 최근 7일간 일별 합격률을 라인별로 표시
 * 2. LINE마다 다른 색상 + 반투명 면적 채움
 * 3. 90% 기준선, 포인트에 값 표시
 * 4. 상단 요약: 라인별 현재 합격률 뱃지
 */

"use client";

import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { useTranslations } from "next-intl";
import type { AteWeeklyPoint } from "@/types/u1/ate-analysis";

const LINE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#ec4899"];

interface Props {
  dailyTrend: AteWeeklyPoint[];
}

export default function AteWeeklyTrend({ dailyTrend }: Props) {
  const t = useTranslations("common");
  if (dailyTrend.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        {t("noData")}
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

  /* 각 라인의 최신 합격률 */
  const latestDate = chartData[chartData.length - 1];
  const lineLatest = lines.map((l, i) => ({
    code: l, rate: latestDate ? (latestDate as unknown as Record<string, number>)[l] : undefined, color: LINE_COLORS[i % LINE_COLORS.length],
  }));

  /* Y축 범위: 데이터 최솟값에서 여유 */
  const allRates = dailyTrend.map((d) => d.rate);
  const minRate = Math.min(...allRates);
  const yMin = Math.max(0, Math.floor((minRate - 10) / 10) * 10);

  return (
    <div className="flex flex-col h-full gap-1">
      {/* 라인별 뱃지 */}
      <div className="flex items-center gap-3 px-3 py-1.5 rounded bg-gray-800/60 flex-wrap">
        {lineLatest.map((l) => (
          <div key={l.code} className="flex items-center gap-1.5 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-gray-400">{l.code}</span>
            {l.rate !== undefined && (
              <span className="font-medium" style={{ color: l.rate < 90 ? "#ef4444" : l.rate < 95 ? "#eab308" : "#22c55e" }}>
                {l.rate.toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <defs>
              {lines.map((_, i) => (
                <linearGradient key={i} id={`weekGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LINE_COLORS[i % LINE_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={LINE_COLORS[i % LINE_COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 13 }} axisLine={{ stroke: "#374151" }} />
            <YAxis domain={[yMin, 100]} tick={{ fill: "#9ca3af", fontSize: 13 }}
              tickFormatter={(v: number) => `${v}%`} axisLine={{ stroke: "#374151" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #4b5563", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
              labelStyle={{ color: "#e5e7eb", fontWeight: "bold" }}
              formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`]}
            />
            <Legend wrapperStyle={{ fontSize: 13, color: "#9ca3af" }} />
            <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.6}
              label={{ value: "90%", fill: "#ef4444", fontSize: 13, position: "right" }} />
            {lines.map((lineCode, i) => (
              <Area key={lineCode} type="monotone" dataKey={lineCode}
                stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2.5}
                fill={`url(#weekGrad${i})`} connectNulls animationDuration={800}
                dot={{ r: 4, fill: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 0 }}
                activeDot={{ r: 7, stroke: LINE_COLORS[i % LINE_COLORS.length], strokeWidth: 2, fill: "#1f2937" }} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
