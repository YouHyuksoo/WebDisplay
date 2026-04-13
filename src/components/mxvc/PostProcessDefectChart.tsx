/**
 * @file src/components/mxvc/PostProcessDefectChart.tsx
 * @description 검사공정별 불량율 / 재검 건수 BarChart (ECharts)
 * 초보자 가이드:
 * - 좌: 공정별 불량율 % — ≤1% 녹색, ≤3% 노랑, 초과 빨강
 * - 우: 공정별 재검 건수 — ≤2건 파랑, ≤5건 주황, 초과 빨강
 * - x축: 공정명 (ICT, EOL, COATING 1, COATING 2, DOWNLOAD)
 */
'use client';

import ReactECharts from 'echarts-for-react';
import type { PostProcessDefectByTable } from '@/types/mxvc/post-process';

interface Props {
  defectByTable: PostProcessDefectByTable[];
  height?: number;
}

function defectColor(rate: number): string {
  if (rate <= 1) return '#10b981';
  if (rate <= 3) return '#f59e0b';
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
  const hasData  = defectByTable.some((d) => d.total > 0);
  const labels   = defectByTable.map((d) => d.label);

  const noDataBox = (
    <div
      className="flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-400 dark:text-gray-500"
      style={{ height }}
    >
      데이터 없음
    </div>
  );

  const defectOption = {
    backgroundColor: 'transparent',
    grid: { top: 36, right: 16, bottom: 24, left: 52 },
    xAxis: { type: 'category', data: labels, ...AXIS_STYLE },
    yAxis: {
      type: 'value',
      splitLine: SPLIT_LINE,
      axisLabel: { color: '#9ca3af', fontSize: 11, formatter: '{value}%' },
    },
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `<b style="color:#9ca3af">${p.name}</b><br/>불량율: <b>${p.value.toFixed(2)}%</b>`;
      },
    },
    series: [{
      type: 'bar',
      data: defectByTable.map((d) => ({
        value: d.defectRate,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: defectColor(d.defectRate) },
              { offset: 1, color: defectColor(d.defectRate) + '44' },
            ],
          },
          borderRadius: [5, 5, 0, 0],
        },
      })),
      barWidth: '50%',
      label: {
        show: true, position: 'top',
        formatter: (p: { value: number }) => p.value > 0 ? `${p.value.toFixed(1)}%` : '',
        color: '#fca5a5', fontSize: 11, fontWeight: 700,
      },
    }],
    animation: true, animationDuration: 600, animationEasing: 'cubicOut' as const,
  };

  const retestOption = {
    backgroundColor: 'transparent',
    grid: { top: 36, right: 16, bottom: 24, left: 52 },
    xAxis: { type: 'category', data: labels, ...AXIS_STYLE },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: SPLIT_LINE,
      axisLabel: { color: '#9ca3af', fontSize: 11, formatter: '{value}건' },
    },
    tooltip: {
      trigger: 'axis',
      ...TOOLTIP_STYLE,
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `<b style="color:#9ca3af">${p.name}</b><br/>재검 건수: <b>${p.value}건</b>`;
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
        formatter: (p: { value: number }) => p.value > 0 ? `${p.value}건` : '',
        color: '#93c5fd', fontSize: 11, fontWeight: 700,
      },
    }],
    animation: true, animationDuration: 600, animationEasing: 'cubicOut' as const,
  };

  return (
    <div className="px-6 pb-2 shrink-0 grid grid-cols-2 gap-4">
      {/* 불량율 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
          공정별 불량율
          <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">당일 08:00 ~ 현재</span>
        </h3>
        {!hasData ? noDataBox : (
          <ReactECharts option={defectOption} style={{ height, width: '100%' }} notMerge lazyUpdate />
        )}
      </div>

      {/* 재검 건수 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1">
          공정별 재검 건수
          <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">당일 08:00 ~ 현재</span>
        </h3>
        {!hasData ? noDataBox : (
          <ReactECharts option={retestOption} style={{ height, width: '100%' }} notMerge lazyUpdate />
        )}
      </div>
    </div>
  );
}
