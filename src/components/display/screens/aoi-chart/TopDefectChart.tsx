/**
 * @file TopDefectChart.tsx
 * @description AOI 라인별 불량 TOP5 Horizontal Bar Chart. 실제 DB 데이터 사용.
 * 초보자 가이드: Recharts BarChart(layout="vertical")로 NG 건수 기준 상위 5개 라인을 표시.
 * 각 바에 그라데이션 색상과 불량건수를 함께 보여준다.
 */
'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import ChartCard from './ChartCard';
import type { AoiTopLineRow } from '@/lib/queries/aoi-chart';

/** 그라데이션 색상 — 1위(빨강)부터 5위(보라)까지 */
const RANK_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#a78bfa'];

/** 커스텀 툴팁 */
function CustomTooltip({ active, payload, t }: {
  active?: boolean;
  payload?: Array<{ payload: AoiTopLineRow }>;
  t: (key: string) => string;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="font-semibold text-zinc-100">{d.LINE_NAME}</p>
      <p className="text-zinc-400">
        {t('tooltipDefects')}: <span className="font-mono text-zinc-200">{d.NG_CNT.toLocaleString()}</span>
      </p>
      <p className="text-zinc-400">
        {t('totalInspected')}: <span className="font-mono text-zinc-200">{d.TOTAL_CNT.toLocaleString()}</span>
      </p>
      <p className="text-zinc-400">
        {t('tooltipRate')}: <span className="font-mono text-zinc-200">{d.NG_RATE}%</span>
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

interface TopDefectChartProps {
  data: AoiTopLineRow[];
}

export default function TopDefectChart({ data }: TopDefectChartProps) {
  const t = useTranslations('aoiChart');

  return (
    <ChartCard title={t('topDefect')} subtitle={t('topDefectSub')}>
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          {t('noData')}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
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
              dataKey="LINE_NAME"
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
              dataKey="NG_CNT"
              radius={[0, 4, 4, 0]}
              barSize={20}
              label={<RenderLabel />}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={RANK_COLORS[idx] ?? '#64748b'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
