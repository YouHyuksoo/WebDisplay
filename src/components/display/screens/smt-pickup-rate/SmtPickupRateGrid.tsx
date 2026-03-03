/**
 * @file SmtPickupRateGrid.tsx
 * @description SMT 픽업률현황 공통 데이터 테이블. BASE/HEAD 양쪽에서 공유하는 제네릭 그리드.
 * 초보자 가이드: rows 배열을 받아 테이블로 렌더링. 상태별 색상 표시.
 * useGridResizer 훅으로 컬럼 폭 드래그 조정 + localStorage 저장.
 * storageKey prop으로 BASE/HEAD 각각의 컬럼 폭을 독립 저장한다.
 *
 * PB 원본 색상 로직:
 *   - ITEM_WARNING_SIGN='S' → 빨간 배경 (NG 위치 존재)
 *   - 그 외 → 홀짝 줄무늬
 */
'use client';

import { useTranslations } from 'next-intl';
import { useGridResizer } from '@/hooks/useGridResizer';
import { useGridPaging } from '@/hooks/useGridPaging';
import PageIndicator from '../../shared/PageIndicator';
import { fmtNum } from '@/lib/display-helpers';

/** 픽업률 데이터 행 타입 (BASE/HEAD 공통) */
export interface PickupRateRow {
  LINE_NAME: string;
  T_CNT: number;
  M_CNT: number;
  R_CNT: number;
  GOOD_RATE: string | number | null;
  PPM: string | number | null;
  NG_POSITION: string | null;
  LINE_WARNING_SIGN: string | null;
  ITEM_WARNING_SIGN: string | null;
}

/** 헤더 정의 - PB DataWindow 컬럼 순서 매핑 */
const HEADERS = [
  { label: 'Line Name', align: 'left' as const },
  { label: 'Takeup Count', align: 'right' as const },
  { label: 'Miss Count', align: 'right' as const },
  { label: 'Realize Count', align: 'right' as const },
  { label: 'Pickup Rate(%)', align: 'right' as const },
  { label: 'PPM', align: 'right' as const },
  { label: 'NG Position', align: 'left' as const },
] as const;

/** 초기 폭 (px) - 컬럼 수와 동일하게 */
const INITIAL_WIDTHS = [140, 160, 140, 160, 160, 140, 560];

/** 행 배경색 - PB 원본의 조건부 색상 포팅 */
function getRowBg(row: PickupRateRow, idx: number): string {
  if (row.ITEM_WARNING_SIGN === 'S') {
    return 'bg-red-600/30 dark:bg-red-900/40';
  }
  return idx % 2 === 0 ? 'bg-zinc-950 dark:bg-zinc-950' : 'bg-zinc-900/40 dark:bg-zinc-900/40';
}

/** Pickup Rate 텍스트 색상 - 경고 등급별 */
function getRateColor(sign: string | null): string {
  if (sign === 'S') return 'text-red-400';
  if (sign === 'W') return 'text-amber-400';
  return 'text-emerald-400';
}

interface SmtPickupRateGridProps {
  /** 픽업률 데이터 행 배열 */
  rows: PickupRateRow[];
  /** 데이터 로딩 중 여부 */
  isLoading: boolean;
  /** 에러 객체 (있을 경우 에러 메시지 표시) */
  error: unknown;
  /** localStorage에 컬럼 폭을 저장할 키 (예: 'grid-widths-smt-pickup-base') */
  storageKey: string;
  /** 자동 페이지 순환 간격(초) */
  scrollSeconds?: number;
}

export default function SmtPickupRateGrid({ rows, isLoading, error, storageKey, scrollSeconds = 5 }: SmtPickupRateGridProps) {
  const t = useTranslations('display');
  const { widths, handleMouseDown } = useGridResizer(storageKey, INITIAL_WIDTHS);
  const { bodyRef, startIndex, endIndex, page, totalPages } = useGridPaging({ totalRows: rows.length, scrollSeconds });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
        {t('loadError')}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
      {/* 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-zinc-800">
        {HEADERS.map((h, i) => (
          <div
            key={h.label}
            className={`relative shrink-0 px-3 py-3 text-lg font-black text-white ${
              h.align === 'right' ? 'text-right' : 'text-left'
            }`}
            style={{ width: widths[i] }}
          >
            {h.label}
            <div className="resize-handle" onMouseDown={(e) => handleMouseDown(i, e)} />
          </div>
        ))}
      </div>

      {/* 데이터 행 */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
        {rows.slice(startIndex, endIndex).map((row, idx) => {
          const globalIdx = startIndex + idx;
          return (
          <div key={globalIdx} className={`flex border-b border-zinc-800 ${getRowBg(row, globalIdx)}`}>
            {/* Line Name */}
            <div
              className="shrink-0 truncate px-3 py-2 text-xl font-bold text-white"
              style={{ width: widths[0] }}
            >
              {row.LINE_NAME ?? '-'}
            </div>
            {/* Takeup Count */}
            <div
              className="shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums text-white"
              style={{ width: widths[1] }}
            >
              {fmtNum(row.T_CNT)}
            </div>
            {/* Miss Count */}
            <div
              className="shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums text-white"
              style={{ width: widths[2] }}
            >
              {fmtNum(row.M_CNT)}
            </div>
            {/* Realize Count */}
            <div
              className="shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums text-white"
              style={{ width: widths[3] }}
            >
              {fmtNum(row.R_CNT)}
            </div>
            {/* Pickup Rate(%) */}
            <div
              className={`shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums ${getRateColor(row.LINE_WARNING_SIGN)}`}
              style={{ width: widths[4] }}
            >
              {row.GOOD_RATE ?? '-'}
            </div>
            {/* PPM */}
            <div
              className="shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums text-white"
              style={{ width: widths[5] }}
            >
              {row.PPM ?? '-'}
            </div>
            {/* NG Position */}
            <div
              className="shrink-0 truncate px-3 py-2 text-sm text-zinc-300"
              style={{ width: widths[6] }}
              title={row.NG_POSITION ?? ''}
            >
              {row.NG_POSITION ?? '-'}
            </div>
          </div>
          );
        })}
      </div>

      <PageIndicator page={page} totalPages={totalPages} />
    </div>
  );
}
