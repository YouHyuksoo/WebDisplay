/**
 * @file MslWarningList.tsx
 * @description MSL Warning List 모니터링 화면 (메뉴 29). SWR polling으로 자동 갱신.
 * 초보자 가이드: PB 원본 w_display_msl_warning_list 화면을 React로 전환.
 * 상단에 NG 경고 배너, 메인 영역에 MSL 아이템 그리드 테이블.
 * 색상 로직: msl_used_rate >= 90 → 빨강, 70~90 → 노랑, < 70 → 기본.
 * DisplayLayout을 내부에 포함하여 헤더에 제목을 표시한다.
 * useTranslations()로 모든 UI 텍스트 다국어 적용.
 */
'use client';

import useSWR from 'swr';
import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import DisplayLayout from '../DisplayLayout';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MslWarningListProps {
  screenId: string;
  refreshInterval?: number;
}

/** MSL Warning List 모니터링 화면 (DisplayLayout 포함, 다국어 지원) */
export default function MslWarningList({
  screenId,
  refreshInterval = 30,
}: MslWarningListProps) {
  const t = useTranslations();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    '/api/display/29?orgId=1',
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  useAutoScroll({ containerRef: scrollRef, interval: 5000, enabled: !isLoading });

  const ngCount: number = data?.ngCount ?? 0;

  return (
    <DisplayLayout title="MSL Warning List" screenId={screenId} refreshInterval={refreshInterval}>
      {isLoading ? (
        <div className="flex h-full items-center justify-center text-5xl font-bold text-zinc-400 dark:text-zinc-500">
          {t('common.loading')}
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center text-5xl font-bold text-red-500">
          {t('common.error')}
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden">
          {/* NG 경고 배너 (PB: NG > 0 → f_play_sound('msl.wav') 대체) */}
          {ngCount > 0 && <NgAlertBanner count={ngCount} />}

          {/* 메인 그리드 테이블 */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto px-6 pb-4">
            <MslWarningTable rows={data?.warningList ?? []} />
          </div>
        </div>
      )}
    </DisplayLayout>
  );
}

/* ── NG 경고 배너 ───────────────────────────────────────────── */

/** PB의 f_play_sound('msl.wav') 대신 시각적 경고 배너 */
function NgAlertBanner({ count }: { count: number }) {
  const t = useTranslations('mslTable');
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setBlink((p) => !p), 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`flex items-center justify-center gap-6 px-6 py-4 text-3xl font-black text-white transition-colors ${
        blink ? 'bg-red-600' : 'bg-red-800'
      }`}
    >
      <svg className="h-10 w-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      {t('ngAlert', { count })}
      <svg className="h-10 w-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
  );
}

/* ── PB 원본 스타일 그리드 테이블 ──────────────────────────── */

/**
 * PB 원본 컬럼 순서: Line Name → Location → MSL Level → Item Code
 *                   → Lot No → Max Time → Passed Time → Remain Time
 */
function MslWarningTable({ rows }: { rows: Record<string, unknown>[] }) {
  const t = useTranslations('mslTable');

  const headers = [
    t('lineName'),
    t('locationCode'),
    t('mslLevel'),
    t('itemCode'),
    t('lotNo'),
    t('mslMaxTime'),
    t('mslPassedTime'),
    t('mslRemainTime'),
  ];

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-4xl font-bold text-zinc-400 dark:text-zinc-500">
        {t('noWarning')}
      </div>
    );
  }

  return (
    <table className="w-full table-fixed border-separate border-spacing-x-1 border-spacing-y-1">
      <colgroup>
        <col className="w-[12%]" />
        <col className="w-[8%]" />
        <col className="w-[7%]" />
        <col className="w-[15%]" />
        <col className="w-[24%]" />
        <col className="w-[10%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
      </colgroup>
      <thead className="sticky top-0 z-10">
        <tr className="h-24 bg-red-700 dark:bg-red-900">
          {headers.map((h) => (
            <th
              key={h}
              className="whitespace-nowrap px-6 text-3xl font-black leading-[6rem] text-white text-center"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <MslWarningRow key={i} row={row} index={i} />
        ))}
      </tbody>
    </table>
  );
}

/** MSL 아이템 행 — 색상 로직 포함 */
function MslWarningRow({ row, index }: { row: Record<string, unknown>; index: number }) {
  const usedRate = Number(row.MSL_USED_RATE ?? 0);
  const ngCount = Number(row.NG_COUNT ?? 0);

  /* PB 색상 로직: msl_used_rate >= 90 → RED, 70~90 → YELLOW, < 70 → 기본 */
  let passedTimeBg: string;
  if (usedRate >= 90) {
    passedTimeBg = 'bg-red-600 text-white font-black';
  } else if (usedRate >= 70) {
    passedTimeBg = 'bg-yellow-400 text-black font-black dark:bg-yellow-500';
  } else {
    passedTimeBg = '';
  }

  const bgClass = index % 2 === 0
    ? 'bg-white dark:bg-zinc-950'
    : 'bg-zinc-50 dark:bg-white/[0.02]';

  const baseTd = 'px-6 py-5 text-3xl font-bold text-zinc-800 dark:text-zinc-100';

  return (
    <tr className={`${bgClass} border-b border-zinc-200 dark:border-white/10`}>
      {/* Line Name */}
      <td className={`${baseTd} whitespace-nowrap`}>
        {String(row.LINE_NAME ?? '')}
      </td>
      {/* Location Code */}
      <td className={`${baseTd} text-center`}>
        {String(row.LOCATION_CODE ?? '')}
      </td>
      {/* MSL Level */}
      <td className={`${baseTd} text-center`}>
        <span className="inline-block rounded-md bg-zinc-700 px-4 py-1 text-2xl font-black text-white dark:bg-zinc-600">
          {String(row.MSL_LEVEL ?? '')}
        </span>
      </td>
      {/* Item Code */}
      <td className={`${baseTd} truncate`}>
        {String(row.ITEM_CODE ?? '')}
      </td>
      {/* Lot No */}
      <td className={`${baseTd} truncate font-mono`}>
        {String(row.LOT_NO ?? '')}
      </td>
      {/* MSL Max Time */}
      <td className={`${baseTd} text-right tabular-nums`}>
        {formatHour(row.MSL_MAX_HOUR)}
        <span className="ml-1 text-xl text-zinc-400 dark:text-zinc-500">h</span>
      </td>
      {/* MSL Passed Time — 색상 로직 적용 */}
      <td className={`${baseTd} text-right tabular-nums ${passedTimeBg}`}>
        {formatHour(row.MSL_PASSED_HOUR)}
        <span className="ml-1 text-xl">h</span>
        {ngCount > 0 && usedRate >= 90 && (
          <span className="ml-2 inline-block animate-pulse text-2xl">!</span>
        )}
      </td>
      {/* MSL Remain Time */}
      <td className={`${baseTd} text-right tabular-nums ${usedRate >= 90 ? 'text-red-500 dark:text-red-400' : ''}`}>
        {formatHour(row.MSL_REMAIN_HOUR)}
        <span className="ml-1 text-xl text-zinc-400 dark:text-zinc-500">h</span>
      </td>
    </tr>
  );
}

/** 시간값 포맷 (소수 2자리) */
function formatHour(val: unknown): string {
  if (val == null) return '-';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toFixed(2);
}
