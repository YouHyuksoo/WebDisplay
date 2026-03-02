/**
 * @file AssyProductionStatus.tsx
 * @description 제품생산현황 메인 화면 (메뉴 21). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 제품 생산 데이터를 가져와 시간대별 그리드에 표시.
 * DisplayLayout이 100vh 프레임을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 * 라인 선택 모달(DisplayHeader)에서 선택한 라인만 조회한다.
 * PB 원본: w_display_assy_production_status
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import AssyProductionGrid from './AssyProductionGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

interface AssyProductionStatusProps {
  screenId: string;
}

export default function AssyProductionStatus({
  screenId,
}: AssyProductionStatusProps) {
  const timing = useDisplayTiming();
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(selectedLines) }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

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
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <AssyProductionGrid rows={data?.rows ?? []} isLoading={isLoading} error={error} scrollSeconds={timing.scrollSeconds} />
        </div>
      </div>
    </DisplayLayout>
  );
}
