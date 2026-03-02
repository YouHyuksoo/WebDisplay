/**
 * @file SmdDualProductionStatus.tsx
 * @description SMD 듀얼생산현황 메인 화면 (메뉴 27). SWR polling + NG 배너 + 상세 그리드.
 * 초보자 가이드: API에서 데이터를 가져와 NG 배너 + 상단(SmdDualProductionGrid) + 하단(SmdCheckItems)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠 영역은 상하 분할된다.
 * PB 원본: w_display_machine_status_single_smd (FreeForm 카드 레이아웃)
 */
'use client';

import useSWR from 'swr';
import { useEffect, useState, useCallback } from 'react';
import DisplayLayout from '../../DisplayLayout';
import SmdDualProductionGrid from './SmdDualProductionGrid';
import SmdCheckItems from '../smd-status/SmdCheckItems';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

interface SmdDualProductionStatusProps {
  screenId: string;
}

/**
 * SMD 듀얼생산현황 메인 컴포넌트.
 * SWR로 데이터를 polling하고 NG 배너 + 상단 카드 그리드 + 하단 점검 항목을 조합한다.
 */
export default function SmdDualProductionStatus({
  screenId,
}: SmdDualProductionStatusProps) {
  const timing = useDisplayTiming();
  const [lines, setLines] = useState(() => getSelectedLines(screenId));

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(lines) }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const handleLineChange = useCallback(() => {
    setLines(getSelectedLines(screenId));
  }, [screenId]);

  useEffect(() => {
    const eventName = `line-config-changed-${screenId}`;
    window.addEventListener(eventName, handleLineChange);
    return () => window.removeEventListener(eventName, handleLineChange);
  }, [screenId, handleLineChange]);

  const ngCount: number = data?.ngCount ?? 0;

  if (isLoading) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
          데이터 로딩 중...
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
          데이터 로드 실패
        </div>
      </DisplayLayout>
    );
  }

  return (
    <DisplayLayout title="SMD Dual Production Status" screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && (
          <div className="shrink-0 animate-pulse bg-red-600 px-4 py-1 text-center text-lg font-black text-white">
            NG {ngCount}건 발생
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col gap-1 p-2">
          <div className="min-h-0 flex-1 overflow-hidden">
            <SmdDualProductionGrid rows={data?.productionList ?? []} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SmdCheckItems rows={data?.checkItems ?? []} />
          </div>
        </div>
      </div>
    </DisplayLayout>
  );
}
