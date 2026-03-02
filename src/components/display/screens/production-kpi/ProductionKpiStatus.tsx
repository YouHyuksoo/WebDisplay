/**
 * @file ProductionKpiStatus.tsx
 * @description 라인별 생산현황 메인 화면 (메뉴 26). SWR polling + 자동 순환 + 라인 선택.
 * 초보자 가이드: API에서 라인별 KPI 데이터를 가져와 5초마다 자동으로 다음 라인을 표시한다.
 * 화면 전체를 꽉 채우는 모니터링 화면. 공장 현장 모니터용.
 * 라인 선택 모달(DisplayHeader)에서 선택한 라인만 조회한다.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import ProductionKpiCard from './ProductionKpiCard';
import type { ProductionKpiRow } from './ProductionKpiCard';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

interface ProductionKpiStatusProps {
  screenId: string;
}

/**
 * 라인별 생산현황 메인 컴포넌트.
 * SWR polling + 자동 순환으로 라인을 전환한다.
 * 화면 전체를 카드로 꽉 채운다.
 */
export default function ProductionKpiStatus({
  screenId,
}: ProductionKpiStatusProps) {
  const timing = useDisplayTiming();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(selectedLines) }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const lines: ProductionKpiRow[] = data?.lines ?? [];

  /* 라인 선택 모달에서 저장 시 즉시 리페치 */
  const handleLineChange = useCallback(() => {
    setSelectedLines(getSelectedLines(screenId));
    setCurrentIndex(0);
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

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
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-3xl text-zinc-400 dark:text-zinc-500">
          데이터 로딩 중...
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-3xl text-red-400 dark:text-red-500">
          데이터 로드 실패
        </div>
      </DisplayLayout>
    );
  }

  if (lines.length === 0) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-3xl text-zinc-400 dark:text-zinc-500">
          데이터 없음
        </div>
      </DisplayLayout>
    );
  }

  const currentLine = lines[currentIndex % lines.length];

  return (
    <DisplayLayout screenId={screenId}>
      <div className="relative h-full">
        {/* 카드가 화면 전체를 채움 */}
        <ProductionKpiCard row={currentLine} />

        {/* 페이지 인디케이터 (도트) — 화면 하단 범례 위에 오버레이 */}
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
                aria-label={`라인 ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </DisplayLayout>
  );
}
