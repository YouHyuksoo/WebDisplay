/**
 * @file src/app/ai-chat/_components/ResultChart.tsx
 * @description LLM이 추천한 차트 스펙으로 Recharts 렌더.
 */
'use client';

import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
         XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChartSpec { chartType: 'bar'|'line'|'pie'|'area'; xKey: string; yKey: string; }

interface Props {
  spec: ChartSpec;
  rows: Record<string, unknown>[];
}

const COLORS = ['#06b6d4','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899'];

export default function ResultChart({ spec, rows }: Props) {
  if (rows.length === 0) return null;

  const fallbackXKey = Object.keys(rows[0] ?? {})[0] ?? 'name';
  const fallbackYKey =
    Object.keys(rows[0] ?? {}).find((k) => typeof rows[0]?.[k] === 'number') ??
    Object.keys(rows[0] ?? {})[1] ??
    'value';

  const xKey = spec.xKey in (rows[0] ?? {}) ? spec.xKey : fallbackXKey;
  const yKey = spec.yKey in (rows[0] ?? {}) ? spec.yKey : fallbackYKey;

  const data = rows.map((r) => ({
    [xKey]: r[xKey],
    [yKey]: Number(r[yKey]) || 0,
  }));

  return (
    <div className="mt-2 h-64 w-full">
      <ResponsiveContainer>
        {spec.chartType === 'bar' ? (
          <BarChart data={data}>
            <XAxis dataKey={xKey} stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
            <Bar dataKey={yKey} fill={COLORS[0]} />
          </BarChart>
        ) : spec.chartType === 'line' ? (
          <LineChart data={data}>
            <XAxis dataKey={xKey} stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
            <Line type="monotone" dataKey={yKey} stroke={COLORS[0]} />
          </LineChart>
        ) : spec.chartType === 'area' ? (
          <AreaChart data={data}>
            <XAxis dataKey={xKey} stroke="#71717a" />
            <YAxis stroke="#71717a" />
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
            <Area type="monotone" dataKey={yKey} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
          </AreaChart>
        ) : (
          <PieChart>
            <Pie data={data} dataKey={yKey} nameKey={xKey} fill={COLORS[0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46' }} />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
