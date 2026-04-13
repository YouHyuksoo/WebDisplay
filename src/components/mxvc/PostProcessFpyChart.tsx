/**
 * @file src/components/mxvc/PostProcessFpyChart.tsx
 * @description 검사공정 5개 테이블 직행율 통합 LineChart
 * 초보자 가이드:
 * - API에서 받은 테이블별 시간대 데이터를 { hour, LOG_ICT, LOG_EOL, ... } 형태로 피벗
 * - recharts LineChart로 5개 라인을 하나의 차트에 표시
 * - 녹색 점선(95%) / 노란 점선(90%) 기준선 표시
 */
'use client';

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PostProcessFpyRow } from '@/types/mxvc/post-process';
import { POST_PROCESS_TABLES, POST_PROCESS_TABLE_LABELS } from '@/lib/queries/post-process';

/** 테이블별 차트 색상 */
const LINE_COLORS: Record<string, string> = {
  LOG_ICT:      '#3b82f6',
  LOG_EOL:      '#10b981',
  LOG_COATING1: '#f59e0b',
  LOG_COATING2: '#ef4444',
  LOG_DOWNLOAD: '#a855f7',
};

interface Props {
  fpyChart: Record<string, PostProcessFpyRow[]>;
  height?: number;
}

/**
 * 테이블별 시간대 배열 → { hour, LOG_ICT: 95.0, LOG_EOL: 88.0, ... } 형태로 피벗.
 * recharts는 단일 배열 형태의 데이터를 요구하므로 변환이 필요하다.
 */
function pivotData(fpyChart: Record<string, PostProcessFpyRow[]>): Record<string, number | string>[] {
  const hourSet = new Set<string>();
  Object.values(fpyChart).forEach((rows) => rows.forEach((r) => hourSet.add(r.hour)));
  const hours = Array.from(hourSet).sort();

  return hours.map((h) => {
    const row: Record<string, number | string> = { hour: `${h}시` };
    POST_PROCESS_TABLES.forEach((k) => {
      const found = (fpyChart[k] ?? []).find((r) => r.hour === h);
      row[k] = found != null ? found.yield : (null as unknown as number);
    });
    return row;
  });
}

export default function PostProcessFpyChart({ fpyChart, height = 260 }: Props) {
  const data    = pivotData(fpyChart);
  const isEmpty = data.length === 0;

  return (
    <div className="px-6 pb-4 shrink-0">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">
        검사공정 직행율 &nbsp;
        <span className="font-normal text-gray-400 dark:text-gray-500">
          ICT · EOL · COATING 1·2 · DOWNLOAD
        </span>
      </h3>
      {isEmpty ? (
        <div className="flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-400 dark:text-gray-500"
          style={{ height }}>
          데이터 없음
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 20, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} width={42} />
            <Tooltip
              formatter={(v: number | undefined) => (v != null ? `${v.toFixed(1)}%` : '-')}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 6 }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#e5e7eb' }}
            />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={95} stroke="#4ade80" strokeDasharray="4 2" strokeWidth={1} label={{ value: '95%', fill: '#4ade80', fontSize: 10 }} />
            <ReferenceLine y={90} stroke="#facc15" strokeDasharray="4 2" strokeWidth={1} label={{ value: '90%', fill: '#facc15', fontSize: 10 }} />
            {POST_PROCESS_TABLES.map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={POST_PROCESS_TABLE_LABELS[k]}
                stroke={LINE_COLORS[k]}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
