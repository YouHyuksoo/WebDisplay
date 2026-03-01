/**
 * @file MslWarningIssueGrid.tsx
 * @description MSL Warning List 출고기준 그리드 테이블.
 * 초보자 가이드: 출고 기준 MSL Level 2A 이상 아이템의 경과/잔여 시간을 그리드로 표시.
 * 장착기준(MslWarningGrid)과 컬럼 구성이 다름: Item Name, Feeding Date 추가, Location Code 없음.
 * 색상 로직: msl_passed_rate >= 90 → 빨강 번쩍임, 70~90 → 노랑, < 70 → 기본.
 */
'use client';

/** MSL 출고기준 경고 아이템 행 데이터 */
export interface MslWarningIssueRow {
  LINE_NAME?: string;
  ITEM_CODE?: string;
  ITEM_NAME?: string;
  LOT_NO?: string;
  FEEDING_DATE?: string;
  MSL_LEVEL?: string;
  MSL_MAX_HOUR?: number;
  MSL_PASSED_HOUR?: number;
  MSL_REMAIN_HOUR?: number;
  MSL_PASSED_RATE?: number;
  [key: string]: unknown;
}

interface MslWarningIssueGridProps {
  rows: MslWarningIssueRow[];
}

const HEADERS = [
  { label: 'Line', key: 'line', align: 'left' },
  { label: 'MSL Level', key: 'level', align: 'center' },
  { label: 'Item Code', key: 'item', align: 'left' },
  { label: 'Item Name', key: 'name', align: 'left' },
  { label: 'Lot No', key: 'lot', align: 'left' },
  { label: 'Feeding Date', key: 'feed', align: 'center' },
  { label: 'Max(h)', key: 'max', align: 'right' },
  { label: 'Passed(h)', key: 'passed', align: 'right' },
  { label: 'Remain(h)', key: 'remain', align: 'right' },
] as const;

const ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function formatHour(val?: number): string {
  if (val == null) return '-';
  return val.toFixed(2);
}

function formatDate(val?: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleString('ko-KR', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function getRowStyle(rate: number): string {
  if (rate >= 90) return 'bg-red-600/20 dark:bg-red-900/30';
  if (rate >= 70) return 'bg-yellow-500/10 dark:bg-yellow-900/20';
  return '';
}

function getPassedStyle(rate: number): string {
  if (rate >= 90) return 'bg-red-600 text-white animate-pulse';
  if (rate >= 70) return 'bg-yellow-500 text-black dark:bg-yellow-600 dark:text-black';
  return '';
}

export default function MslWarningIssueGrid({ rows }: MslWarningIssueGridProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-2xl text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-500">
        MSL 경고 항목 없음 (출고기준)
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 dark:border-zinc-700 dark:bg-zinc-950">
      {/* 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-red-800 dark:border-zinc-700 dark:bg-red-900">
        {HEADERS.map((h) => (
          <div
            key={h.key}
            className={`flex-1 px-3 py-3 text-lg font-black text-white ${ALIGN[h.align]}`}
          >
            {h.label}
          </div>
        ))}
      </div>

      {/* 데이터 행 */}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.map((row, idx) => {
          const rate = Number(row.MSL_PASSED_RATE ?? 0);
          const rowBg = getRowStyle(rate);
          const passedBg = getPassedStyle(rate);
          const stripeBg = idx % 2 === 0
            ? 'bg-zinc-950 dark:bg-zinc-950'
            : 'bg-zinc-900/40 dark:bg-zinc-900/40';

          return (
            <div
              key={`${row.LOT_NO}-${idx}`}
              className={`flex border-b border-zinc-800 last:border-b-0 ${rowBg || stripeBg}`}
            >
              <div className="flex-1 truncate px-3 py-2 text-xl font-bold text-white">
                {row.LINE_NAME ?? '-'}
              </div>
              <div className="flex-1 px-3 py-2 text-center">
                <span className="inline-block rounded bg-zinc-700 px-3 py-0.5 text-lg font-black text-white">
                  {row.MSL_LEVEL ?? '-'}
                </span>
              </div>
              <div className="flex-1 truncate px-3 py-2 text-xl font-bold text-zinc-300">
                {row.ITEM_CODE ?? '-'}
              </div>
              <div className="flex-1 truncate px-3 py-2 text-xl font-bold text-zinc-300">
                {row.ITEM_NAME ?? '-'}
              </div>
              <div className="flex-1 truncate px-3 py-2 font-mono text-xl font-bold text-zinc-300">
                {row.LOT_NO ?? '-'}
              </div>
              <div className="flex-1 px-3 py-2 text-center text-xl font-bold text-zinc-400">
                {formatDate(row.FEEDING_DATE)}
              </div>
              <div className="flex-1 px-3 py-2 text-right tabular-nums text-xl font-bold text-zinc-400">
                {formatHour(row.MSL_MAX_HOUR)}
                <span className="ml-1 text-base text-zinc-600">h</span>
              </div>
              <div className={`flex-1 px-3 py-2 text-right tabular-nums text-xl font-black ${passedBg || 'text-zinc-300'}`}>
                {formatHour(row.MSL_PASSED_HOUR)}
                <span className="ml-1 text-base">h</span>
              </div>
              <div className={`flex-1 px-3 py-2 text-right tabular-nums text-xl font-bold ${rate >= 90 ? 'text-red-400' : 'text-zinc-300'}`}>
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
