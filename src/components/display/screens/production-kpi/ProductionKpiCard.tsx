/**
 * @file ProductionKpiCard.tsx
 * @description 라인별 생산현황 전체화면 모니터링 카드 (메뉴 26).
 * 초보자 가이드: 1개 라인의 제품/계획/목표/결과/Diff를 화면 꽉 차게 큰 글씨로 표시한다.
 * 공장 현장 모니터에서 멀리서도 보이도록 설계.
 * 달성률: >= 95% 시안, 90~95% 노랑, < 90% 빨강.
 */
'use client';

import { useTranslations } from 'next-intl';
import { getKpiRateStyle } from '../../shared/status-styles';

/** 라인 KPI 데이터 행 */
export interface ProductionKpiRow {
  LINE_NAME?: string;
  RUN_NO?: string;
  MODEL_NAME?: string;
  PRODUCT_GROUP?: string;
  PLAN_QTY?: number;
  TARGET_QTY?: number;
  OUTPUT_QTY?: number;
  DIFF_QTY?: number;
  ACHIEVEMENT_RATE?: number;
  ST_QTY?: number;
  [key: string]: unknown;
}

interface ProductionKpiCardProps {
  row: ProductionKpiRow;
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
  const t = useTranslations('table');
  const rate = row.ACHIEVEMENT_RATE ?? 0;
  const diff = row.DIFF_QTY ?? 0;
  const color = getKpiRateStyle(rate);

  return (
    <div className={`flex h-full flex-col border-2 border-zinc-700 bg-zinc-950`}>
      {/* 헤더: 라인명 | 모델명 + SPEC(아래) | 이모지 */}
      <div className={`flex items-center gap-8 bg-zinc-900 border-b-4 border-zinc-700 px-10 py-5`}>
        {/* 라인명 */}
        <span className="shrink-0 text-8xl font-black text-white">
          {row.LINE_NAME ?? '-'}
        </span>

        {/* 모델명 + SPEC + RUN_NO 수직 스택 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="whitespace-nowrap text-5xl font-bold text-white">
            {row.MODEL_NAME ?? '-'}
          </span>
          <div className="flex items-center gap-4">
            <span className="truncate text-2xl text-zinc-400">
              {row.PRODUCT_GROUP ?? '-'}
            </span>
            {row.RUN_NO && (
              <span className="shrink-0 rounded bg-zinc-700 px-3 py-0.5 text-xl font-bold text-zinc-300">
                {row.RUN_NO}
              </span>
            )}
          </div>
        </div>

        {/* ST 배지 */}
        {row.ST_QTY != null && (
          <div className="shrink-0 flex flex-col items-center gap-1">
            <span className="text-xl font-bold text-zinc-500">ST</span>
            <span className="text-4xl font-black text-zinc-300">{row.ST_QTY}s</span>
          </div>
        )}

        {/* 이모지 */}
        <span className="shrink-0 text-7xl">{color.emoji}</span>
      </div>

      {/* 데이터 행 — flex-1로 남은 공간 균등 분배 */}
      <div className="flex min-h-0 flex-1 flex-col divide-y-2 divide-zinc-800">
        <KpiRow label={t('planQty')} value={fmt(row.PLAN_QTY)} />
        <KpiRow label={t('targetQty')} value={fmt(row.TARGET_QTY)} />
        <KpiRow label={t('resultQty')} value={fmt(row.OUTPUT_QTY)} valueClass="text-white" />
        {/* Diff + 달성률 */}
        <div className={`flex flex-1 items-center ${color.bg}`}>
          <div className="w-1/3 px-10 text-5xl font-black text-zinc-400">
            {t('diff')}
          </div>
          <div className="flex flex-1 items-center justify-end gap-10 px-10">
            <span className={`text-8xl font-black ${color.text}`}>
              {rate}%
            </span>
            <span className={`text-8xl font-black ${diff >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {diff >= 0 ? '+' : ''}{fmt(diff)}
            </span>
          </div>
        </div>
      </div>

      {/* 범례 바 */}
      <div className={`flex items-center justify-center gap-10 border-t-4 border-zinc-700 bg-zinc-900 px-10 py-4 text-2xl text-zinc-500`}>
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
  suffix,
}: {
  label: string;
  value: string;
  valueClass?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-1 items-center">
      <div className="w-1/3 px-10 text-5xl font-black text-zinc-400">
        {label}
      </div>
      <div className={`flex flex-1 items-baseline justify-end gap-4 px-10`}>
        <span className={`text-8xl font-black ${valueClass}`}>{value}</span>
        {suffix && (
          <span className="text-3xl font-bold text-zinc-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}
