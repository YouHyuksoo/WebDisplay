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
import { useTranslations } from 'next-intl';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import FoolproofCard from './FoolproofCard';
import type { FoolproofRow } from './FoolproofCard';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

/** NG 점검 키 목록 */
const NG_KEYS = [
  'MASK_CHECK', 'SQUEEZE_CHECK', 'SOLDER_CHECK', 'MASTER_CHECK_AOI',
];

const COLS_KEY = 'mxvc-foolproof-cols';
type ColMode = 2 | 3;

interface FoolproofStatusProps {
  screenId: string;
}

export default function FoolproofStatus({
  screenId,
}: FoolproofStatusProps) {
  const t = useTranslations('display');
  const timing = useDisplayTiming();
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));
  const [currentPage, setCurrentPage] = useState(0);

  /* 열 수 선택 (2열 / 3열) — localStorage 저장 */
  const [colMode, setColMode] = useState<ColMode>(2);
  useEffect(() => {
    const saved = localStorage.getItem(COLS_KEY);
    if (saved === '2' || saved === '3') setColMode(Number(saved) as ColMode);
  }, []);
  const handleColMode = (c: ColMode) => {
    setColMode(c);
    localStorage.setItem(COLS_KEY, String(c));
    setCurrentPage(0);
  };

  /* 모바일(< 480px) = 1개, 태블릿(< 768px) = 2개, 데스크톱 = 열수×2 */
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 480);
      setIsTablet(window.innerWidth < 768);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const cardsPerPage = isMobile ? 1 : isTablet ? 2 : colMode * 2;

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
  const totalPages = Math.max(1, Math.ceil(rows.length / cardsPerPage));

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
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage,
  );

  const ngCount = useMemo(
    () => rows.filter((r) => NG_KEYS.some((k) => r[k] === 'NG')).length,
    [rows],
  );

  const colToggle = (
    <div className="flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800 p-0.5">
      {([2, 3] as ColMode[]).map((c) => (
        <button
          key={c}
          onClick={() => handleColMode(c)}
          className={`rounded px-3 py-1 text-sm font-bold transition-colors ${
            colMode === c
              ? 'bg-cyan-500 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {c}열
        </button>
      ))}
    </div>
  );

  return (
    <DisplayLayout screenId={screenId} extraHeaderContent={colToggle}>
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={t('foolproofNgWarning', { count: ngCount })} showIcon={false} compact />}

        {/* 카드 그리드 — 현재 페이지만 표시 */}
        <div className="min-h-0 flex-1 p-2 md:p-3">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              {t('loading')}
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
              {t('loadError')}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
              {t('noData')}
            </div>
          ) : (
            <div className={`grid h-full gap-2 md:gap-3 ${
              cardsPerPage === 1
                ? 'grid-cols-1 grid-rows-1'
                : cardsPerPage === 2
                ? 'grid-cols-1 grid-rows-2'
                : cardsPerPage === 6
                ? 'grid-cols-3 grid-rows-2'
                : 'grid-cols-2 grid-rows-2'
            }`}>
              {pageRows.map((row, idx) => (
                <FoolproofCard key={row.LINE_CODE ?? idx} row={row} compact={colMode === 3} />
              ))}
            </div>
          )}
        </div>

        {/* 페이지 인디케이터 */}
        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-3 pb-1 md:pb-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`h-3 w-3 rounded-full transition-all ${
                  i === currentPage
                    ? 'scale-125 bg-cyan-400'
                    : 'bg-zinc-600 hover:bg-zinc-500'
                }`}
                aria-label={t('page', { n: i + 1 })}
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
