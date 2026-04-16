/**
 * @file src/app/ai-chat/analytics/_components/StatsCards.tsx
 * @description AI 챗 분석 대시보드 — 6개 요약 통계 카드.
 *
 * 초보자 가이드:
 * - 총 대화(파랑), 긍정(초록), 부정(빨강), 중립(회색), 긍정률(시안+프로그레스 바), 평균 응답시간(보라)
 * - Props로 stats 객체를 받아 렌더링
 */
'use client';

import { MessageSquareText, ThumbsUp, ThumbsDown, Minus, TrendingUp, Clock } from 'lucide-react';

/** 통계 요약 객체 */
export interface StatsData {
  totalFeedbacks: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRate: number;
  avgTotalMs: number;
  avgSqlGenMs: number;
  avgSqlExecMs: number;
  avgAnalysisMs: number;
}

interface Props {
  stats: StatsData | undefined;
}

/** 단일 카드 */
function Card({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className={`${color}`}>{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {sub && <div>{sub}</div>}
    </div>
  );
}

export default function StatsCards({ stats }: Props) {
  if (!stats) return null;

  const ratePercent = Math.min(100, Math.max(0, stats.positiveRate));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card
        icon={<MessageSquareText size={18} />}
        label="총 대화"
        value={stats.totalFeedbacks.toLocaleString()}
        color="text-blue-500"
      />
      <Card
        icon={<ThumbsUp size={18} />}
        label="긍정"
        value={stats.positive.toLocaleString()}
        color="text-green-500"
      />
      <Card
        icon={<ThumbsDown size={18} />}
        label="부정"
        value={stats.negative.toLocaleString()}
        color="text-red-500"
      />
      <Card
        icon={<Minus size={18} />}
        label="중립"
        value={stats.neutral.toLocaleString()}
        color="text-gray-400"
      />
      <Card
        icon={<TrendingUp size={18} />}
        label="긍정률"
        value={`${ratePercent.toFixed(1)}%`}
        color="text-cyan-500"
        sub={
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${ratePercent}%` }}
            />
          </div>
        }
      />
      <Card
        icon={<Clock size={18} />}
        label="평균 응답시간"
        value={`${(stats.avgTotalMs / 1000).toFixed(1)}s`}
        color="text-purple-500"
      />
    </div>
  );
}
