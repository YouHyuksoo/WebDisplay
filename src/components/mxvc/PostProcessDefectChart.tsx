/**
 * @file src/components/mxvc/PostProcessDefectChart.tsx
 * @description 검사공정별 양품율 / 재검 건수 BarChart (ECharts)
 * 초보자 가이드:
 * - 좌: 공정별 양품율 % (= 100 - 불량율) — ≥99% 녹색, ≥97% 노랑, 미만 빨강
 * - 우: 공정별 재검 건수 — 0건 녹색, ≤2건 파랑, ≤5건 주황, 초과 빨강
 * - x축: 공정명 (ICT, EOL, COATING 1, COATING 2, DOWNLOAD)
 */
'use client';

import { useTranslations } from 'next-intl';
import ReactECharts from 'echarts-for-react';
import type { PostProcessDefectByTable } from '@/types/mxvc/post-process';

interface Props {
  defectByTable: PostProcessDefectByTable[];
  height?: number;
}

/** 양품율 기준 색상 — 높을수록 좋음 */
function yieldColor(rate: number): string {
  if (rate >= 99) return '#10b981';
  if (rate >= 97) return '#f59e0b';
  return '#ef4444';
}

function retestColor(count: number): string {
  if (count === 0) return '#10b981';
  if (count <= 2)  return '#60a5fa';
  if (count <= 5)  return '#fb923c';
  return '#f43f5e';
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  borderColor: '#374151',
  borderWidth: 1,
  textStyle: { color: '#e5e7eb', fontSize: 12 },
};

const AXIS_STYLE = {
  axisLine:  { lineStyle: { color: '#374151' } },
  axisTick:  { show: false },
  axisLabel: { color: '#9ca3af', fontSize: 12, fontWeight: 600 },
};

const SPLIT_LINE = { lineStyle: { color: '#374151', opacity: 0.4, type: 'dashed' as const } };

export default function PostProcessDefectChart({ defectByTable, height = 200 }: Props) {
  const t = useTranslations('mxvc.postProcess');
  const hasData  = defectByTable.some((d) => d.total > 0);
  const labels   = defectByTable.map((d) => d.label);

  // total=0이면 null — ECharts가 막대를 그리지 않아 "데이터 없음"과 "100%"를 구분
  const yRates = defectByTable.map((d): number | null =>
    d.total > 0 ? Math.round((1 - d.fail / d.total) * 10000) / 100 : null,
  );
  const yAxisMin = 0;

  const noDataBox = (
    <div
      className="flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-400 dark:text-gray-500"
      style={{ height }}
    >
      {t('noData')}
    </div>
  );

  const yieldOption = {
    backgroundColor: 'transparent',
    grid: { top: 36, right: 16, bottom: 24, left: 52 },
    xAxis: { type: 'category', data: labels, ...AXIS_STYLE },
    yAxis: {
      type: 'value',
      min: yAxisMin,
      max: 100,
      splitLine: SPLIT_LINE,
      axisLabel: { color: '#9ca3af', fontSize: 11, formatter: '{value}%' },
    },
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number | null }[]) => {
        const p = params[0];
        const val = p.value != null ? `${p.value.toFixed(2)}%` : '-';
        return `<b style="color:#9ca3af">${p.name}</b><br/>${t('yieldLabel')}: <b>${val}</b>`;
      },
    },
    series: [{
      type: 'bar',
      data: yRates.map((yRate) => {
        const color = yRate != null ? yieldColor(yRate) : '#6b7280';
        return {
          value: yRate,
          itemStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color },
                { offset: 1, color: color + '44' },
              ],
            },
            borderRadius: [5, 5, 0, 0],
          },
        };
      }),
      barWidth: '50%',
      label: {
        show: true, position: 'top',
        formatter: (p: { value: number | null }) => p.value != null ? `${p.value.toFixed(2)}%` : '-',
        color: '#6ee7b7', fontSize: 11, fontWeight: 700,
      },
    }],
    animation: true, animationDuration: 600, animationEasing: 'cubicOut' as const,
  };

  const retestOption = {
    backgroundColor: 'transparent',
    grid: { top: 36, right: 16, bottom: 24, left: 52 },
    xAxis: { type: 'category', data: defectByTable.map((d) => d.label), ...AXIS_STYLE },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: SPLIT_LINE,
      axisLabel: { color: '#9ca3af', fontSize: 11, formatter: `{value}${t('countUnit')}` },
    },
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `<b style="color:#9ca3af">${p.name}</b><br/>${t('retestLabel')}: <b>${p.value}${t('countUnit')}</b>`;
      },
    },
    series: [{
      type: 'bar',
      data: defectByTable.map((d) => ({
        value: d.retest,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: retestColor(d.retest) },
              { offset: 1, color: retestColor(d.retest) + '44' },
            ],
          },
          borderRadius: [5, 5, 0, 0],
        },
      })),
      barWidth: '50%',
      label: {
        show: true, position: 'top',
        formatter: (p: { value: number }) => p.value > 0 ? `${p.value}${t('countUnit')}` : '',
        color: '#93c5fd', fontSize: 11, fontWeight: 700,
      },
    }],
    animation: true, animationDuration: 600, animationEasing: 'cubicOut' as const,
  };

  return (
    <div className="px-6 pb-2 shrink-0 flex gap-4">
      {/* 양품율 — 나머지 폭 채움 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
          {t('yieldRateTitle')}
          <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">{t('timeRangeHint')}</span>
        </h3>
        {!hasData ? noDataBox : (
          <ReactECharts option={yieldOption} style={{ height, width: '100%' }} notMerge lazyUpdate />
        )}
      </div>

      {/* 재검 건수 — EOL 파이차트와 동일한 폭 (38%, min 260px) */}
      <div className="shrink-0" style={{ width: '38%', minWidth: 260 }}>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
          {t('retestCountTitle')}
          <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">{t('timeRangeHint')}</span>
        </h3>
        {!hasData ? noDataBox : (
          <ReactECharts option={retestOption} style={{ height, width: '100%' }} notMerge lazyUpdate />
        )}
      </div>
    </div>
  );
}
