/**
 * @file MslWarningGrid.tsx
 * @description MSL Warning List 메인 그리드 테이블.
 * 초보자 가이드: MSL Level 2A 이상 아이템의 경과/잔여 시간을 그리드로 표시.
 * 색상 로직: msl_used_rate >= 90 → 빨강 번쩍임, 70~90 → 노랑, < 70 → 기본.
 * TV 모니터링용으로 큰 폰트, 다크 UI, 스크롤 없이 꽉 찬 레이아웃.
 */
'use client';

import { useGridResizer } from '@/hooks/useGridResizer';

/** MSL 경고 아이템 행 데이터 */
export interface MslWarningRow {
  LINE_NAME?: string;
  LOCATION_CODE?: string;
  MSL_LEVEL?: string;
  ITEM_CODE?: string;
  LOT_NO?: string;
  MSL_MAX_HOUR?: number;
  MSL_PASSED_HOUR?: number;
  MSL_REMAIN_HOUR?: number;
  MSL_USED_RATE?: number;
  NG_COUNT?: number;
  [key: string]: unknown;
}

interface MslWarningGridProps {
  rows: MslWarningRow[];
}

/** 헤더 정의 */
const HEADERS = [
  { label: 'Line', align: 'left' },
  { label: 'Location', align: 'center' },
  { label: 'MSL Level', align: 'center' },
  { label: 'Item Code', align: 'left' },
  { label: 'Lot No', align: 'left' },
  { label: 'Max(h)', align: 'right' },
  { label: 'Passed(h)', align: 'right' },
  { label: 'Remain(h)', align: 'right' },
] as const;

/** 정렬 클래스 매핑 */
const ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** 시간값 포맷 (소수 2자리) */
function formatHour(val?: number): string {
  if (val == null) return '-';
  return val.toFixed(2);
}

/**
 * msl_used_rate 기반 행 배경/텍스트 색상 반환.
 * PB 원본: >= 90 → RED, 70~90 → YELLOW, < 70 → 기본
 */
function getRowStyle(usedRate: number): string {
  if (usedRate >= 90) return 'bg-red-600/20 dark:bg-red-900/30';
  if (usedRate >= 70) return 'bg-yellow-500/10 dark:bg-yellow-900/20';
  return '';
}

/** Passed Time 셀 전용 색상 */
function getPassedStyle(usedRate: number): string {
  if (usedRate >= 90) return 'bg-red-600 text-white animate-pulse';
  if (usedRate >= 70) return 'bg-yellow-500 text-black dark:bg-yellow-600 dark:text-black';
  return '';
}

/** 초기 폭 설정 (8개 컬럼) */
const INITIAL_WIDTHS = [140, 160, 160, 240, 240, 120, 120, 120];

/** MSL Warning 그리드 테이블 */
export default function MslWarningGrid({ rows }: MslWarningGridProps) {
  const { widths, handleMouseDown } = useGridResizer('grid-widths-msl-warning', INITIAL_WIDTHS);

  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-2xl text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
        MSL 경고 항목 없음
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 dark:border-zinc-700 dark:bg-zinc-950">
      {/* 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-red-800 dark:border-zinc-700 dark:bg-red-900">
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
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.map((row, idx) => {
          const usedRate = Number(row.MSL_USED_RATE ?? 0);
          const ngCount = Number(row.NG_COUNT ?? 0);
          const rowBg = getRowStyle(usedRate);
          const passedBg = getPassedStyle(usedRate);
          const stripeBg = idx % 2 === 0
            ? 'bg-zinc-950 dark:bg-zinc-950'
            : 'bg-zinc-900/40 dark:bg-zinc-900/40';

          return (
            <div
              key={`${row.LOT_NO}-${idx}`}
              className={`flex border-b border-zinc-800 last:border-b-0 ${rowBg || stripeBg}`}
            >
              <div className="shrink-0 truncate px-3 py-2 text-xl font-bold text-white" style={{ width: widths[0] }}>
                {row.LINE_NAME ?? '-'}
              </div>
              <div className="shrink-0 px-3 py-2 text-center text-xl font-bold text-zinc-300" style={{ width: widths[1] }}>
                {row.LOCATION_CODE ?? '-'}
              </div>
              <div className="shrink-0 px-3 py-2 text-center" style={{ width: widths[2] }}>
                <span className="inline-block rounded bg-zinc-700 px-3 py-0.5 text-lg font-black text-white">
                  {row.MSL_LEVEL ?? '-'}
                </span>
              </div>
              <div className="shrink-0 truncate px-3 py-2 text-xl font-bold text-zinc-300" style={{ width: widths[3] }}>
                {row.ITEM_CODE ?? '-'}
              </div>
              <div className="shrink-0 truncate px-3 py-2 font-mono text-xl font-bold text-zinc-300" style={{ width: widths[4] }}>
                {row.LOT_NO ?? '-'}
              </div>
              <div className="shrink-0 px-3 py-2 text-right tabular-nums text-xl font-bold text-zinc-400" style={{ width: widths[5] }}>
                {formatHour(row.MSL_MAX_HOUR)}
                <span className="ml-1 text-base text-zinc-600">h</span>
              </div>
              <div 
                className={`shrink-0 px-3 py-2 text-right tabular-nums text-xl font-black ${passedBg || 'text-zinc-300'}`}
                style={{ width: widths[6] }}
              >
                {formatHour(row.MSL_PASSED_HOUR)}
                <span className="ml-1 text-base">h</span>
                {ngCount > 0 && usedRate >= 90 && (
                  <span className="ml-1 text-lg">!</span>
                )}
              </div>
              <div 
                className={`shrink-0 px-3 py-2 text-right tabular-nums text-xl font-bold ${usedRate >= 90 ? 'text-red-400' : 'text-zinc-300'}`}
                style={{ width: widths[7] }}
              >
                {formatHour(row.MSL_REMAIN_HOUR)}
                <span className="ml-1 text-base text-zinc-600">h</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
