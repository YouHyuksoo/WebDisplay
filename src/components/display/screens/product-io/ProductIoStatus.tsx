/**
 * @file ProductIoStatus.tsx
 * @description 투입/포장 모니터링 메인 래퍼 컴포넌트 (메뉴 22, 23).
 *
 * 초보자 가이드:
 * 1. SWR로 API를 주기적으로 폴링하여 ProductIoGrid에 데이터를 전달한다.
 * 2. workstageCode에 따라 API 엔드포인트가 달라진다 (22: W310, 23: W220).
 * 3. localStorage에서 선택된 라인을 읽어 API 파라미터로 사용한다.
 * 4. line-config-changed 이벤트로 라인 변경을 감지한다.
 * 5. PB 원본: w_display_product_io_status
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import ProductIoGrid from './ProductIoGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { useSyncFooterStatus } from '@/components/providers/FooterProvider';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

/* ------------------------------------------------------------------ */
/*  타입                                                               */
/* ------------------------------------------------------------------ */

interface ProductIoStatusProps {
  /** 화면 ID (예: '22', '23') */
  screenId: string;
  /** 공정 코드 ('W310'=투입, 'W220'=포장) — 현재 미사용이나 확장성 보존 */
  workstageCode: string;
}

/* ------------------------------------------------------------------ */
/*  메인 컴포넌트                                                      */
/* ------------------------------------------------------------------ */

export default function ProductIoStatus({
  screenId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  workstageCode,
}: ProductIoStatusProps) {
  const timing = useDisplayTiming();
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, {
      orgId: DEFAULT_ORG_ID,
      lines: encodeURIComponent(selectedLines),
    }),
    fetcher,
    {
      refreshInterval: timing.refreshSeconds * 1000,
      onSuccess: () => setLastUpdated(new Date()),
    },
  );

  /* 하단바 상태 동기화 */
  useSyncFooterStatus({
    loading: isLoading,
    lastUpdated,
  });

  /* 라인 변경 이벤트 수신 */
  const handleLineChange = useCallback(() => {
    setSelectedLines(getSelectedLines(screenId));
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

  return (
    <DisplayLayout screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <ProductIoGrid
            plan={data?.plan ?? null}
            timeZones={data?.timeZones ?? [0, 0, 0, 0, 0, 0]}
            targets={data?.targets ?? [0, 0, 0, 0, 0, 0]}
            totalActual={data?.totalActual ?? 0}
            timeLabels={data?.timeLabels ?? []}
            shift={data?.shift ?? 'A'}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </DisplayLayout>
  );
}
