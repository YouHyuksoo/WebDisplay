/**
 * @file FoolproofStatus.tsx
 * @description 종합F/P현황 메인 화면 (메뉴 25). SWR polling + 페이지 자동 전환.
 * 초보자 가이드: API에서 라인별 점검 데이터를 가져와 카드 형태로 표시.
 * 한 페이지에 6개 카드를 보여주고, 5초마다 다음 페이지로 자동 전환된다.
 * 데이터 새로고침(30초)과 페이지 전환(5초)은 별도 타이머로 동작.
 * PB 원본: w_display_machine_foolproof_status (Timer → scrollnextpage)
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import FoolproofCard from './FoolproofCard';
import type { FoolproofRow } from './FoolproofCard';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

/** 한 페이지에 표시할 카드 수 */
const CARDS_PER_PAGE = 6;

/** NG 점검 키 목록 */
const NG_KEYS = [
  'MASK_CHECK', 'SQUEEZE_CHECK', 'SOLDER_CHECK', 'CCS_CHECK',
  'XRAY_CHECK', 'FULL_CHECK', 'SPEC_CHECK', 'AOI_SAMPLE_CHECK',
];

interface FoolproofStatusProps {
  screenId: string;
}

export default function FoolproofStatus({
  screenId,
}: FoolproofStatusProps) {
  const timing = useDisplayTiming();
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));
  const [currentPage, setCurrentPage] = useState(0);

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(selectedLines) }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const handleLineChange = useCallback(() => {
    setSelectedLines(getSelectedLines(screenId));
    setCurrentPage(0);
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

  const rows: FoolproofRow[] = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / CARDS_PER_PAGE));

  /* 페이지 자동 전환 타이머 — 데이터 새로고침과 독립 */
  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, timing.scrollSeconds * 1000);
    return () => clearInterval(timer);
  }, [totalPages, timing.scrollSeconds]);

  /* 데이터 갱신 시 페이지 보정 */
  useEffect(() => {
    if (currentPage >= totalPages) setCurrentPage(0);
  }, [totalPages, currentPage]);

  const pageRows = rows.slice(
    currentPage * CARDS_PER_PAGE,
    (currentPage + 1) * CARDS_PER_PAGE,
  );

  const ngCount = useMemo(
    () => rows.filter((r) => NG_KEYS.some((k) => r[k] === 'NG')).length,
    [rows],
  );

  return (
    <DisplayLayout screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={`Foolproof NG Warning: ${ngCount} line(s) detected`} showIcon={false} compact />}

        {/* 카드 그리드 — 현재 페이지만 표시 */}
        <div className="min-h-0 flex-1 p-3">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              데이터 로딩 중...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
              데이터 로드 실패
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              조회된 데이터가 없습니다
            </div>
          ) : (
            <div className="grid h-full grid-cols-2 grid-rows-3 gap-3 xl:grid-cols-3 xl:grid-rows-2">
              {pageRows.map((row, idx) => (
                <FoolproofCard key={row.LINE_CODE ?? idx} row={row} />
              ))}
            </div>
          )}
        </div>

        {/* 페이지 인디케이터 */}
        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-3 pb-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-3 w-3 rounded-full transition-all ${
                  i === currentPage
                    ? 'scale-125 bg-cyan-400'
                    : 'bg-zinc-600 hover:bg-zinc-500'
                }`}
                aria-label={`페이지 ${i + 1}`}
              />
            ))}
            <span className="ml-2 text-sm text-zinc-500">
              {currentPage + 1} / {totalPages}
            </span>
          </div>
        )}
      </div>
    </DisplayLayout>
  );
}
