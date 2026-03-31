/**
 * @file src/components/u1/ate/AteDailyPassRate.tsx
 * @description ATE 당일 라인별 합격률 도넛 차트
 *
 * 초보자 가이드:
 * 1. 라인별 미니 도넛 차트로 PASS/NG 비율 표시
 * 2. 도넛 중앙에 합격률(%) 수치 표시
 * 3. 색상: 95%↑ 초록, 90~95% 노랑, 90%↓ 빨강
 */

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AteLineStat } from "@/types/u1/ate-analysis";

function getRateColor(rate: number): string {
  if (rate < 90) return "#ef4444";
  if (rate < 95) return "#eab308";
  return "#22c55e";
}

interface Props {
  lineStats: AteLineStat[];
}

export default function AteDailyPassRate({ lineStats }: Props) {
  if (lineStats.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 h-full items-center">
      {lineStats.map((line) => {
        const data = [
          { name: "PASS", value: line.today.pass },
          { name: "NG", value: line.today.ng },
        ];
        const color = getRateColor(line.today.rate);

        return (
          <div key={line.lineCode} className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={24}
                    outerRadius={36}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                    stroke="none"
                  >
                    <Cell fill={color} />
                    <Cell fill="#374151" />
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined, name: string | undefined) => [`${value ?? 0}건`, name ?? ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color }}>
                  {line.today.rate.toFixed(1)}%
                </span>
              </div>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[80px]">
              {line.lineName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
