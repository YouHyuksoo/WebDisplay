/**
 * @file ProductionKpiCard.tsx
 * @description 라인별 생산현황 전체화면 모니터링 카드 (메뉴 26).
 * 초보자 가이드: 1개 라인의 제품/계획/목표/결과/Diff를 화면 꽉 차게 큰 글씨로 표시한다.
 * 공장 현장 모니터에서 멀리서도 보이도록 설계.
 * 달성률: >= 95% 시안, 90~95% 노랑, < 90% 빨강.
 */
'use client';

/** 라인 KPI 데이터 행 */
export interface ProductionKpiRow {
  LINE_NAME?: string;
  MODEL_NAME?: string;
  PRODUCT_GROUP?: string;
  PLAN_QTY?: number;
  TARGET_QTY?: number;
  OUTPUT_QTY?: number;
  DIFF_QTY?: number;
  ACHIEVEMENT_RATE?: number;
  [key: string]: unknown;
}

interface ProductionKpiCardProps {
  row: ProductionKpiRow;
}

/** 달성률 기반 색상 클래스 반환 */
function getRateColor(rate: number) {
  if (rate >= 95) {
    return {
      border: 'border-cyan-500',
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      headerBg: 'bg-cyan-900/40',
      emoji: ':-)',
    };
  }
  if (rate >= 90) {
    return {
      border: 'border-yellow-500',
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      headerBg: 'bg-yellow-900/40',
      emoji: ':-|',
    };
  }
  return {
    border: 'border-red-500',
    text: 'text-red-500',
    bg: 'bg-red-500/10',
    headerBg: 'bg-red-900/40',
    emoji: ':-(',
  };
}

/** 숫자 천단위 포맷 (소수점 반올림) */
function fmt(val?: number): string {
  if (val == null) return '-';
  return Math.round(val).toLocaleString();
}

/**
 * 라인별 생산현황 전체화면 카드.
 * 화면을 꽉 채우고 큰 글씨로 표시한다.
 */
export default function ProductionKpiCard({ row }: ProductionKpiCardProps) {
  const rate = row.ACHIEVEMENT_RATE ?? 0;
  const diff = row.DIFF_QTY ?? 0;
  const color = getRateColor(rate);

  return (
    <div className={`flex h-full flex-col border-2 ${color.border} bg-zinc-950`}>
      {/* 헤더: 라인명 + 모델 + 제품군 */}
      <div className={`flex items-center justify-between ${color.headerBg} border-b-4 ${color.border} px-10 py-6`}>
        <div className="flex items-center gap-8">
          <span className={`text-8xl font-black ${color.text}`}>
            {row.LINE_NAME ?? '-'}
          </span>
          <span className="text-6xl font-bold text-white">
            {row.MODEL_NAME ?? '-'}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="rounded-xl bg-zinc-800 px-6 py-3 text-4xl font-bold text-zinc-300">
            {row.PRODUCT_GROUP ?? '-'}
          </span>
          <span className="text-7xl">{color.emoji}</span>
        </div>
      </div>

      {/* 데이터 행 — flex-1로 남은 공간 균등 분배 */}
      <div className="flex min-h-0 flex-1 flex-col divide-y-2 divide-zinc-800">
        <KpiRow label="계획수량" value={fmt(row.PLAN_QTY)} />
        <KpiRow label="목표" value={fmt(row.TARGET_QTY)} />
        <KpiRow label="결과" value={fmt(row.OUTPUT_QTY)} valueClass="text-white" />
        {/* Diff + 달성률 */}
        <div className={`flex flex-1 items-center ${color.bg}`}>
          <div className="w-1/3 px-10 text-5xl font-black text-zinc-400">
            Diff
          </div>
          <div className="flex flex-1 items-center justify-end gap-10 px-10">
            <span className={`text-8xl font-black ${diff >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {diff >= 0 ? '+' : ''}{fmt(diff)}
            </span>
            <span className={`rounded-2xl border-4 px-8 py-3 text-8xl font-black ${color.text} ${color.bg} ${color.border}`}>
              {rate}%
            </span>
          </div>
        </div>
      </div>

      {/* 범례 바 */}
      <div className={`flex items-center justify-center gap-10 border-t-4 ${color.border} bg-zinc-900 px-10 py-4 text-2xl text-zinc-500`}>
        <span className="flex items-center gap-2">
          <span className="inline-block h-5 w-5 rounded-full bg-cyan-500" />
          {'>'}= 95%
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-5 w-5 rounded-full bg-yellow-500" />
          90~95%
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-5 w-5 rounded-full bg-red-500" />
          {'<'} 90%
        </span>
      </div>
    </div>
  );
}

/** 전체화면용 데이터 행 */
function KpiRow({
  label,
  value,
  valueClass = 'text-zinc-100',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-1 items-center">
      <div className="w-1/3 px-10 text-5xl font-black text-zinc-400">
        {label}
      </div>
      <div className={`flex-1 px-10 text-right text-8xl font-black ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
