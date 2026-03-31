/**
 * @file src/components/u1/ate/AteDailyPassRate.tsx
 * @description ATE 당일 라인별 합격률 — 큰 도넛 + 요약 통계 패널
 *
 * 초보자 가이드:
 * 1. 라인이 1~2개면 큰 도넛, 3개 이상이면 미니 도넛 그리드
 * 2. 도넛 중앙에 합격률(%) 수치 + 하단에 PASS/NG/Total 통계
 * 3. 색상: 95%↑ 초록, 90~95% 노랑, 90%↓ 빨강
 * 4. 전체 요약 통계를 상단에 표시
 */

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AteLineStat } from "@/types/u1/ate-analysis";

function getRateColor(rate: number): string {
  if (rate < 90) return "#ef4444";
  if (rate < 95) return "#eab308";
  return "#22c55e";
}

function getRateBg(rate: number): string {
  if (rate < 90) return "bg-red-500/10 border-red-500/30";
  if (rate < 95) return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-green-500/10 border-green-500/30";
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

  const totalPass = lineStats.reduce((s, l) => s + l.today.pass, 0);
  const totalAll = lineStats.reduce((s, l) => s + l.today.total, 0);
  const totalNg = totalAll - totalPass;
  const overallRate = totalAll > 0 ? Math.round((totalPass / totalAll) * 10000) / 100 : 0;
  const isFew = lineStats.length <= 2;

  return (
    <div className="flex flex-col h-full gap-1">
      {/* 전체 요약 바 */}
      <div className="flex items-center gap-3 px-2 py-1 rounded bg-gray-800/60">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500">전체</span>
          <span className="text-sm font-bold" style={{ color: getRateColor(overallRate) }}>
            {overallRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-3 ml-auto text-[10px]">
          <span className="text-green-400">PASS {totalPass.toLocaleString()}</span>
          <span className="text-red-400">NG {totalNg.toLocaleString()}</span>
          <span className="text-gray-400">Total {totalAll.toLocaleString()}</span>
        </div>
      </div>

      {/* 도넛 영역 */}
      <div className={`flex-1 ${isFew ? "flex items-center justify-center gap-6" : "grid grid-cols-3 gap-1 items-center"}`}>
        {lineStats.map((line) => {
          const data = [
            { name: "PASS", value: line.today.pass },
            { name: "NG", value: line.today.ng || 0.01 },
          ];
          const color = getRateColor(line.today.rate);
          const size = isFew ? 130 : 72;
          const inner = isFew ? 42 : 20;
          const outer = isFew ? 60 : 32;

          return (
            <div key={line.lineCode} className="flex flex-col items-center">
              <div className="relative" style={{ width: size, height: size }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={inner} outerRadius={outer}
                      dataKey="value" startAngle={90} endAngle={-270} stroke="none" animationDuration={800}>
                      <Cell fill={color} />
                      <Cell fill="#1f2937" />
                    </Pie>
                    <Tooltip formatter={(value: number | string | undefined, name: string | undefined) =>
                      [`${(value ?? 0).toLocaleString()}건`, name ?? ""]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`${isFew ? "text-xl" : "text-[10px]"} font-bold`} style={{ color }}>
                    {line.today.rate.toFixed(1)}%
                  </span>
                  {isFew && (
                    <span className="text-[9px] text-gray-500">{line.today.total.toLocaleString()}건</span>
                  )}
                </div>
              </div>
              <span className={`text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate ${isFew ? "max-w-[130px]" : "max-w-[72px] text-[10px]"}`}>
                {line.lineName}
              </span>
              {isFew && (
                <div className={`mt-1 flex gap-2 text-[10px] px-2 py-0.5 rounded border ${getRateBg(line.today.rate)}`}>
                  <span className="text-green-400">{line.today.pass}</span>
                  <span className="text-gray-600">/</span>
                  <span className="text-red-400">{line.today.ng}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
