/**
 * @file FpyTrendChart.tsx
 * @description 직행율(FPY) 일별 추이 Area Chart.
 * 초보자 가이드: Recharts AreaChart로 7일간 직행율 추이와 목표선을 표시.
 * 그라데이션 fill로 시각적 깊이감을 준다.
 */
'use client';

import { useTranslations } from 'next-intl';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { FPY_TREND } from './mock-data';
import ChartCard from './ChartCard';

/** 커스텀 툴팁 */
function CustomTooltip({ active, payload, label, t }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
  t: (key: string) => string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-zinc-100">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="text-zinc-400">{p.name === 'fpy' ? t('fpy') : t('target')}</span>
          <span className="ml-auto font-mono text-zinc-200">{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

/** 커스텀 dot — 목표 달성 시 초록, 미달 시 노랑 */
function CustomDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { fpy: number; target: number } }) {
  if (cx == null || cy == null || !payload) return null;
  const achieved = payload.fpy >= payload.target;
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill={achieved ? '#4ade80' : '#facc15'}
      stroke={achieved ? '#22c55e' : '#eab308'}
      strokeWidth={2}
    />
  );
}

export default function FpyTrendChart() {
  const t = useTranslations('spiChart');

  return (
    <ChartCard title={t('fpyTrend')} subtitle={t('fpyTrendSub')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={FPY_TREND} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="fpyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            domain={[94, 100]}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip t={t} />} />
          <ReferenceLine
            y={98}
            stroke="#f87171"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: t('targetLabel', { value: 98 }),
              position: 'right',
              fill: '#f87171',
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="fpy"
            stroke="#22d3ee"
            strokeWidth={2.5}
            fill="url(#fpyGradient)"
            dot={<CustomDot />}
            activeDot={{ r: 6, stroke: '#22d3ee', strokeWidth: 2, fill: '#0e7490' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
