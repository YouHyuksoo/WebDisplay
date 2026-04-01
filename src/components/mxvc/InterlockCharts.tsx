/**
 * @file src/components/mxvc/InterlockCharts.tsx
 * @description 인터락호출이력 우측 2x2 차트 그리드
 * 초보자 가이드:
 * 1. 좌상: 시간별 호출 건수 (Bar 세로)
 * 2. 우상: OK/NG 비율 (Donut)
 * 3. 좌하: 공정별 NG TOP 10 (가로 Bar)
 * 4. 우하: ADDR별 호출 건수 (가로 Bar)
 * 5. recharts 3.x 사용, 다크 테마 색상
 */
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { InterlockChartData } from "@/types/mxvc/interlock";

interface InterlockChartsProps {
  charts: InterlockChartData;
}

const COLORS = {
  ok: "#22c55e",
  ng: "#ef4444",
  bar: "#60a5fa",
  barNg: "#f87171",
};

/** 차트 카드 래퍼 */
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col">
      <div className="shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">{title}</h4>
      </div>
      <div className="flex-1 p-2 relative">
        <div className="absolute inset-2">{children}</div>
      </div>
    </div>
  );
}

export default function InterlockCharts({ charts }: InterlockChartsProps) {
  const pieData = [
    { name: "OK", value: charts.okNgRatio.ok },
    { name: "NG", value: charts.okNgRatio.ng },
  ];

  return (
    <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 p-3">
      {/* 좌상: 시간별 호출 건수 */}
      <ChartCard title="시간별 호출 건수">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.hourly} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hour" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="count" fill={COLORS.bar} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 우상: OK/NG 비율 */}
      <ChartCard title="OK / NG 비율">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: "#9ca3af" }}
              isAnimationActive={false}
            >
              {pieData.map((entry, idx) => (
                <Cell key={entry.name} fill={idx === 0 ? COLORS.ok : COLORS.ng} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 좌하: 공정별 NG TOP 10 */}
      <ChartCard title="공정별 NG TOP 10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.byWorkstage} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis dataKey="workstageCode" type="category" width={90} tick={{ fill: "#9ca3af", fontSize: 9 }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="ng" fill={COLORS.barNg} radius={[0, 2, 2, 0]} name="NG" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 우하: ADDR별 호출 건수 */}
      <ChartCard title="ADDR별 호출 건수">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={charts.byAddr} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <YAxis dataKey="addr" type="category" width={80} tick={{ fill: "#9ca3af", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
              itemStyle={{ color: "#e5e7eb" }}
            />
            <Bar dataKey="ok" stackId="a" fill={COLORS.ok} name="OK" />
            <Bar dataKey="ng" stackId="a" fill={COLORS.ng} name="NG" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
