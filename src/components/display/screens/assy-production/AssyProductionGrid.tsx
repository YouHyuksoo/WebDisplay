/**
 * @file AssyProductionGrid.tsx
 * @description 제품생산현황 데이터 테이블. PB DataWindow 컬럼을 React 테이블로 변환.
 * 초보자 가이드: rows 배열을 받아 테이블로 렌더링. 시간대별 생산수량 + 목표/실적/달성률 표시.
 * useGridResizer 훅으로 컬럼 폭 드래그 조정 + localStorage 저장.
 *
 * PB 원본 레이아웃:
 *   - rows_per_detail = 4 (한 줄에 4행씩 카드형 표시)
 *   - 달성률(progress_rate) 큰 폰트, 빨간색 강조
 *   - 시간대 A~J 타임존별 생산수량
 */
'use client';

import { useGridResizer } from '@/hooks/useGridResizer';

export interface AssyProductionRow {
  LINE_NAME: string;
  MODEL_NAME: string | null;
  LOT_SIZE: number;
  A_TIME_ZONE: number;
  B_TIME_ZONE: number;
  C_TIME_ZONE: number;
  D_TIME_ZONE: number;
  E_TIME_ZONE: number;
  F_TIME_ZONE: number;
  G_TIME_ZONE: number;
  H_TIME_ZONE: number;
  I_TIME_ZONE: number;
  J_TIME_ZONE: number;
  RESULT_QTY: number;
  PROGRESS_RATE: number | null;
}

/** 헤더 정의 - PB DataWindow 컬럼 순서 매핑 */
const HEADERS = [
  { label: 'Line', align: 'left' as const },
  { label: 'Model', align: 'left' as const },
  { label: 'A', align: 'right' as const },
  { label: 'B', align: 'right' as const },
  { label: 'C', align: 'right' as const },
  { label: 'D', align: 'right' as const },
  { label: 'E', align: 'right' as const },
  { label: 'F', align: 'right' as const },
  { label: 'G', align: 'right' as const },
  { label: 'H', align: 'right' as const },
  { label: 'I', align: 'right' as const },
  { label: 'J', align: 'right' as const },
  { label: 'Target', align: 'right' as const },
  { label: 'Result', align: 'right' as const },
  { label: 'Rate(%)', align: 'right' as const },
] as const;

/** 초기 폭 (px) - 컬럼 수와 동일하게 */
const INITIAL_WIDTHS = [120, 200, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 110, 110, 100];

/** 행 배경색 - 홀짝 줄무늬 */
function getRowBg(idx: number): string {
  return idx % 2 === 0 ? 'bg-zinc-950 dark:bg-zinc-950' : 'bg-zinc-900/40 dark:bg-zinc-900/40';
}

/** 달성률 텍스트 색상 - PB 원본: 빨간색 강조 */
function getRateColor(rate: number | null): string {
  if (rate == null) return 'text-zinc-400';
  if (rate >= 100) return 'text-emerald-400';
  if (rate >= 80) return 'text-amber-400';
  return 'text-red-400';
}

/** 숫자 포맷 (천 단위 콤마) */
function fmt(val: number | null | undefined): string {
  if (val == null || val === 0) return '-';
  return val.toLocaleString();
}

interface AssyProductionGridProps {
  rows: AssyProductionRow[];
  isLoading: boolean;
  error: unknown;
}

export default function AssyProductionGrid({ rows, isLoading, error }: AssyProductionGridProps) {
  const { widths, handleMouseDown } = useGridResizer('grid-widths-assy-production', INITIAL_WIDTHS);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        데이터 로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
        데이터 로드 실패
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
        조회된 데이터가 없습니다
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
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.map((row, idx) => (
          <div key={idx} className={`flex border-b border-zinc-800 ${getRowBg(idx)}`}>
            {/* Line */}
            <div className="shrink-0 truncate px-3 py-2 text-xl font-bold text-white" style={{ width: widths[0] }}>
              {row.LINE_NAME ?? '-'}
            </div>
            {/* Model */}
            <div className="shrink-0 truncate px-3 py-2 text-lg text-zinc-300" style={{ width: widths[1] }} title={row.MODEL_NAME ?? ''}>
              {row.MODEL_NAME ?? '-'}
            </div>
            {/* A~J Time Zones */}
            {(['A_TIME_ZONE', 'B_TIME_ZONE', 'C_TIME_ZONE', 'D_TIME_ZONE', 'E_TIME_ZONE',
              'F_TIME_ZONE', 'G_TIME_ZONE', 'H_TIME_ZONE', 'I_TIME_ZONE', 'J_TIME_ZONE'] as const).map((key, i) => (
              <div
                key={key}
                className="shrink-0 px-3 py-2 text-right font-mono text-lg font-bold tabular-nums text-zinc-300"
                style={{ width: widths[i + 2] }}
              >
                {fmt(row[key])}
              </div>
            ))}
            {/* Target (목표수량) */}
            <div className="shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums text-cyan-400" style={{ width: widths[12] }}>
              {fmt(row.LOT_SIZE)}
            </div>
            {/* Result (실적수량) */}
            <div className="shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums text-white" style={{ width: widths[13] }}>
              {fmt(row.RESULT_QTY)}
            </div>
            {/* Rate (달성률) */}
            <div className={`shrink-0 px-3 py-2 text-right font-mono text-xl font-bold tabular-nums ${getRateColor(row.PROGRESS_RATE)}`} style={{ width: widths[14] }}>
              {row.PROGRESS_RATE != null ? `${row.PROGRESS_RATE}%` : '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
