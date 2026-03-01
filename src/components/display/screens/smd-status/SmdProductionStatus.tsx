/**
 * @file SmdProductionStatus.tsx
 * @description SMD 생산현황 메인 화면 (메뉴 24). SWR polling + 자동 스크롤.
 * 초보자 가이드: API에서 데이터를 가져와 상단(SmdStatusGrid) + 하단(SmdCheckItems)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠 영역만 자동 스크롤된다.
 */
'use client';

import useSWR from 'swr';
import { useEffect, useState, useCallback } from 'react';
import DisplayLayout from '../../DisplayLayout';
import SmdStatusGrid from './SmdStatusGrid';
import SmdCheckItems from './SmdCheckItems';

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

interface SmdProductionStatusProps {
  screenId: string;
  refreshInterval?: number;
}

/**
 * SMD 생산현황 메인 컴포넌트.
 * SWR로 데이터를 polling하고 상단 그리드 + 하단 점검 항목을 조합한다.
 */
export default function SmdProductionStatus({
  screenId,
  refreshInterval = 30,
}: SmdProductionStatusProps) {
  const [lines, setLines] = useState(() => getSelectedLines(screenId));

  const { data, error, isLoading } = useSWR(
    `/api/display/24?orgId=1&lines=${encodeURIComponent(lines)}`,
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  /* 라인 선택 모달에서 저장 시 localStorage를 다시 읽고 SWR 키 변경으로 즉시 리페치 */
  const handleLineChange = useCallback(() => {
    setLines(getSelectedLines(screenId));
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

  if (isLoading) {
    return (
      <DisplayLayout title="Production Status (SMD)" screenId={screenId}>
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
          데이터 로딩 중...
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout title="Production Status (SMD)" screenId={screenId}>
        <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
          데이터 로드 실패
        </div>
      </DisplayLayout>
    );
  }

  return (
    <DisplayLayout
      title="Production Status (SMD)"
      screenId={screenId}
      refreshInterval={refreshInterval}
    >
      <div className="flex h-full flex-col gap-1 p-2">
        {/* 상단 그리드 50% — 스크롤 없이 꽉 참 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <SmdStatusGrid rows={data?.machineStatus ?? []} />
        </div>
        {/* 하단 점검 항목 50% — 스크롤 없이 꽉 참 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <SmdCheckItems rows={data?.checkItems ?? []} />
        </div>
      </div>
    </DisplayLayout>
  );
}
