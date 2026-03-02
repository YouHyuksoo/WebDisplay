/**
 * @file SolderWarningGrid.tsx
 * @description Solder Paste Warning List 메인 그리드 테이블.
 * 초보자 가이드: IM_ITEM_SOLDER_MASTER에서 조회한 솔더 페이스트 경고 데이터를 표로 표시.
 * 컨테이너 높이를 측정하여 페이지당 행 수를 자동 계산하고, scrollSeconds 간격으로 자동 순환한다.
 * 스크롤바 없이 화면에 꽉 차는 모니터링용 그리드.
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

import { useGridResizer } from '@/hooks/useGridResizer';
import { useGridPaging } from '@/hooks/useGridPaging';
import PageIndicator from '../../shared/PageIndicator';
import { getSolderGap3Style, getSolderUnfreezingStyle, getSolderValidDateStyle } from '../../shared/status-styles';
import type { SolderThresholdConfig } from '@/types/option';

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
  /** 자동 페이지 순환 간격(초). 0이면 순환 안 함. */
  scrollSeconds?: number;
  /** Solder 경고 임계값 설정. 미지정 시 기본값 사용. */
  thresholds?: SolderThresholdConfig;
}

/** 헤더 정의 */
const HEADERS = [
  { key: 'LINE_CODE', label: 'Line', align: 'left' as const },
  { key: 'LOT_NO', label: 'Lot No', align: 'left' as const },
  { key: 'ITEM_CODE', label: 'Item Code', align: 'left' as const },
  { key: 'ISSUE_DATE', label: 'Issue Date', align: 'center' as const },
  { key: 'GAP1', label: '해동후경과', align: 'center' as const },
  { key: 'MIX_TIME', label: '교반시간', align: 'center' as const },
  { key: 'AFTR', label: '해동후경과시간', align: 'center' as const },
  { key: 'INPUT', label: '투입일시', align: 'center' as const },
  { key: 'GAP3', label: '개봉후경과', align: 'center' as const },
  { key: 'VALID', label: '유효기간', align: 'center' as const },
] as const;

/** 초기 컬럼 폭 (px) */
const INITIAL_WIDTHS = [120, 130, 140, 130, 110, 110, 130, 170, 110, 190];

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

/** Solder Paste Warning 그리드 테이블 */
export default function SolderWarningGrid({ rows, isLoading, error, scrollSeconds = 5, thresholds }: SolderWarningGridProps) {
  const { widths, handleMouseDown } = useGridResizer('grid-widths-solder-warning', INITIAL_WIDTHS);
  const { bodyRef, startIndex, endIndex, page, totalPages } = useGridPaging({ totalRows: rows.length, scrollSeconds });

  const pageRows = rows.slice(startIndex, endIndex);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
      {/* 헤더 */}
      <div className="flex shrink-0 border-b border-zinc-700 bg-emerald-800">
        {HEADERS.map((h, i) => (
          <div
            key={h.key}
            className={`relative shrink-0 px-2 py-3 text-base font-black text-white ${
              (h.align as string) === 'left' ? 'text-left' : (h.align as string) === 'right' ? 'text-right' : 'text-center'
            }`}
            style={{ width: widths[i] }}
          >
            {h.label}
            <div className="resize-handle" onMouseDown={(e) => handleMouseDown(i, e)} />
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

      {/* 데이터 행 — overflow-hidden으로 스크롤바 제거 */}
      {rows.length > 0 && (
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
          {pageRows.map((row, idx) => {
            const globalIdx = startIndex + idx;
            const gap3Style = getSolderGap3Style(row.GAP3, thresholds);
            const unfreezingStyle = getSolderUnfreezingStyle(row.AFTR_UNFREEZING_TIME, thresholds);
            const validCheck = Number(row.VALID_DATE_CHECK ?? 999);
            const validStyle = getSolderValidDateStyle(validCheck, thresholds);
            const stripeBg = globalIdx % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900/40';

            return (
              <div
                key={`${row.LOT_NO}-${globalIdx}`}
                className={`flex border-b border-zinc-800 last:border-b-0 ${stripeBg}`}
              >
                <div className="shrink-0 truncate px-2 py-2 text-lg font-bold text-white" style={{ width: widths[0] }}>
                  {row.LINE_CODE ?? '-'}
                </div>
                <div className="shrink-0 truncate px-2 py-2 font-mono text-lg font-bold text-zinc-300" style={{ width: widths[1] }}>
                  {row.LOT_NO ?? '-'}
                </div>
                <div className="shrink-0 truncate px-2 py-2 text-lg font-bold text-zinc-300" style={{ width: widths[2] }}>
                  {row.ITEM_CODE ?? '-'}
                </div>
                <div className="shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300" style={{ width: widths[3] }}>
                  {formatDate(row.ISSUE_DATE)}
                </div>
                <div className="shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300" style={{ width: widths[4] }}>
                  {row.GAP1 ?? '-'}
                </div>
                <div className="shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300" style={{ width: widths[5] }}>
                  {row.MIX_TIME ?? '-'}
                </div>
                <div className={`shrink-0 px-2 py-2 text-center text-lg font-black ${unfreezingStyle || 'text-zinc-300'}`} style={{ width: widths[6] }}>
                  {row.AFTR_UNFREEZING_TIME ?? '-'}
                </div>
                <div className="shrink-0 px-2 py-2 text-center text-lg font-bold text-zinc-300" style={{ width: widths[7] }}>
                  {formatDate(row.INPUT_DATE)}
                </div>
                <div className={`shrink-0 px-2 py-2 text-center text-lg font-black ${gap3Style || 'text-zinc-300'}`} style={{ width: widths[8] }}>
                  {row.GAP3 ?? '-'}
                </div>
                <div className={`shrink-0 px-2 py-2 text-center text-lg font-black ${validStyle || 'text-zinc-300'}`} style={{ width: widths[9] }}>
                  {formatValidDate(row.VALID_DATE)}
                  {validCheck <= (thresholds?.validWarning ?? 2) && (
                    <span className="ml-2 text-base">
                      ({validCheck <= (thresholds?.validExpired ?? 0) ? '만료' : `D-${validCheck}`})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PageIndicator page={page} totalPages={totalPages} activeColor="bg-emerald-400" />
    </div>
  );
}
