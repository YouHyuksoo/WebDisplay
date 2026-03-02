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

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const STORAGE_KEY_PREFIX = 'display-lines-';

/** localStorage에서 선택된 라인 코드를 읽어온다 */
function getSelectedLines(screenId: string): string {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${screenId}`);
    if (stored) {
      const arr = JSON.parse(stored) as string[];
      if (arr.includes('%') || arr.length === 0) return '%';
      return arr.join(',');
    }
  } catch { /* 무시 */ }
  return '%';
}

interface AssyProductionStatusProps {
  screenId: string;
  refreshInterval?: number;
}

export default function AssyProductionStatus({
  screenId,
  refreshInterval = 30,
}: AssyProductionStatusProps) {
  const [selectedLines, setSelectedLines] = useState(() => getSelectedLines(screenId));

  const { data, error, isLoading } = useSWR(
    `/api/display/21?orgId=1&lines=${encodeURIComponent(selectedLines)}`,
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
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
    <DisplayLayout title="PBA Production Status" screenId={screenId} refreshInterval={refreshInterval}>
      <div className="flex h-full flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <AssyProductionGrid rows={data?.rows ?? []} isLoading={isLoading} error={error} />
        </div>
      </div>
    </DisplayLayout>
  );
}
