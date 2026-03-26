/**
 * @file ChartCard.tsx
 * @description 차트를 감싸는 글래스모피즘 카드 컴포넌트.
 * 초보자 가이드: 모든 차트 패널에 공통으로 사용하는 카드 래퍼.
 * 글로우 보더 + 반투명 배경으로 디스플레이 테마에 맞춘다.
 */
'use client';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm">
      <div className="flex items-baseline gap-2 border-b border-white/5 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        {subtitle && <span className="text-xs text-zinc-400">{subtitle}</span>}
      </div>
      <div className="min-h-0 flex-1 p-3">
        {children}
      </div>
    </div>
  );
}
