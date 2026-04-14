/**
 * @file ProductionKpiCard.tsx
 * @description 라인별 생산현황 전체화면 모니터링 카드 (메뉴 26).
 * 초보자 가이드: 1개 라인의 제품/계획/목표/결과/Diff를 화면 꽉 차게 큰 글씨로 표시한다.
 * 공장 현장 모니터에서 멀리서도 보이도록 설계.
 * 달성률: >= 95% 시안, 90~95% 노랑, < 90% 빨강.
 */
'use client';

import { useTranslations } from 'next-intl';
import { CalendarX2 } from 'lucide-react';
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
  /** 듀얼 모드용 컴팩트 크기. 폰트와 패딩을 줄여 두 카드를 나란히 표시할 수 있다. */
  compact?: boolean;
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
export default function ProductionKpiCard({ row, compact = false }: ProductionKpiCardProps) {
  const t = useTranslations('table');
  const rate = row.ACHIEVEMENT_RATE ?? 0;
  const diff = row.DIFF_QTY ?? 0;
  const color = getKpiRateStyle(rate);

  /* compact 여부에 따라 폰트/패딩 클래스 분기 */
  const sz = compact ? {
    lineText:   'text-8xl',
    modelText:  'text-4xl',
    specText:   'text-2xl',
    runNo:      'text-lg px-2 py-0.5',
    stLabel:    'text-lg',
    stValue:    'text-5xl',
    emoji:      'text-7xl',
    headerPad:  'px-6 py-7 gap-5 border-b-2',
    labelText:  'text-5xl px-6',
    valueText:  'text-7xl px-6',
    diffLabel:  'text-5xl px-6',
    diffValue:  'text-7xl px-6 gap-6',
    legendPad:  'px-6 py-1.5 text-lg gap-6 border-t-2',
    dotSize:    'h-3 w-3',
  } : {
    lineText:   'text-8xl',
    modelText:  'text-4xl',
    specText:   'text-2xl',
    runNo:      'text-xl px-3 py-0.5',
    stLabel:    'text-xl',
    stValue:    'text-4xl',
    emoji:      'text-7xl',
    headerPad:  'px-10 py-10 gap-8 border-b-4',
    labelText:  'text-4xl px-10',
    valueText:  'text-7xl px-10',
    diffLabel:  'text-4xl px-10',
    diffValue:  'text-7xl px-10 gap-10',
    legendPad:  'px-10 py-2 text-xl gap-10 border-t-4',
    dotSize:    'h-5 w-5',
  };

  return (
    <div className="flex h-full flex-col border-2 border-zinc-700 bg-zinc-950">
      {/* 헤더: 라인명 | 모델명 + SPEC(아래) | 이모지 */}
      <div className={`flex items-center bg-zinc-900 border-zinc-700 ${sz.headerPad}`}>
        {/* 라인명 */}
        <span className={`shrink-0 font-black text-blue-300 ${sz.lineText}`}>
          {row.LINE_NAME ?? '-'}
        </span>

        {/* 모델명 + SPEC + RUN_NO 수직 스택 */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={`whitespace-nowrap font-bold text-blue-300 ${sz.modelText}`}>
            {row.MODEL_NAME ?? '-'}
          </span>
          <div className="flex items-center gap-2">
            <span className={`truncate text-zinc-400 ${sz.specText}`}>
              {row.PRODUCT_GROUP ?? '-'}
            </span>
            {row.RUN_NO && (
              <span className={`shrink-0 rounded bg-zinc-700 font-bold text-zinc-300 ${sz.runNo}`}>
                {row.RUN_NO}
              </span>
            )}
          </div>
        </div>

        {/* 이모지 */}
        <span className={`shrink-0 ${sz.emoji}`}>{color.emoji}</span>
      </div>

      {/* 데이터 행 — flex-1로 남은 공간 균등 분배 */}
      <div className="relative flex min-h-0 flex-1 flex-col divide-y-2 divide-zinc-800">
        {/* NO PLAN 오버레이 — 계획수량이 0이거나 없을 때 */}
        {!(row.PLAN_QTY) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm">
            <div className="rounded-2xl border-4 border-emerald-500 bg-zinc-800 px-20 py-14 text-center shadow-2xl flex flex-col items-center gap-5">
              <CalendarX2 className="text-emerald-400" size={96} strokeWidth={1.5} />
              <span className="text-7xl font-black tracking-widest text-emerald-400">NO PLAN</span>
            </div>
          </div>
        )}
        <KpiRow label={t('planQty')} value={fmt(row.PLAN_QTY)} labelClass={sz.labelText} valueClass={`text-zinc-100 ${sz.valueText}`} />
        <KpiRow label={t('targetQty')} value={fmt(row.TARGET_QTY)} labelClass={sz.labelText} valueClass={`text-zinc-100 ${sz.valueText}`}
          prefix={row.ST_QTY != null ? `(${row.ST_QTY}s)` : undefined} />
        <KpiRow label={t('resultQty')} value={fmt(row.OUTPUT_QTY)} labelClass={sz.labelText} valueClass={`text-white ${sz.valueText}`} />
        {/* Diff + 달성률 */}
        <div className={`flex flex-1 items-center ${color.bg}`}>
          <div className={`w-1/3 font-black text-zinc-400 ${sz.diffLabel}`}>
            {t('diff')}
          </div>
          <div className={`flex flex-1 items-center justify-end ${sz.diffValue}`}>
            <span className={`font-black ${color.text}`}>
              {rate}%
            </span>
            <span className={`font-black ${diff >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
              {diff >= 0 ? '+' : ''}{fmt(diff)}
            </span>
          </div>
        </div>
      </div>

      {/* 범례 바 */}
      <div className={`flex items-center justify-center border-zinc-700 bg-zinc-900 text-zinc-500 ${sz.legendPad}`}>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block rounded-full bg-cyan-500 ${sz.dotSize}`} />
          {'>'}= 95%
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block rounded-full bg-yellow-500 ${sz.dotSize}`} />
          90~95%
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`inline-block rounded-full bg-red-500 ${sz.dotSize}`} />
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
  labelClass = 'text-5xl px-10',
  valueClass = 'text-zinc-100 text-8xl px-10',
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
  /** 숫자 앞에 작게 표시할 보조 텍스트 (예: "(34s)") */
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-1 items-center">
      <div className={`w-1/3 font-black text-zinc-400 ${labelClass}`}>
        {label}
      </div>
      <div className="flex flex-1 items-baseline justify-end gap-2">
        {prefix && (
          <span className="shrink-0 text-2xl font-bold text-zinc-500">{prefix}</span>
        )}
        <span className={`font-black ${valueClass}`}>{value}</span>
        {suffix && (
          <span className="text-3xl font-bold text-zinc-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}
