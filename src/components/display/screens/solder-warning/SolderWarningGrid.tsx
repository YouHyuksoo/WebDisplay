/**
 * @file SolderWarningGrid.tsx
 * @description Solder Paste Warning List 메인 그리드 테이블.
 * 초보자 가이드: IM_ITEM_SOLDER_MASTER에서 조회한 솔더 페이스트 경고 데이터를 표로 표시.
 *
 * PB 원본 컬럼 순서:
 *   Line Code → Lot No → Item Code → Issue Date → 해동후경과(gap1)
 *   → 교반시간(mix_time) → 해동후경과시간(aftr_unfreezing_time)
 *   → 투입일시(input_date) → 개봉후경과(gap3) → 유효기간(valid_date)
 *
 * 조건부 색상:
 *   valid_date_check ≤ 0 → RED, ≤ 2 → ORANGE
 *   gap3(5자리) > '11:30' → RED, > '10:00' → ORANGE
 *   aftr_unfreezing_time > '23:30' → RED, > '22:00' → ORANGE
 */
'use client';

/** Solder Warning 행 데이터 */
export interface SolderWarningRow {
  LINE_CODE?: string;
  LOT_NO?: string;
  ITEM_CODE?: string;
  ISSUE_DATE?: string;
  GAP1?: string;
  MIX_TIME?: string;
  AFTR_UNFREEZING_TIME?: string;
  INPUT_DATE?: string;
  GAP2?: string;
  GAP3?: string;
  VALID_DATE?: string;
  VALID_DATE_CHECK?: number;
  VISCOSITY_FILE_NAME?: string;
  [key: string]: unknown;
}

interface SolderWarningGridProps {
  rows: SolderWarningRow[];
  isLoading?: boolean;
  error?: string | null;
}

/** 헤더 정의 */
const HEADERS = [
  { key: 'LINE_CODE', label: 'Line', width: 'w-[10%]' },
  { key: 'LOT_NO', label: 'Lot No', width: 'w-[10%]' },
  { key: 'ITEM_CODE', label: 'Item Code', width: 'w-[10%]' },
  { key: 'ISSUE_DATE', label: 'Issue Date', width: 'w-[9%]' },
  { key: 'GAP1', label: '해동후경과', width: 'w-[8%]' },
  { key: 'MIX_TIME', label: '교반시간', width: 'w-[8%]' },
  { key: 'AFTR', label: '해동후경과시간', width: 'w-[9%]' },
  { key: 'INPUT', label: '투입일시', width: 'w-[13%]' },
  { key: 'GAP3', label: '개봉후경과', width: 'w-[8%]' },
  { key: 'VALID', label: '유효기간', width: 'w-[15%]' },
] as const;

/** 날짜를 MM/DD HH:mm 포맷으로 변환 */
function formatDate(val?: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).substring(0, 16);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

/** 날짜를 YYYY-MM-DD 포맷으로 변환 */
function formatValidDate(val?: string): string {
  if (!val) return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val).substring(0, 10);
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** gap3 조건부 배경색: >11:30(5자리) → RED, >10:00 → ORANGE */
function getGap3Style(gap3?: string): string {
  if (!gap3 || gap3.length !== 5) return '';
  if (gap3 > '11:30') return 'bg-red-600 text-white';
  if (gap3 > '10:00') return 'bg-amber-500 text-black';
  return '';
}

/** aftr_unfreezing_time 조건부 배경색: >23:30 → RED, >22:00 → ORANGE */
function getUnfreezingStyle(time?: string): string {
  if (!time) return '';
  if (time > '23:30') return 'bg-red-600 text-white';
  if (time > '22:00') return 'bg-amber-500 text-black';
  return '';
}

/** valid_date_check 조건부 배경색: ≤0 → RED, ≤2 → ORANGE */
function getValidDateStyle(check?: number): string {
  if (check == null) return '';
  if (check <= 0) return 'bg-red-600 text-white';
  if (check <= 2) return 'bg-amber-500 text-black';
  return '';
}

/** Solder Paste Warning 그리드 테이블 */
export default function SolderWarningGrid({ rows, isLoading, error }: SolderWarningGridProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
      {/* 헤더 — 항상 표시 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-emerald-800">
        {HEADERS.map((h) => (
          <div
            key={h.key}
            className={`${h.width} shrink-0 px-2 py-3 text-center text-base font-black text-white`}
          >
            {h.label}
          </div>
        ))}
      </div>

      {/* 상태 메시지 (로딩/에러/빈 데이터) */}
      {isLoading && (
        <div className="flex shrink-0 items-center justify-center py-8 text-xl text-zinc-400">
          데이터 로딩 중...
        </div>
      )}
      {!isLoading && error && (
        <div className="flex shrink-0 flex-col items-center justify-center gap-2 py-8">
          <span className="text-xl text-red-400">데이터 조회 실패</span>
          <span className="text-sm text-zinc-500">{error}</span>
        </div>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <div className="flex shrink-0 items-center justify-center py-8 text-xl text-zinc-500">
          Solder Paste 경고 항목 없음
        </div>
      )}

      {/* 데이터 행 */}
      {rows.length > 0 && (
        <div className="min-h-0 flex-1 overflow-auto">
          {rows.map((row, idx) => {
            const gap3Style = getGap3Style(row.GAP3);
            const unfreezingStyle = getUnfreezingStyle(row.AFTR_UNFREEZING_TIME);
            const validCheck = Number(row.VALID_DATE_CHECK ?? 999);
            const validStyle = getValidDateStyle(validCheck);
            const stripeBg = idx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40';

            return (
              <div
                key={`${row.LOT_NO}-${idx}`}
                className={`flex border-b border-zinc-800 last:border-b-0 ${stripeBg}`}
              >
                {/* Line Code */}
                <div className="w-[10%] shrink-0 truncate px-2 py-2 text-lg font-bold text-white">
                  {row.LINE_CODE ?? '-'}
                </div>
                {/* Lot No */}
                <div className="w-[10%] shrink-0 truncate px-2 py-2 font-mono text-lg font-bold text-zinc-300">
                  {row.LOT_NO ?? '-'}
                </div>
                {/* Item Code */}
                <div className="w-[10%] shrink-0 truncate px-2 py-2 text-lg font-bold text-zinc-300">
                  {row.ITEM_CODE ?? '-'}
                </div>
                {/* Issue Date */}
                <div className="w-[9%] shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300">
                  {formatDate(row.ISSUE_DATE)}
                </div>
                {/* 해동후경과시간 (gap1) */}
                <div className="w-[8%] shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300">
                  {row.GAP1 ?? '-'}
                </div>
                {/* 교반시간 (mix_time) */}
                <div className="w-[8%] shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300">
                  {row.MIX_TIME ?? '-'}
                </div>
                {/* 해동후경과시간 (aftr_unfreezing_time) — 조건부 색상 */}
                <div className={`w-[9%] shrink-0 px-2 py-2 text-center text-lg font-black ${unfreezingStyle || 'text-zinc-300'}`}>
                  {row.AFTR_UNFREEZING_TIME ?? '-'}
                </div>
                {/* 투입일시 (input_date) */}
                <div className="w-[13%] shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300">
                  {formatDate(row.INPUT_DATE)}
                </div>
                {/* 개봉후경과시간 (gap3) — 조건부 색상 */}
                <div className={`w-[8%] shrink-0 px-2 py-2 text-center text-lg font-black ${gap3Style || 'text-zinc-300'}`}>
                  {row.GAP3 ?? '-'}
                </div>
                {/* 유효기간 (valid_date) — 조건부 색상 */}
                <div className={`w-[15%] shrink-0 px-2 py-2 text-center text-lg font-black ${validStyle || 'text-zinc-300'}`}>
                  {formatValidDate(row.VALID_DATE)}
                  {validCheck <= 2 && (
                    <span className="ml-2 text-base">
                      ({validCheck <= 0 ? '만료' : `D-${validCheck}`})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
