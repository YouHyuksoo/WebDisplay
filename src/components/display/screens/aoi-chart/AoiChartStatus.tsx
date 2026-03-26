/**
 * @file AoiChartStatus.tsx
 * @description AOI 차트분석 메인 컴포넌트. SWR polling + 스포트라이트 순환 애니메이션.
 * 초보자 가이드: 4개 차트를 2x2 그리드로 배치하고, scrollSeconds 간격으로
 * [전체 보기] → [개별 스포트라이트 0~3] 5단계 순환 애니메이션을 적용한다.
 * phase -1: 4개 동시 표시 (일반 그리드) / phase 0~3: 해당 차트 확대 + 나머지 축소.
 * 라인 선택 모달에서 저장한 값을 API에 전달하여 선택 라인만 조회한다.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '@/components/display/DisplayLayout';
import DefectByLineChart from './DefectByLineChart';
import FpyTrendChart from './FpyTrendChart';
import DefectRatePanel from './DefectRatePanel';
import TopDefectChart from './TopDefectChart';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl, getSelectedLines } from '@/lib/display-helpers';
import type { AoiChartApiResponse } from '@/lib/queries/aoi-chart';

interface AoiChartStatusProps {
  screenId: string;
}

/** 애니메이션 단계 수: -1(전체) + 0~3(개별) = 총 5단계 */
const PHASE_COUNT = 5;

/**
 * 그리드 위치별 transform-origin.
 * [0] 좌상 → 우하로 확대 / [1] 우상 → 좌하로 확대
 * [2] 좌하 → 우상로 확대 / [3] 우하 → 좌상으로 확대
 */
const ORIGINS = [
  'origin-top-left',
  'origin-top-right',
  'origin-bottom-left',
  'origin-bottom-right',
];

export default function AoiChartStatus({ screenId }: AoiChartStatusProps) {
  const t = useTranslations('display');
  const timing = useDisplayTiming();
  /** phase: -1 = 전체 보기, 0~3 = 개별 스포트라이트 */
  const [phase, setPhase] = useState(-1);
  const [lines, setLines] = useState('%');

  /* SSR 후 클라이언트에서 localStorage의 라인 선택값을 읽어온다 (hydration 불일치 방지) */
  useEffect(() => {
    setLines(getSelectedLines(screenId));
  }, [screenId]);

  /* 스크롤 간격(scrollSeconds)으로 단계 자동 순환: -1 → 0 → 1 → 2 → 3 → -1 → … */
  useEffect(() => {
    const id = setInterval(() => {
      setPhase((prev) => (prev + 1 >= PHASE_COUNT - 1 ? -1 : prev + 1));
    }, timing.scrollSeconds * 1000);
    return () => clearInterval(id);
  }, [timing.scrollSeconds]);

  /* 라인 선택 모달에서 저장 시 localStorage를 다시 읽고 SWR 키 변경으로 즉시 리페치 */
  const handleLineChange = useCallback(() => {
    setLines(getSelectedLines(screenId));
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

  /** 라인 미선택('%')이면 SWR 키를 null로 두어 API 호출을 보류 */
  const hasLines = lines !== '%';
  const { data, error, isLoading } = useSWR<AoiChartApiResponse>(
    hasLines ? buildDisplayApiUrl(screenId, { lines: encodeURIComponent(lines) }) : null,
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  if (!hasLines) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-zinc-400">
          {t('lineSelect')}
        </div>
      </DisplayLayout>
    );
  }

  if (isLoading) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-zinc-400">
          {t('loading')}
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-red-400">
          {t('loadError')}
        </div>
      </DisplayLayout>
    );
  }

  const charts = [
    <DefectByLineChart key="byline" data={data?.byLine ?? []} />,
    <FpyTrendChart key="fpy" data={data?.fpyTrend ?? []} />,
    <DefectRatePanel key="rate" summary={data?.summary ?? null} />,
    <TopDefectChart key="top" data={data?.topLines ?? []} />,
  ];

  return (
    <DisplayLayout screenId={screenId}>
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2">
        {charts.map((chart, i) => {
          const isAllView = phase === -1;
          const isSpotlight = phase === i;
          let cellClass: string;

          if (isAllView) {
            cellClass = 'z-10 scale-100 opacity-100 saturate-100';
          } else if (isSpotlight) {
            cellClass = 'z-20 scale-[1.55] shadow-[0_0_40px_rgba(167,139,250,0.3)]';
          } else {
            cellClass = 'z-10 scale-[0.92] opacity-50 saturate-[0.6]';
          }

          return (
            <div
              key={i}
              onClick={() => setPhase(i)}
              className={[
                'cursor-pointer rounded-xl transition-all duration-700 ease-in-out',
                ORIGINS[i],
                cellClass,
              ].join(' ')}
            >
              {chart}
            </div>
          );
        })}
      </div>
    </DisplayLayout>
  );
}
