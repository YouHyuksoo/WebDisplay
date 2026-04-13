/**
 * @file src/components/mxvc/PostProcessEolDefectPie.tsx
 * @description EOL 스텝별 불량 분포 파이차트 (ECharts)
 * 초보자 가이드:
 * - LOG_EOL의 STEP_RESULT = FAIL 행을 NAME_DETAIL로 집계
 * - 상위 7개 + 나머지 "기타" 합산 (최대 8 슬라이스)
 * - 도넛(Doughnut) 형태로 중앙에 총 불량건수 표시
 */
'use client';

import ReactECharts from 'echarts-for-react';
import type { PostProcessEolStepDefect } from '@/types/mxvc/post-process';

interface Props {
  eolStepDefects: PostProcessEolStepDefect[];
  height?: number;
}

const PIE_COLORS = [
  '#ef4444', '#fb923c', '#f59e0b', '#10b981', '#34d399',
  '#60a5fa', '#818cf8', '#a78bfa', '#f472b6', '#fb7185',
  '#6b7280', // 기타
];

const MAX_SLICES = 11; // 상위 10개 + 기타

function buildPieData(rows: PostProcessEolStepDefect[]) {
  const sorted = [...rows].sort((a, b) => b.failCount - a.failCount);
  if (sorted.length <= MAX_SLICES) {
    return sorted.map((r) => ({ name: r.nameDetail, value: r.failCount }));
  }
  const top  = sorted.slice(0, MAX_SLICES - 1);
  const rest = sorted.slice(MAX_SLICES - 1).reduce((s, r) => s + r.failCount, 0);
  return [
    ...top.map((r) => ({ name: r.nameDetail, value: r.failCount })),
    { name: '기타', value: rest },
  ];
}

export default function PostProcessEolDefectPie({ eolStepDefects, height = 260 }: Props) {
  const data    = buildPieData(eolStepDefects);
  const total   = eolStepDefects.reduce((s, r) => s + r.failCount, 0);
  const hasData = total > 0;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb', fontSize: 12 },
      formatter: '{b}<br/>불량: <b>{c}건</b> ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'center',
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 8,
      textStyle: {
        color: '#9ca3af',
        fontSize: 11,
        overflow: 'truncate',
        width: 100,
      },
    },
    series: [{
      type: 'pie',
      radius: ['40%', '68%'],
      center: ['38%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#111827', borderWidth: 2 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{d}%',
        fontSize: 11,
        color: '#d1d5db',
        minAngle: 10,
      },
      labelLine: { lineStyle: { color: '#4b5563' }, length: 8, length2: 6 },
      emphasis: {
        itemStyle: { shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.5)' },
        scale: true,
        scaleSize: 6,
      },
      data: data.map((d, i) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: PIE_COLORS[i % PIE_COLORS.length] },
      })),
    }],
    graphic: [{
      type: 'text',
      left: '35.5%',
      top: 'center',
      style: {
        text: `${total}\n건`,
        textAlign: 'center',
        fill: '#e5e7eb',
        fontSize: 18,
        fontWeight: 700,
        lineHeight: 22,
      },
    }],
    animation: true,
    animationDuration: 700,
    animationEasing: 'cubicOut' as const,
  };

  return (
    <div className="flex flex-col shrink-0" style={{ width: '38%', minWidth: 260 }}>
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 px-4">
        EOL 스텝별 불량 분포
        <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">최근 7일</span>
        {hasData && (
          <span className="ml-2 font-normal text-gray-400 dark:text-gray-500 text-xs">
            총 {total}건
          </span>
        )}
      </h3>

      {!hasData ? (
        <div
          className="mx-4 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-400 dark:text-gray-500"
          style={{ height }}
        >
          불량 없음
        </div>
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      )}
    </div>
  );
}
