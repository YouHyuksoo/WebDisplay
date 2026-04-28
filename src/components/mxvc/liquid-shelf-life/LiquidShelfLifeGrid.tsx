/**
 * @file LiquidShelfLifeGrid.tsx
 * @description 액형자재 유효기간 모니터링 — 메인 그리드 (MSL Warning 패턴 차용)
 *
 * 초보자 가이드:
 * 1. 컬럼 8개: 품목 / 품명 / LOT / 입고 / 제조 / Life / 잔여 / 재고
 * 2. 임계 색상: <0 만료(빨강+EXPIRED 라벨), ≤7 빨강, ≤30 노랑, 그 외 정상
 * 3. useGridResizer 로 컬럼 폭 조정 + localStorage 저장
 * 4. useGridPaging 으로 자동 페이지 롤링 (scrollSeconds 단위)
 */
'use client';

import { useGridResizer } from '@/hooks/useGridResizer';
import { useGridPaging } from '@/hooks/useGridPaging';
import PageIndicator from '@/components/display/shared/PageIndicator';
import type { LiquidShelfLifeRow } from '@/types/mxvc/liquid-shelf-life';
import { SHELF_LIFE_THRESHOLD } from '@/types/mxvc/liquid-shelf-life';

interface Props {
  rows: LiquidShelfLifeRow[];
  scrollSeconds?: number;
}

const HEADERS = [
  { label: 'Item Code',  align: 'left'  },
  { label: 'Item Name',  align: 'left'  },
  { label: 'LOT',        align: 'left'  },
  { label: 'Receipt',    align: 'center'},
  { label: 'Mfg Date',   align: 'center'},
  { label: 'Life Cycle', align: 'right' },
  { label: 'Remaining',  align: 'right' },
  { label: 'Qty',        align: 'right' },
] as const;

const ALIGN: Record<string, string> = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
};

const INITIAL_WIDTHS = [160, 360, 160, 130, 130, 110, 150, 110];

/** 잔여일자에 따른 행 배경 / 텍스트 색상 결정 */
function getRowStyle(remaining: number): { rowBg: string; remainCls: string; isExpired: boolean } {
  if (remaining < SHELF_LIFE_THRESHOLD.EXPIRED) {
    return {
      rowBg: 'bg-red-900/40 dark:bg-red-900/40 animate-pulse',
      remainCls: 'text-red-300',
      isExpired: true,
    };
  }
  if (remaining <= SHELF_LIFE_THRESHOLD.CRITICAL) {
    return {
      rowBg: 'bg-red-900/20 dark:bg-red-900/20',
      remainCls: 'text-red-400',
      isExpired: false,
    };
  }
  if (remaining <= SHELF_LIFE_THRESHOLD.WARNING) {
    return {
      rowBg: 'bg-yellow-900/20 dark:bg-yellow-900/20',
      remainCls: 'text-yellow-300',
      isExpired: false,
    };
  }
  return { rowBg: '', remainCls: 'text-emerald-300', isExpired: false };
}

export default function LiquidShelfLifeGrid({ rows, scrollSeconds = 5 }: Props) {
  const { widths, handleMouseDown } = useGridResizer('grid-widths-mxvc-liquid-shelf-life', INITIAL_WIDTHS);
  const { bodyRef, startIndex, endIndex, page, totalPages } = useGridPaging({ totalRows: rows.length, scrollSeconds });

  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-2xl text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
        조회된 액형자재 재고가 없습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 dark:border-zinc-700 dark:bg-zinc-950">
      {/* 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-amber-800 dark:border-zinc-700 dark:bg-amber-900">
        {HEADERS.map((h, i) => (
          <div
            key={h.label}
            className={`relative shrink-0 px-3 py-3 text-lg font-black text-white ${ALIGN[h.align]}`}
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
          const { rowBg, remainCls, isExpired } = getRowStyle(row.REMAINING_DAYS);
          const stripeBg = globalIdx % 2 === 0
            ? 'bg-zinc-950 dark:bg-zinc-950'
            : 'bg-zinc-900/40 dark:bg-zinc-900/40';

          return (
            <div
              key={`${row.ITEM_CODE}-${row.LOT}-${globalIdx}`}
              className={`flex border-b border-zinc-800 last:border-b-0 ${rowBg || stripeBg}`}
            >
              <div className="shrink-0 truncate px-3 py-2 font-mono text-xl font-bold text-white" style={{ width: widths[0] }}>
                {row.ITEM_CODE}
              </div>
              <div className="shrink-0 truncate px-3 py-2 text-xl font-bold text-zinc-200" style={{ width: widths[1] }}>
                {row.ITEM_NAME || '-'}
              </div>
              <div className="shrink-0 truncate px-3 py-2 font-mono text-xl font-bold text-zinc-300" style={{ width: widths[2] }}>
                {row.LOT || '-'}
              </div>
              <div className="shrink-0 px-3 py-2 text-center text-xl font-bold text-zinc-300" style={{ width: widths[3] }}>
                {row.RECEIPT_DATE ?? '-'}
              </div>
              <div className="shrink-0 px-3 py-2 text-center text-xl font-bold text-zinc-300" style={{ width: widths[4] }}>
                {row.MANUFACTURE_DATE ?? '-'}
              </div>
              <div className="shrink-0 px-3 py-2 text-right tabular-nums text-xl font-bold text-zinc-400" style={{ width: widths[5] }}>
                {row.LIFE_CYCLE}
                <span className="ml-1 text-base text-zinc-600">d</span>
              </div>
              <div
                className={`shrink-0 px-3 py-2 text-right tabular-nums text-xl font-black ${remainCls}`}
                style={{ width: widths[6] }}
              >
                {isExpired ? (
                  <span className="rounded bg-red-700 px-2 py-0.5 text-base text-white">EXPIRED</span>
                ) : (
                  <>
                    {row.REMAINING_DAYS}
                    <span className="ml-1 text-base text-zinc-600">d</span>
                  </>
                )}
              </div>
              <div className="shrink-0 px-3 py-2 text-right tabular-nums text-xl font-bold text-zinc-300" style={{ width: widths[7] }}>
                {row.INVENTORY_QTY.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <PageIndicator page={page} totalPages={totalPages} activeColor="bg-amber-400" />
    </div>
  );
}
