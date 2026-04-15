/**
 * @file src/components/mxvc/repair-status/RepairQcResultPie.tsx
 * @description QC 검사결과(가성/진성/대기) 분포 도넛 차트
 *
 * 초보자 가이드:
 * - qcResultName 기준으로 건수 집계
 * - 의미 기반 색상: 진성(빨강), 가성(초록), 대기(노랑), 기타(회색)
 * - 범례는 하단 가로 배치 (값 개수가 적음)
 */
'use client';

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { RepairStatusRow } from '@/types/ctq/repair-status';

interface Props {
  rows: RepairStatusRow[];
  height?: number;
}

// 의미 기반 색상 매핑
const QC_COLOR_MAP: Record<string, string> = {
  '진성': '#ef4444',
  'NG':   '#ef4444',
  '가성': '#22c55e',
  'OK':   '#22c55e',
  '대기': '#eab308',
  'WAIT': '#eab308',
};
const FALLBACK_COLOR = '#6b7280';

export default function RepairQcResultPie({ rows, height = 240 }: Props) {
  const { data, total } = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.qcResultName && r.qcResultName !== '-' ? r.qcResultName : '미지정';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const sorted = Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { data: sorted, total: sorted.reduce((s, r) => s + r.value, 0) };
  }, [rows]);

  const hasData = total > 0;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1f2937',
      borderColor: '#374151',
      borderWidth: 1,
      textStyle: { color: '#e5e7eb', fontSize: 12 },
      formatter: '{b}<br/>건수: <b>{c}건</b> ({d}%)',
    },
    legend: {
      orient: 'horizontal',
      bottom: 4,
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      itemGap: 10,
      textStyle: { color: '#9ca3af', fontSize: 10 },
    },
    series: [{
      type: 'pie',
      radius: ['42%', '65%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0f172a', borderWidth: 2 },
      label: {
        show: true,
        position: 'outside',
        formatter: '{d}%',
        fontSize: 10,
        color: '#d1d5db',
        minAngle: 8,
      },
      labelLine: { lineStyle: { color: '#4b5563' }, length: 6, length2: 4 },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(0,0,0,0.5)' }, scale: true, scaleSize: 5 },
      data: data.map((d) => ({
        name: d.name,
        value: d.value,
        itemStyle: { color: QC_COLOR_MAP[d.name] ?? FALLBACK_COLOR },
      })),
    }],
    graphic: [{
      type: 'text',
      left: 'center',
      top: '40%',
      style: {
        text: `${total}\n건`,
        textAlign: 'center',
        fill: '#e5e7eb',
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 18,
      },
    }],
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicOut' as const,
  };

  return (
    <div className="flex flex-col">
      <h3 className="text-xs font-semibold text-zinc-300 mb-1 px-3 pt-2">
        QC 결과 분포
        {hasData && <span className="ml-2 font-normal text-zinc-500">총 {total}건</span>}
      </h3>
      {!hasData ? (
        <div
          className="mx-3 mb-2 flex items-center justify-center border border-dashed border-zinc-700 rounded text-xs text-zinc-500"
          style={{ height }}
        >
          데이터 없음
        </div>
      ) : (
        <ReactECharts option={option} style={{ height, width: '100%' }} notMerge lazyUpdate />
      )}
    </div>
  );
}
