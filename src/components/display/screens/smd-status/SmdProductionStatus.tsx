/**
 * @file SmdProductionStatus.tsx
 * @description SMD 생산현황 메인 화면 (메뉴 24). SWR polling + 자동 스크롤.
 * 초보자 가이드: API에서 데이터를 가져와 상단(SmdStatusGrid) + 하단(SmdCheckItems)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠 영역만 자동 스크롤된다.
 */
'use client';

import useSWR from 'swr';
import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import DisplayLayout from '../../DisplayLayout';
import SmdStatusGrid from './SmdStatusGrid';
import SmdCheckItems from './SmdCheckItems';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { getSelectedLines, buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

interface SmdProductionStatusProps {
  screenId: string;
}

/**
 * SMD 생산현황 메인 컴포넌트.
 * SWR로 데이터를 polling하고 상단 그리드 + 하단 점검 항목을 조합한다.
 */
export default function SmdProductionStatus({
  screenId,
}: SmdProductionStatusProps) {
  const t = useTranslations('display');
  const timing = useDisplayTiming();
  const [lines, setLines] = useState(() => getSelectedLines(screenId));

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID, lines: encodeURIComponent(lines) }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
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
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
          {t('loading')}
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout screenId={screenId}>
        <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
          {t('loadError')}
        </div>
      </DisplayLayout>
    );
  }

  return (
    <DisplayLayout
      title="SMD Production Status"
      screenId={screenId}
    >
      <div className="flex h-full flex-col gap-1 p-2">
        {/* 상단 그리드 50% — 스크롤 없이 꽉 참 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <SmdStatusGrid rows={data?.smdProduction ?? []} />
        </div>
        {/* 하단 점검 항목 50% — 스크롤 없이 꽉 참 */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <SmdCheckItems rows={data?.checkItems ?? []} />
        </div>
      </div>
    </DisplayLayout>
  );
}
