/**
 * @file TopDefectChart.tsx
 * @description 위치별 TOP5 불량 Horizontal Bar Chart.
 * 초보자 가이드: Recharts BarChart(layout="vertical")로 불량 위치 랭킹을 표시.
 * 각 바에 그라데이션 색상과 불량건수/비율을 함께 보여준다.
 */
'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { TOP_DEFECT_POSITIONS } from './mock-data';
import ChartCard from './ChartCard';

/** 그라데이션 색상 — 1위(빨강)부터 5위(블루)까지 */
const RANK_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee'];

/** 커스텀 툴팁 */
function CustomTooltip({ active, payload, t }: {
  active?: boolean;
  payload?: Array<{ payload: { position: string; count: number; rate: number } }>;
  t: (key: string) => string;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold text-zinc-100">{d.position}</p>
      <p className="text-zinc-400">
        {t('tooltipDefects')}: <span className="font-mono text-zinc-200">{d.count}</span>
      </p>
      <p className="text-zinc-400">
        {t('tooltipRate')}: <span className="font-mono text-zinc-200">{d.rate}%</span>
      </p>
    </div>
  );
}

/** 바 끝에 수치 라벨 */
function RenderLabel({ x, y, width, height, value }: {
  x?: number; y?: number; width?: number; height?: number; value?: number;
}) {
  if (x == null || y == null || width == null || height == null) return null;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill="#a1a1aa"
      fontSize={11}
      dominantBaseline="central"
    >
      {value}
    </text>
  );
}

export default function TopDefectChart() {
  const t = useTranslations('spiChart');

  return (
    <ChartCard title={t('topDefect')} subtitle={t('topDefectSub')}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={TOP_DEFECT_POSITIONS}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 4, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="position"
            width={90}
            tick={{ fill: '#d4d4d8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip t={t} />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            barSize={20}
            label={<RenderLabel />}
          >
            {TOP_DEFECT_POSITIONS.map((_, idx) => (
              <Cell key={idx} fill={RANK_COLORS[idx]} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
