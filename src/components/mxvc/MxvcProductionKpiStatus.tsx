/**
 * @file src/components/mxvc/MxvcProductionKpiStatus.tsx
 * @description 멕시코전장 라인별 생산현황 메인 화면.
 * 초보자 가이드: display/26의 ProductionKpiStatus와 동일한 동작이지만
 * screenId='mxvc-production-kpi'를 사용하여 라인 선택 및 API가 완전히 독립된다.
 * - localStorage 키: display-lines-mxvc-production-kpi (display/26과 별도)
 * - API: /api/mxvc/production-kpi (display/26과 별도)
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

/**
 * 멕시코전장 라인별 생산현황 컴포넌트.
 * SWR polling + 자동 순환으로 라인을 전환한다.
 */
export default function MxvcProductionKpiStatus() {
  const t = useTranslations('display');
  const timing = useDisplayTiming();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(SCREEN_ID));

  const apiUrl = `/api/mxvc/production-kpi?orgId=${DEFAULT_ORG_ID}&lines=${encodeURIComponent(selectedLines)}`;

  const { data, error, isLoading } = useSWR(
    apiUrl,
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const lines: ProductionKpiRow[] = data?.lines ?? [];

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

  /* 설정된 간격마다 다음 라인으로 자동 순환 */
  useEffect(() => {
    if (lines.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % lines.length);
    }, timing.scrollSeconds * 1000);
    return () => clearInterval(timer);
  }, [lines.length, timing.scrollSeconds]);

  /* 데이터 갱신 시 인덱스 보정 */
  useEffect(() => {
    if (lines.length > 0 && currentIndex >= lines.length) {
      setCurrentIndex(0);
    }
  }, [lines.length, currentIndex]);

  if (isLoading) {
    return (
      <DisplayLayout screenId={SCREEN_ID}>
        <div className="flex h-full items-center justify-center text-3xl text-zinc-400 dark:text-zinc-500">
          {t('loading')}
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={SCREEN_ID}>
        <div className="flex h-full items-center justify-center text-3xl text-red-400 dark:text-red-500">
          {t('loadError')}
        </div>
      </DisplayLayout>
    );
  }

  if (lines.length === 0) {
    return (
      <DisplayLayout screenId={SCREEN_ID}>
        <div className="flex h-full items-center justify-center text-3xl text-zinc-400 dark:text-zinc-500">
          {t('noDataShort')}
        </div>
      </DisplayLayout>
    );
  }

  const currentLine = lines[currentIndex % lines.length];

  return (
    <DisplayLayout screenId={SCREEN_ID}>
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
