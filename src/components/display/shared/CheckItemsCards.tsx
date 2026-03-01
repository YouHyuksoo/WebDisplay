/**
 * @file CheckItemsCards.tsx
 * @description SMD 점검 항목을 PB 원본 스타일 테이블로 표시. 다국어 지원.
 * 초보자 가이드: 행=점검항목, 열=라인. 스크롤 없이 하단 영역에 꽉 채움.
 * NG 있는 라인 헤더는 붉은색 깜박임.
 */
'use client';

import { useTranslations } from 'next-intl';

const CHECK_ITEMS = [
  { label: 'Metal Mask', statusKey: 'MASK_CHECK', dateKey: 'MASK_CHECK_DATE' },
  { label: 'Squeeze', statusKey: 'SQUEEZE_CHECK', dateKey: 'SQUEEZE_CHECK_DATE' },
  { label: 'Solder', statusKey: 'SOLDER_CHECK', dateKey: 'SOLDER_CHECK_VAL' },
  { label: 'CCS Check', statusKey: 'CCS_CHECK', dateKey: 'CCS_CHECK_DATE' },
  { label: 'Full Check', statusKey: 'FULL_CHECK', dateKey: 'FULL_CHECK_DATE' },
  { label: 'X-Ray', statusKey: 'XRAY_CHECK', dateKey: 'XRAY_CHECK_DATE' },
  { label: 'Profile', statusKey: 'SPEC_CHECK', dateKey: 'SPEC_CHECK_DATE' },
] as const;

const NG_KEYS = CHECK_ITEMS.map((c) => c.statusKey);
type Row = Record<string, unknown>;

function hasNg(row: Row): boolean {
  return NG_KEYS.some((key) => row[key] === 'NG');
}

function statusColor(value: string): string {
  if (value === 'OK' || value === 'Y' || value === 'PASS') return 'bg-green-500 text-white';
  if (value === 'NG') return 'bg-red-600 text-yellow-200 animate-pulse';
  if (value === 'WAIT') return 'bg-amber-500 text-white';
  return 'bg-zinc-300 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400';
}

interface CheckItemsCardsProps {
  rows: Row[];
}

/** PB 원본 스타일 점검 항목 테이블 — 행=항목, 열=라인 (다국어 지원) */
export default function CheckItemsCards({ rows }: CheckItemsCardsProps) {
  const t = useTranslations('display');

  if (!rows.length) {
    return (
      <div className="flex h-full items-center justify-center text-2xl text-zinc-400 dark:text-zinc-600">
        {t('noCheckData')}
      </div>
    );
  }

  return (
    <table className="h-full w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-0">
      {/* 헤더: Check Items | 라인1 | 라인2 | ... */}
      <thead>
        <tr className="h-16 bg-zinc-800 text-white">
          <th className="whitespace-nowrap px-6 py-6 text-center text-2xl font-black">
            {t('checkItems')}
          </th>
          {rows.map((row, i) => {
            const name = String(row.LINE_NAME ?? '');
            const ng = hasNg(row);
            const colBg = ng
              ? 'animate-pulse bg-red-600 text-yellow-200'
              : i % 2 === 0
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-600 text-white';
            return (
              <th
                key={i}
                className={`whitespace-nowrap px-4 py-6 text-center text-2xl font-black ${colBg}`}
              >
                {name}
              </th>
            );
          })}
        </tr>
      </thead>

      {/* 본문: 각 점검 항목 × 라인 */}
      <tbody>
        {CHECK_ITEMS.map((item, idx) => (
          <tr
            key={item.statusKey}
            className="border-b border-zinc-200 dark:border-white/10"
          >
            {/* 항목 이름 — 행별 교대 배경 */}
            <td className={`whitespace-nowrap px-6 py-8 text-center text-lg font-black ${idx % 2 === 0 ? 'bg-zinc-700 text-white dark:bg-zinc-700 dark:text-zinc-100' : 'bg-zinc-600 text-white dark:bg-zinc-600 dark:text-zinc-100'}`}>
              {item.label}
            </td>

            {/* 각 라인별 상태 + 값 */}
            {rows.map((row, i) => {
              const status = String(row[item.statusKey] ?? '-');
              const dateVal = String(row[item.dateKey] ?? '');
              return (
                <td key={i} className={`overflow-hidden p-0 ${i % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50 dark:bg-zinc-900/50'}`}>
                  <div className="flex h-full items-stretch">
                    <div className={`flex w-20 shrink-0 items-center justify-center text-2xl font-black ${statusColor(status)}`}>
                      {status}
                    </div>
                    <div className={`flex items-center truncate px-3 text-sm font-bold ${status === 'NG' ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {dateVal}
                    </div>
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
