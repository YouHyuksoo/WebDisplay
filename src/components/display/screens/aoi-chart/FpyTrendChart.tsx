/**
 * @file FpyTrendChart.tsx
 * @description AOI 직행율(FPY) 7일 추이 Area Chart. 실제 DB 데이터 사용.
 * 초보자 가이드: Recharts AreaChart로 최근 7일간 직행율 추이와 목표선을 표시.
 * 그라데이션 fill로 시각적 깊이감을 주고, 목표 달성 여부에 따라 dot 색상이 변한다.
 */
'use client';

import { useTranslations } from 'next-intl';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import ChartCard from './ChartCard';
import type { AoiFpyRow } from '@/lib/queries/aoi-chart';

const FPY_TARGET = 98.0;

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
          <span className="text-zinc-400">{p.name === 'FPY' ? t('fpy') : t('target')}</span>
          <span className="ml-auto font-mono text-zinc-200">
            {p.value != null ? `${p.value.toFixed(1)}%` : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 커스텀 dot — 목표 달성 시 초록, 미달 시 노랑 */
function CustomDot({ cx, cy, payload }: {
  cx?: number; cy?: number; payload?: AoiFpyRow;
}) {
  if (cx == null || cy == null || !payload || payload.FPY == null) return null;
  const achieved = payload.FPY >= FPY_TARGET;
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill={achieved ? '#4ade80' : '#facc15'}
      stroke={achieved ? '#22c55e' : '#eab308'}
      strokeWidth={2}
    />
  );
}

interface FpyTrendChartProps {
  data: AoiFpyRow[];
}

export default function FpyTrendChart({ data }: FpyTrendChartProps) {
  const t = useTranslations('aoiChart');

  const validFpy = data.map((d) => d.FPY).filter((v): v is number => v != null);
  const minFpy = validFpy.length > 0 ? Math.floor(Math.min(...validFpy) - 2) : 90;
  const yMin = Math.max(minFpy, 0);

  return (
    <ChartCard title={t('fpyTrend')} subtitle={t('fpyTrendSub')}>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          {t('noData')}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="aoiFpyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="WORK_DATE"
              tick={{ fill: '#a1a1aa', fontSize: 12 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, 100]}
              tick={{ fill: '#a1a1aa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip t={t} />} />
            <ReferenceLine
              y={FPY_TARGET}
              stroke="#f87171"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: t('targetLabel', { value: FPY_TARGET }),
                position: 'right',
                fill: '#f87171',
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="FPY"
              stroke="#a78bfa"
              strokeWidth={2.5}
              fill="url(#aoiFpyGradient)"
              dot={<CustomDot />}
              activeDot={{ r: 6, stroke: '#a78bfa', strokeWidth: 2, fill: '#6d28d9' }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
