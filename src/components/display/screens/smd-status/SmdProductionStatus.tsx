/**
 * @file SmdProductionStatus.tsx
 * @description SMD 생산현황 메인 화면 (메뉴 24). SWR polling + 자동 스크롤.
 * 초보자 가이드: API에서 데이터를 가져와 상단(SmdStatusGrid) + 하단(SmdCheckItems)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠 영역만 자동 스크롤된다.
 */
'use client';

import useSWR from 'swr';
import { useRef } from 'react';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import DisplayLayout from '../../DisplayLayout';
import SmdStatusGrid from './SmdStatusGrid';
import SmdCheckItems from './SmdCheckItems';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, error, isLoading } = useSWR(
    `/api/display/24?orgId=1`,
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  useAutoScroll({ containerRef: scrollRef, interval: 5000, enabled: !isLoading });

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
      <div ref={scrollRef} className="flex h-full flex-col gap-2 p-3">
        {/* 상단 그리드 50% */}
        <div className="min-h-0 flex-1 overflow-auto">
          <SmdStatusGrid rows={data?.machineStatus ?? []} />
        </div>
        {/* 하단 점검 항목 50% */}
        <div className="min-h-0 flex-1 overflow-auto">
          <SmdCheckItems rows={data?.checkItems ?? []} />
        </div>
      </div>
    </DisplayLayout>
  );
}
