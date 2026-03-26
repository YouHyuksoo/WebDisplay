/**
 * @file DefectRatePanel.tsx
 * @description AOI 불량율 현황 패널. Donut 차트 + KPI 수치 카드. 실제 DB 데이터 사용.
 * 초보자 가이드: Recharts PieChart(도넛)로 양품/불량 비율을 시각화하고,
 * 핵심 KPI 수치(검사수, 불량수, 불량율, 직행율)를 함께 표시한다.
 */
'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import ChartCard from './ChartCard';
import type { AoiSummaryRow } from '@/lib/queries/aoi-chart';

const PIE_COLORS = ['#a78bfa', '#f87171'];
const DEFECT_TARGET = 0.50;

/** KPI 수치 카드 */
function KpiItem({ label, value, unit }: {
  label: string; value: string; unit?: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-center">
      <p className="text-xs font-medium tracking-wide text-zinc-300">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-zinc-100">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal text-zinc-400">{unit}</span>}
      </p>
    </div>
  );
}

/** 도넛 차트 중앙 라벨 */
function CenterLabel({ defectRate, statusText, rateLabel }: {
  defectRate: number; statusText: string; rateLabel: string;
}) {
  const statusColor = defectRate <= DEFECT_TARGET ? '#4ade80' : '#f87171';
  return (
    <g>
      <text x="50%" y="44%" textAnchor="middle" fill={statusColor} fontSize={13} fontWeight={700}>
        {statusText}
      </text>
      <text x="50%" y="58%" textAnchor="middle" fill="#e4e4e7" fontSize={22} fontWeight={800}>
        {defectRate.toFixed(2)}%
      </text>
      <text x="50%" y="68%" textAnchor="middle" fill="#a1a1aa" fontSize={10}>
        {rateLabel}
      </text>
    </g>
  );
}

interface DefectRatePanelProps {
  summary: AoiSummaryRow | null;
}

export default function DefectRatePanel({ summary }: DefectRatePanelProps) {
  const t = useTranslations('aoiChart');

  const totalInspected = summary?.TOTAL_INSPECTED ?? 0;
  const totalDefects = summary?.TOTAL_DEFECTS ?? 0;
  const defectRate = summary?.DEFECT_RATE ?? 0;
  const fpyRate = summary?.FPY_RATE ?? 0;

  const pieData = [
    { name: 'Good', value: totalInspected - totalDefects },
    { name: 'Defect', value: totalDefects },
  ];

  const statusText = defectRate <= DEFECT_TARGET ? t('statusGood') : t('statusOver');

  return (
    <ChartCard title={t('defectRate')} subtitle={t('defectRateSub')}>
      {totalInspected === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-zinc-500">
          {t('noData')}
        </div>
      ) : (
        <div className="flex h-full gap-3">
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
                <CenterLabel
                  defectRate={defectRate}
                  statusText={statusText}
                  rateLabel={t('defectRateLabel')}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid w-1/2 grid-cols-2 gap-2 content-center">
            <KpiItem label={t('totalInspected')} value={totalInspected.toLocaleString()} />
            <KpiItem label={t('totalDefects')} value={totalDefects.toLocaleString()} />
            <KpiItem label={t('defectRateLabel')} value={defectRate.toFixed(2)} unit="%" />
            <KpiItem label={t('fpyRateLabel')} value={fpyRate.toFixed(1)} unit="%" />
          </div>
        </div>
      )}
    </ChartCard>
  );
}
