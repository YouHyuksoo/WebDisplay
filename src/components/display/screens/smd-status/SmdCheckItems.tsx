/**
 * @file SmdCheckItems.tsx
 * @description SMD 생산현황 하단 점검 항목 매트릭스 테이블.
 *   행=점검항목(7개), 열=라인(S01~S06). TV 모니터링 화면용으로
 *   폰트가 크고 가독성을 극대화한 다크 UI.
 *
 * 초보자 가이드:
 *   - CHECK_ITEMS 배열이 행(점검 항목)을 정의합니다.
 *   - props.rows 배열의 각 요소가 열(라인)을 정의합니다.
 *   - 각 셀은 statusKey(OK/NG)와 dateKey(값)를 조합해 표시합니다.
 *   - NG가 하나라도 있는 라인은 헤더가 빨간색으로 강조됩니다.
 */
'use client';

import { useTranslations } from 'next-intl';
import { useGridResizer } from '@/hooks/useGridResizer';
import { getCheckBadgeClass } from '../../shared/status-styles';



/** 라인 1건의 점검 데이터 행 */
interface CheckItemRow {
  LINE_NAME?: string;
  MASK_CHECK?: string;
  MASK_CHECK_DATE?: string;
  SQUEEZE_CHECK?: string;
  SQUEEZE_CHECK_DATE?: string;
  SOLDER_CHECK?: string;
  SOLDER_CHECK_VAL?: string;
  CCS_CHECK?: string;
  CCS_CHECK_DATE?: string;
  FULL_CHECK?: string;
  FULL_CHECK_DATE?: string;
  XRAY_CHECK?: string;
  XRAY_CHECK_DATE?: string;
  SPEC_CHECK?: string;
  SPEC_CHECK_DATE?: string;
  [key: string]: unknown;
}

interface SmdCheckItemsProps {
  rows: CheckItemRow[];
}

const CHECK_ITEMS = [
  { labelKey: 'metalMask', statusKey: 'MASK_CHECK', dateKey: 'MASK_CHECK_DATE' },
  { labelKey: 'squeegee', statusKey: 'SQUEEZE_CHECK', dateKey: 'SQUEEZE_CHECK_DATE' },
  { labelKey: 'solderEpoxy', statusKey: 'SOLDER_CHECK', dateKey: 'SOLDER_CHECK_VAL' },
  { labelKey: 'firstCheck', statusKey: 'CCS_CHECK', dateKey: 'CCS_CHECK_DATE' },
  { labelKey: 'fullCheck', statusKey: 'FULL_CHECK', dateKey: 'FULL_CHECK_DATE' },
  { labelKey: 'masterCheck', statusKey: 'XRAY_CHECK', dateKey: 'XRAY_CHECK_DATE' },
  { labelKey: 'profileInsp', statusKey: 'SPEC_CHECK', dateKey: 'SPEC_CHECK_DATE' },
] as const;

/** 라인에 NG 항목이 하나라도 있는지 판별 */
function hasNg(row: CheckItemRow): boolean {
  return CHECK_ITEMS.some((item) => row[item.statusKey] === 'NG');
}

/** 초기 폭 설정 (항목명 + 라인들) */
const INITIAL_WIDTHS = [160, 150, 150, 150, 150, 150, 150];

/** SMD 점검 항목 매트릭스 테이블 (행=항목, 열=라인) */
export default function SmdCheckItems({ rows }: SmdCheckItemsProps) {
  const t = useTranslations('display');
  const tCheck = useTranslations('checkItem');
  const { widths, handleMouseDown } = useGridResizer('grid-widths-smd-check', INITIAL_WIDTHS);

  // 데이터 없을 때 빈 상태 표시
  if (!rows.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-lg text-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-600">
        {t('noCheckData')}
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950 dark:border-white/10 dark:bg-zinc-950">
      <table className="h-full w-full table-fixed border-collapse">
        <colgroup>
          {widths.slice(0, rows.length + 1).map((w, i) => (
            <col key={i} style={{ width: typeof w === 'number' ? `${w}px` : w }} />
          ))}
        </colgroup>
        {/* ---------- 헤더: "Check Items" | S01 | S02 | ... ---------- */}
        <thead>
          <tr className="bg-zinc-900 dark:bg-zinc-900">
            {/* 항목명 열 헤더 */}
            <th className="relative border-b border-zinc-700 px-4 py-3 text-center text-lg font-black text-white dark:border-zinc-700 dark:text-white">
              {t('checkItems')}
              <div className="resize-handle" onMouseDown={(e) => handleMouseDown(0, e)} />
            </th>

            {/* 라인 열 헤더 — NG 있으면 빨간 강조 */}
            {rows.map((row, i) => {
              const name = String(row.LINE_NAME ?? `L${i + 1}`);
              const ng = hasNg(row);
              const headerCls = ng
                ? 'bg-red-600 text-yellow-200 animate-pulse'
                : i % 2 === 0
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-700 text-white';
              return (
                <th
                  key={name + i}
                  className={`relative border-b border-zinc-700 px-2 py-3 text-center text-lg font-black dark:border-zinc-700 ${headerCls}`}
                >
                  {name}
                  <div className="resize-handle" onMouseDown={(e) => handleMouseDown(i + 1, e)} />
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ---------- 본문: 7개 점검 항목 행 ---------- */}
        <tbody>
          {CHECK_ITEMS.map((item, idx) => (
            <tr
              key={item.statusKey}
              className="border-b border-zinc-800 last:border-b-0 dark:border-zinc-800"
            >
              {/* 항목 이름 셀 — 교대 배경 */}
              <td
                className={`whitespace-nowrap px-4 py-2 text-center text-base font-bold ${
                  idx % 2 === 0
                    ? 'bg-zinc-800 text-zinc-100 dark:bg-zinc-800 dark:text-zinc-100'
                    : 'bg-zinc-700 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-100'
                }`}
              >
                {tCheck(item.labelKey)}
              </td>

              {/* 각 라인별 상태+값 셀 */}
              {rows.map((row, i) => {
                const status = String(row[item.statusKey] ?? '');
                const dateVal = String(row[item.dateKey] ?? '');
                const isActive = status !== '';

                return (
                  <td
                    key={i}
                    className={`px-1 py-2 ${
                      i % 2 === 0
                        ? 'bg-zinc-950 dark:bg-zinc-950'
                        : 'bg-zinc-900/60 dark:bg-zinc-900/60'
                    }`}
                  >
                    {isActive ? (
                      <div className="flex items-center gap-1.5">
                        {/* 상태 뱃지 (좌) */}
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-sm font-black ${getCheckBadgeClass(status, 'bg-zinc-300 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400')}`}
                        >
                          {status}
                        </span>
                        {/* 값 텍스트 (우) */}
                        {dateVal && (
                          <span
                            className={`truncate text-xs ${
                              status === 'NG'
                                ? 'font-semibold text-red-400'
                                : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            {dateVal}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* 비활성 라인 — 회색 "-" */
                      <div className="text-center text-sm text-zinc-600 dark:text-zinc-600">
                        -
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
