/**
 * @file src/components/mxvc/repair-status/RepairModelBar.tsx
 * @description 품목별 불량건수 가로 막대 차트 (상위 10개)
 */
'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { RepairStatusRow } from '@/types/ctq/repair-status';

interface Props {
  rows: RepairStatusRow[];
  height?: number;
  topN?: number;
}

export default function RepairModelBar({ rows, height = 220, topN = 10 }: Props) {
  const { categories, values, total } = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.modelName && r.modelName !== '-' ? r.modelName : '미지정';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, topN);
    // ECharts yAxis 카테고리는 하단이 첫 요소라서 건수 큰게 위로 오도록 reverse
    sorted.reverse();
    return {
      categories: sorted.map(([k]) => k),
      values:     sorted.map(([, v]) => v),
      total:      rows.length,
    };
  }, [rows, topN]);

  const hasData = values.length > 0;

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 30, bottom: 20, left: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb', fontSize: 12 },
      formatter: (params: Array<{ name: string; value: number }>) => {
        const p = params[0];
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0.0';
        return `${p.name}<br/>불량: <b>${p.value}건</b> (${pct}%)`;
      },
    },
    xAxis: {
      type: 'value',
      axisLine:  { show: false },
      axisTick:  { show: false },
      splitLine: { lineStyle: { color: '#27272a' } },
      axisLabel: { color: '#71717a', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: { color: '#d4d4d8', fontSize: 10, width: 90, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      data: values,
      barMaxWidth: 14,
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#60a5fa' }] },
        borderRadius: [0, 3, 3, 0],
      },
      label: { show: true, position: 'right', color: '#e5e7eb', fontSize: 10, formatter: '{c}' },
      emphasis: { itemStyle: { color: '#93c5fd' } },
    }],
    animation: true,
    animationDuration: 600,
  };

  return (
    <div className="flex flex-col">
      <h3 className="text-xs font-semibold text-zinc-300 mb-1 px-3 pt-2">
        품목별 불량건수
        {hasData && <span className="ml-2 font-normal text-zinc-500">상위 {categories.length}개</span>}
      </h3>
      {!hasData ? (
        <div className="mx-3 mb-2 flex items-center justify-center border border-dashed border-zinc-700 rounded text-xs text-zinc-500" style={{ height }}>
          데이터 없음
        </div>
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      )}
    </div>
  );
}
