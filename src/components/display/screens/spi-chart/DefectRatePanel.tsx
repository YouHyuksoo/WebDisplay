/**
 * @file DefectRatePanel.tsx
 * @description 불량율 현황 패널. Donut 차트 + KPI 수치 카드.
 * 초보자 가이드: Recharts PieChart(도넛)로 양품/불량 비율을 시각화하고,
 * 핵심 KPI 수치(검사수, 불량수, 불량율, 직행율)를 함께 표시한다.
 */
'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DEFECT_RATE_SUMMARY } from './mock-data';
import ChartCard from './ChartCard';

const { totalInspected, totalDefects, defectRate, fpyRate, previousDefectRate, target } = DEFECT_RATE_SUMMARY;

const pieData = [
  { name: 'Good', value: totalInspected - totalDefects },
  { name: 'Defect', value: totalDefects },
];

const PIE_COLORS = ['#22d3ee', '#f87171'];

/** KPI 수치 카드 */
function KpiItem({ label, value, unit, trend, trendLabel }: {
  label: string; value: string; unit?: string; trend?: 'up' | 'down' | 'neutral'; trendLabel?: string;
}) {
  const trendColor = trend === 'down' ? 'text-emerald-400' : trend === 'up' ? 'text-red-400' : 'text-zinc-400';
  const trendIcon = trend === 'down' ? '\u25BC' : trend === 'up' ? '\u25B2' : '';
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-center">
      <p className="text-[10px] tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-zinc-100">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-zinc-500">{unit}</span>}
      </p>
      {trendIcon && (
        <span className={`text-[10px] ${trendColor}`}>{trendIcon} {trendLabel}</span>
      )}
    </div>
  );
}

/** 도넛 차트 중앙 라벨 */
function CenterLabel({ statusText, rateLabel }: { statusText: string; rateLabel: string }) {
  const statusColor = defectRate <= target ? '#4ade80' : '#f87171';
  return (
    <g>
      <text x="50%" y="44%" textAnchor="middle" fill={statusColor} fontSize={13} fontWeight={700}>
        {statusText}
      </text>
      <text x="50%" y="58%" textAnchor="middle" fill="#e4e4e7" fontSize={22} fontWeight={800}>
        {defectRate.toFixed(2)}%
      </text>
      <text x="50%" y="68%" textAnchor="middle" fill="#71717a" fontSize={10}>
        {rateLabel}
      </text>
    </g>
  );
}

export default function DefectRatePanel() {
  const t = useTranslations('spiChart');
  const defectTrend = defectRate < previousDefectRate ? 'down' : defectRate > previousDefectRate ? 'up' : 'neutral';
  const statusText = defectRate <= target ? t('statusGood') : t('statusOver');

  return (
    <ChartCard title={t('defectRate')} subtitle={t('defectRateSub')}>
      <div className="flex h-full gap-3">
        {/* 도넛 차트 */}
        <div className="flex w-1/2 items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="82%"
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx]} fillOpacity={0.85} />
                ))}
              </Pie>
              <CenterLabel statusText={statusText} rateLabel={t('defectRateLabel')} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* KPI 수치 */}
        <div className="grid w-1/2 grid-cols-2 gap-2 content-center">
          <KpiItem label={t('totalInspected')} value={totalInspected.toLocaleString()} />
          <KpiItem label={t('totalDefects')} value={totalDefects.toLocaleString()} trend={defectTrend} trendLabel={t('vsPrev')} />
          <KpiItem label={t('defectRateLabel')} value={defectRate.toFixed(2)} unit="%" trend={defectTrend} trendLabel={t('vsPrev')} />
          <KpiItem label={t('fpyRateLabel')} value={fpyRate.toFixed(1)} unit="%" />
        </div>
      </div>
    </ChartCard>
  );
}
