/**
 * @file DefectByLineChart.tsx
 * @description AOI 라인별 불량현황 Bar Chart. 실제 DB 데이터 사용.
 * 초보자 가이드: Recharts BarChart로 라인별 NG 건수를 표시.
 * NG 비율 구간별 색상 코딩으로 심각도를 직관적으로 전달한다.
 */
'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import ChartCard from './ChartCard';
import type { AoiLineRow } from '@/lib/queries/aoi-chart';

/** 바 색상 — NG 비율 구간별 색상 (낮을수록 좋음) */
function getBarColor(ngRate: number): string {
  if (ngRate >= 5) return '#ef4444';
  if (ngRate >= 3) return '#f97316';
  if (ngRate >= 1) return '#eab308';
  return '#22d3ee';
}

/** 커스텀 툴팁 */
function CustomTooltip({ active, payload, label, t }: {
  active?: boolean;
  payload?: Array<{ payload: AoiLineRow }>;
  label?: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold text-zinc-100">{t('tooltipLine', { line: d.LINE_NAME ?? label ?? '' })}</p>
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">{t('totalInspected')}</span>
        <span className="ml-auto font-mono text-zinc-200">{d.TOTAL_CNT.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">{t('ngCount')}</span>
        <span className="ml-auto font-mono text-red-400">{d.NG_CNT.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">{t('ngRate')}</span>
        <span className="ml-auto font-mono text-zinc-200">{d.NG_RATE}%</span>
      </div>
    </div>
  );
}

interface DefectByLineChartProps {
  data: AoiLineRow[];
}

export default function DefectByLineChart({ data }: DefectByLineChartProps) {
  const t = useTranslations('aoiChart');

  return (
    <ChartCard title={t('defectByLine')} subtitle={t('defectByLineSub')}>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          {t('noData')}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="LINE_NAME"
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
            <Bar dataKey="NG_CNT" radius={[4, 4, 0, 0]} barSize={32}>
              {data.map((row, idx) => (
                <Cell key={idx} fill={getBarColor(row.NG_RATE)} fillOpacity={0.85} />
              ))}
              <LabelList dataKey="NG_CNT" position="top" fill="#a1a1aa" fontSize={11} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
