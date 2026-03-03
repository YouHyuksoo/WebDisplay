/**
 * @file FoolproofCard.tsx
 * @description 종합F/P현황 라인별 카드 컴포넌트.
 * 초보자 가이드: 한 라인의 10개 점검 항목을 카드 형태로 표시.
 * OK=초록, NG=빨강+깜빡임, 미등록=회색. 카드 테두리로 라인 전체 상태를 한눈에 파악.
 *
 * PB 원본 색상 로직:
 *   - OK → 초록 배경(rgb(0,255,0))
 *   - NG → 빨간 배경(rgb(255,0,0)) + 노란 텍스트
 *   - '-' → 회색(rgb(190,190,190))
 */
'use client';

import { useTranslations } from 'next-intl';
import { getCheckBadgeClass } from '../../shared/status-styles';

/** 라인 1건의 점검 데이터 */
export interface FoolproofRow {
  LINE_NAME?: string;
  LINE_CODE?: string;
  MASK_CHECK?: string;
  MASK_CHECK_DATE?: string;
  SQUEEZE_CHECK?: string;
  SQUEEZE_CHECK_DATE?: string;
  SOLDER_CHECK?: string;
  SOLDER_CHECK_VAL?: string;
  SOLDER_CHECK_HOUR?: string;
  CCS_CHECK?: string;
  CCS_CHECK_DATE?: string;
  XRAY_CHECK?: string;
  XRAY_CHECK_DATE?: string;
  FULL_CHECK?: string;
  FULL_CHECK_DATE?: string;
  SPEC_CHECK?: string;
  SPEC_CHECK_DATE?: string;
  AOI_SAMPLE_CHECK?: string;
  AOI_SAMPLE_CHECK_DATE?: string;
  LV_SAMPLE_CHECK?: string;
  LV_SAMPLE_CHECK_DATE?: string;
  TILT_SAMPLE_CHECK?: string;
  TILT_SAMPLE_CHECK_DATE?: string;
  [key: string]: unknown;
}

/** 점검 항목 정의 — PB DataWindow 컬럼 순서 매핑 */
const CHECK_ITEMS = [
  { labelKey: 'metalMask' as const, statusKey: 'MASK_CHECK', dateKey: 'MASK_CHECK_DATE' },
  { labelKey: 'squeegee' as const, statusKey: 'SQUEEZE_CHECK', dateKey: 'SQUEEZE_CHECK_DATE' },
  { labelKey: 'solderEpoxy' as const, statusKey: 'SOLDER_CHECK', dateKey: 'SOLDER_CHECK_VAL' },
  { labelKey: 'firstCheck' as const, statusKey: 'CCS_CHECK', dateKey: 'CCS_CHECK_DATE' },
  { labelKey: 'fullCheck' as const, statusKey: 'FULL_CHECK', dateKey: 'FULL_CHECK_DATE' },
  { labelKey: 'masterCheck' as const, statusKey: 'XRAY_CHECK', dateKey: 'XRAY_CHECK_DATE' },
  { labelKey: 'profileInsp' as const, statusKey: 'SPEC_CHECK', dateKey: 'SPEC_CHECK_DATE' },
  { labelKey: 'aoiSample' as const, statusKey: 'AOI_SAMPLE_CHECK', dateKey: 'AOI_SAMPLE_CHECK_DATE' },
] as const;

/** 라인에 NG 항목이 하나라도 있는지 판별 */
function hasNg(row: FoolproofRow): boolean {
  return CHECK_ITEMS.some((item) => row[item.statusKey] === 'NG');
}

interface FoolproofCardProps {
  row: FoolproofRow;
}

export default function FoolproofCard({ row }: FoolproofCardProps) {
  const tCheck = useTranslations('checkItem');
  const lineName = String(row.LINE_NAME ?? row.LINE_CODE ?? '-');
  const ng = hasNg(row);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 bg-zinc-900 dark:bg-zinc-900 ${
        ng ? 'border-red-500' : 'border-emerald-600/50'
      }`}
    >
      {/* 카드 헤더 — 라인명 */}
      <div
        className={`px-4 py-2 text-center text-xl font-black ${
          ng
            ? 'bg-red-600 text-white animate-pulse'
            : 'bg-emerald-700 text-white'
        }`}
      >
        {lineName}
      </div>

      {/* 점검 항목 리스트 */}
      <div className="flex-1 divide-y divide-zinc-700/50">
        {CHECK_ITEMS.map((item, idx) => {
          const status = String(row[item.statusKey] ?? '');
          const dateVal = String(row[item.dateKey] ?? '');
          const isActive = status !== '';

          return (
            <div
              key={item.statusKey}
              className={`flex items-center gap-3 px-4 py-2 ${
                idx % 2 === 0 ? 'bg-zinc-900 dark:bg-zinc-900' : 'bg-zinc-800/50 dark:bg-zinc-800/50'
              }`}
            >
              {/* 항목명 */}
              <span className="w-28 shrink-0 truncate text-sm font-bold text-white">
                {tCheck(item.labelKey)}
              </span>

              {isActive ? (
                <>
                  {/* 상태 뱃지 */}
                  <span className={`shrink-0 rounded px-2.5 py-0.5 text-sm font-black ${getCheckBadgeClass(status)}`}>
                    {status}
                  </span>
                  {/* 값/날짜 */}
                  {dateVal && (
                    <span className={`min-w-0 truncate text-sm ${
                      status === 'NG' ? 'font-bold text-red-400' : 'text-zinc-300'
                    }`}>
                      {dateVal}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-zinc-600">-</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
