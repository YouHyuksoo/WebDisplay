/**
 * @file src/components/mxvc/MxvcProductionKpiStatus.tsx
 * @description 멕시코전장 라인별 생산현황 메인 화면.
 * 초보자 가이드:
 * - screenId='mxvc-production-kpi' 로 display/26 과 완전히 독립된 상태를 유지한다.
 * - 싱글/듀얼 모드 토글: 헤더 우측 아이콘 영역에 배치, localStorage에 저장됨.
 * - 듀얼 모드: 좌측=lines[idx], 우측=lines[(idx+1)%len] 으로 두 라인 동시 표시.
 * - 싱글 모드: 기존과 동일하게 한 라인씩 순환.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '@/components/display/DisplayLayout';
import ProductionKpiCard from '@/components/display/screens/production-kpi/ProductionKpiCard';
import type { ProductionKpiRow } from '@/components/display/screens/production-kpi/ProductionKpiCard';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, DEFAULT_ORG_ID } from '@/lib/display-helpers';

const SCREEN_ID = 'mxvc-production-kpi';
const DUAL_MODE_KEY = 'mxvc-production-kpi-dual-mode';

/**
 * 멕시코전장 라인별 생산현황 컴포넌트.
 * SWR polling + 자동 순환으로 라인을 전환한다.
 * 듀얼 모드에서는 두 라인을 좌/우로 동시에 표시한다.
 */
export default function MxvcProductionKpiStatus() {
  const t = useTranslations('display');
  const timing = useDisplayTiming();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(SCREEN_ID));
  const [dualMode, setDualMode] = useState(false);

  /* 클라이언트 마운트 후 localStorage에서 읽기 (SSR hydration 불일치 방지) */
  useEffect(() => {
    setDualMode(localStorage.getItem(DUAL_MODE_KEY) === 'true');
  }, []);

  const apiUrl = `/api/mxvc/production-kpi?orgId=${DEFAULT_ORG_ID}&lines=${encodeURIComponent(selectedLines)}`;

  const { data, error, isLoading } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const lines: ProductionKpiRow[] = data?.lines ?? [];

  /* 듀얼 모드 토글 */
  const toggleDualMode = useCallback(() => {
    setDualMode((prev) => {
      const next = !prev;
      localStorage.setItem(DUAL_MODE_KEY, String(next));
      setCurrentIndex(0);
      return next;
    });
  }, []);

  /* 라인 선택 모달에서 저장 시 즉시 리페치 */
  const handleLineChange = useCallback(() => {
    setSelectedLines(getSelectedLines(SCREEN_ID));
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    const eventName = `line-config-changed-${SCREEN_ID}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [handleLineChange]);

  /* 설정된 간격마다 다음 라인으로 자동 순환 (싱글 모드에서만) */
  useEffect(() => {
    if (dualMode) return;          // 듀얼 모드는 두 라인 고정 — 순환 없음
    if (lines.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % lines.length);
    }, timing.scrollSeconds * 1000);
    return () => clearInterval(timer);
  }, [dualMode, lines.length, timing.scrollSeconds]);

  /* 데이터 갱신 시 인덱스 보정 */
  useEffect(() => {
    if (lines.length > 0 && currentIndex >= lines.length) {
      setCurrentIndex(0);
    }
  }, [lines.length, currentIndex]);

  /** 헤더에 삽입할 듀얼/싱글 토글 버튼 */
  const dualToggle = (
    <button
      onClick={toggleDualMode}
      className={`
        flex items-center gap-1.5 rounded-md px-3 py-1.5
        text-xs font-bold border transition-colors
        ${dualMode
          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 hover:bg-cyan-500/30'
          : 'bg-zinc-800 border-zinc-600 text-zinc-400 hover:bg-zinc-700'}
      `}
      title={dualMode ? '싱글 모드로 전환' : '듀얼 모드로 전환'}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
        {dualMode ? (
          <rect x="2" y="2" width="12" height="12" rx="1.5" />
        ) : (
          <>
            <rect x="1" y="2" width="6" height="12" rx="1.5" />
            <rect x="9" y="2" width="6" height="12" rx="1.5" />
          </>
        )}
      </svg>
      {dualMode ? '싱글' : '듀얼'}
    </button>
  );

  if (isLoading) {
    return (
      <DisplayLayout screenId={SCREEN_ID} extraHeaderContent={dualToggle}>
        <div className="flex h-full items-center justify-center text-3xl text-zinc-400 dark:text-zinc-500">
          {t('loading')}
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={SCREEN_ID} extraHeaderContent={dualToggle}>
        <div className="flex h-full items-center justify-center text-3xl text-red-400 dark:text-red-500">
          {t('loadError')}
        </div>
      </DisplayLayout>
    );
  }

  if (lines.length === 0) {
    return (
      <DisplayLayout screenId={SCREEN_ID} extraHeaderContent={dualToggle}>
        <div className="flex h-full items-center justify-center text-3xl text-zinc-400 dark:text-zinc-500">
          {t('noDataShort')}
        </div>
      </DisplayLayout>
    );
  }

  /* ── 싱글 모드 ── */
  if (!dualMode) {
    const currentLine = lines[currentIndex % lines.length];
    return (
      <DisplayLayout screenId={SCREEN_ID} extraHeaderContent={dualToggle}>
        <div className="relative h-full">
          <ProductionKpiCard row={currentLine} />

          {lines.length > 1 && (
            <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-3">
              {lines.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-4 w-4 rounded-full transition-all ${
                    idx === currentIndex % lines.length
                      ? 'scale-125 bg-cyan-400'
                      : 'bg-zinc-600 hover:bg-zinc-500'
                  }`}
                  aria-label={t('line', { n: idx + 1 })}
                />
              ))}
            </div>
          )}
        </div>
      </DisplayLayout>
    );
  }

  /* ── 듀얼 모드 ── */
  const leftLine  = lines[currentIndex % lines.length];
  const rightLine = lines[(currentIndex + 1) % lines.length];

  return (
    <DisplayLayout screenId={SCREEN_ID} extraHeaderContent={dualToggle}>
      <div className="relative h-full flex gap-1">
        {/* 왼쪽 카드 */}
        <div className="flex-1 min-w-0 h-full">
          <ProductionKpiCard row={leftLine} compact />
        </div>

        {/* 구분선 */}
        <div className="w-px bg-zinc-700 shrink-0" />

        {/* 오른쪽 카드 */}
        <div className="flex-1 min-w-0 h-full">
          <ProductionKpiCard row={rightLine} compact />
        </div>

        {/* 하단 도트 인디케이터 */}
        {lines.length > 1 && (
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-2">
            {lines.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-3 w-3 rounded-full transition-all ${
                  idx === currentIndex % lines.length
                    ? 'scale-125 bg-cyan-400'
                    : 'bg-zinc-600 hover:bg-zinc-500'
                }`}
                aria-label={t('line', { n: idx + 1 })}
              />
            ))}
          </div>
        )}
      </div>
    </DisplayLayout>
  );
}
