/**
 * @file DefectByLineChart.tsx
 * @description 라인별 불량현황 Stacked Bar Chart.
 * 초보자 가이드: Recharts BarChart로 라인별 불량 유형을 색상 구분하여 표시.
 * 불량 유형(Bridge, Insufficient, Shift, Excess, Other)을 스택으로 쌓는다.
 */
'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { DEFECT_BY_LINE } from './mock-data';
import ChartCard from './ChartCard';

/** 불량 유형 키 + 색상 (라벨은 i18n으로 처리) */
const DEFECT_TYPE_KEYS = [
  { key: 'bridge', color: '#f87171' },
  { key: 'insufficient', color: '#fb923c' },
  { key: 'shift', color: '#facc15' },
  { key: 'excess', color: '#a78bfa' },
  { key: 'other', color: '#64748b' },
] as const;

/** 커스텀 툴팁 */
function CustomTooltip({ active, payload, label, t }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!active || !payload) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-zinc-100">{t('tooltipLine', { line: label ?? '' })}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-zinc-400">{p.name}</span>
          <span className="ml-auto font-mono text-zinc-200">{p.value}</span>
        </div>
      ))}
      <div className="mt-1 border-t border-white/10 pt-1 text-right font-semibold text-zinc-200">
        {t('tooltipTotal')}: {total}
      </div>
    </div>
  );
}

export default function DefectByLineChart() {
  const t = useTranslations('spiChart');

  return (
    <ChartCard title={t('defectByLine')} subtitle={t('defectByLineSub')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DEFECT_BY_LINE} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="line"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip t={t} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }}
          />
          {DEFECT_TYPE_KEYS.map((dt) => (
            <Bar
              key={dt.key}
              dataKey={dt.key}
              name={t(dt.key)}
              stackId="defects"
              radius={dt.key === 'other' ? [3, 3, 0, 0] : undefined}
            >
              {DEFECT_BY_LINE.map((_, idx) => (
                <Cell key={idx} fill={dt.color} fillOpacity={0.85} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
