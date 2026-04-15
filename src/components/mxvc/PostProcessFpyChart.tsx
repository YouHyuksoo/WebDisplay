/**
 * @file src/components/mxvc/PostProcessFpyChart.tsx
 * @description 검사공정 직행율 현황 BarChart (ECharts)
 * 초보자 가이드:
 * - x축: 공정명 (ICT, EOL, COATING 1, COATING 2, DOWNLOAD)
 * - y축: 직행율 % (0~100)
 * - 각 공정의 시간대별 데이터를 합산해 전체 직행율 계산
 * - 95% / 90% 기준선 표시, 바 색상: ≥95 녹색, ≥90 노랑, <90 빨강
 */
'use client';

import { useTranslations } from 'next-intl';
import ReactECharts from 'echarts-for-react';
import type { PostProcessFpyRow } from '@/types/mxvc/post-process';
import { POST_PROCESS_TABLES, POST_PROCESS_TABLE_LABELS } from '@/lib/queries/post-process';

interface Props {
  fpyChart: Record<string, PostProcessFpyRow[]>;
  height?: number;
}

function yieldColor(y: number): string {
  if (y >= 95) return '#10b981';
  if (y >= 90) return '#f59e0b';
  return '#ef4444';
}

function buildBarData(fpyChart: Record<string, PostProcessFpyRow[]>) {
  return POST_PROCESS_TABLES.map((k) => {
    const rows  = fpyChart[k] ?? [];
    const total = rows.reduce((s, r) => s + r.total, 0);
    const pass  = rows.reduce((s, r) => s + r.pass,  0);
    const yld   = total > 0 ? Math.round((pass / total) * 10000) / 100 : null;
    return { name: POST_PROCESS_TABLE_LABELS[k], yield: yld, total };
  });
}

export default function PostProcessFpyChart({ fpyChart, height = 260 }: Props) {
  const t = useTranslations('mxvc.postProcess');
  const data   = buildBarData(fpyChart);
  const hasData = data.some((d) => d.total > 0);

  if (!hasData) {
    return (
      <div className="px-6 pb-4 shrink-0">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
          {t('fpyStatusTitle')}
        </h3>
        <div
          className="flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-400 dark:text-gray-500"
          style={{ height }}
        >
          {t('noData')}
        </div>
      </div>
    );
  }

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 24, bottom: 24, left: 52 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLine:  { lineStyle: { color: '#374151' } },
      axisTick:  { show: false },
      axisLabel: { color: '#9ca3af', fontSize: 12, fontWeight: 600 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: '#374151', opacity: 0.4, type: 'dashed' } },
      axisLabel: { color: '#9ca3af', fontSize: 11, formatter: '{value}%' },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb', fontSize: 12 },
      formatter: (params: { name: string; value: number | null }[]) => {
        const p = params[0];
        return `<b style="color:#9ca3af">${p.name}</b><br/>${t('fpyLabel')}: <b>${p.value != null ? p.value.toFixed(2) + '%' : '-'}</b>`;
      },
    },
    markLine: {
      silent: true,
      symbol: 'none',
      data: [
        { yAxis: 95, lineStyle: { color: '#10b981', type: 'dashed', width: 1.5 }, label: { formatter: '95%', color: '#10b981', fontSize: 10 } },
        { yAxis: 90, lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }, label: { formatter: '90%', color: '#f59e0b', fontSize: 10 } },
      ],
    },
    series: [{
      type: 'bar',
      data: data.map((d) => ({
        value: d.yield,
        itemStyle: {
          color: d.yield != null ? {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: yieldColor(d.yield) },
              { offset: 1, color: yieldColor(d.yield) + '55' },
            ],
          } : '#4b5563',
          borderRadius: [6, 6, 0, 0],
        },
      })),
      barWidth: '45%',
      label: {
        show: true,
        position: 'top',
        formatter: (p: { value: number | null }) =>
          p.value != null ? `${p.value.toFixed(1)}%` : '-',
        color: '#e5e7eb',
        fontSize: 12,
        fontWeight: 700,
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          { yAxis: 95, lineStyle: { color: '#10b981', type: 'dashed', width: 1.5 }, label: { formatter: '95%', color: '#10b981', fontSize: 10, position: 'insideEndTop' } },
          { yAxis: 90, lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }, label: { formatter: '90%', color: '#f59e0b', fontSize: 10, position: 'insideEndTop' } },
        ],
      },
    }],
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut' as const,
  };

  return (
    <div className="px-6 pb-4 shrink-0">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
        {t('fpyStatusTitle')}
        <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">
          {t('timeRangeSumHint')}
        </span>
      </h3>
      <ReactECharts
        option={option}
        style={{ height, width: '100%' }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
