/**
 * @file src/app/ai-chat/analytics/_components/DailyChart.tsx
 * @description 일별 사용량 + 긍정률 복합 차트 (Bar + Line).
 *
 * 초보자 가이드:
 * - Recharts ComposedChart: X축=날짜, Bar=건수(파랑), Line=긍정률%(초록)
 * - ResponsiveContainer로 반응형 처리
 * - 데이터가 비어있으면 "데이터 없음" 메시지 표시
 */
'use client';

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';

/** 일별 사용량 행 */
export interface DailyRow {
  date: string;
  count: number;
  positive: number;
}

interface Props {
  dailyUsage: DailyRow[] | undefined;
}

/** 차트용 데이터: 긍정률(%) 계산 */
function toDailyData(rows: DailyRow[]) {
  return rows.map((r) => ({
    date: r.date.slice(5), // MM-DD
    count: r.count,
    positiveRate: r.count > 0 ? Math.round((r.positive / r.count) * 100) : 0,
  }));
}

export default function DailyChart({ dailyUsage }: Props) {
  if (!dailyUsage || dailyUsage.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex items-center justify-center h-64">
        <span className="text-gray-400 dark:text-gray-500 text-sm">데이터 없음</span>
      </div>
    );
  }

  const data = toDailyData(dailyUsage);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">일별 사용량</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#f9fafb',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="left" dataKey="count" name="건수" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" dataKey="positiveRate" name="긍정률(%)" stroke="#10b981" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
