/**
 * @file src/components/u1/ate/AteMachineNg.tsx
 * @description ATE 머신별 NG 분포 — 수평 바 차트 (TOP 10, NG 건수 내림차순)
 *
 * 초보자 가이드:
 * 1. Y축: MACHINE_CODE, X축: NG 건수
 * 2. NG 건수에 따라 빨강 그라데이션 색상
 * 3. 당일 데이터만 사용 (Daily API의 machineNg 필드)
 */

"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import type { AteMachineNgItem } from "@/types/u1/ate-analysis";

function getNgColor(ngCount: number, maxNg: number): string {
  if (maxNg === 0) return "#6b7280";
  const ratio = ngCount / maxNg;
  if (ratio > 0.7) return "#ef4444";
  if (ratio > 0.4) return "#f97316";
  return "#eab308";
}

interface Props {
  machineNg: AteMachineNgItem[];
}

export default function AteMachineNg({ machineNg }: Props) {
  if (machineNg.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
        NG 데이터 없음
      </div>
    );
  }

  const maxNg = Math.max(...machineNg.map((m) => m.ngCount));
  const chartData = machineNg.map((m) => ({
    name: m.machineCode,
    ng: m.ngCount,
    total: m.total,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 10 }} width={80} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value: number | string | undefined, _name: string | undefined, props: { payload?: { total?: number } }) => [
            `${value ?? 0}건 / ${props.payload?.total ?? 0}건`, "NG",
          ]}
        />
        <Bar dataKey="ng" name="NG 건수" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={getNgColor(entry.ng, maxNg)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
