/**
 * @file SolderWarningStatus.tsx
 * @description Solder Paste Warning List 메인 화면 (메뉴 31). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 데이터를 가져와 상단(NgAlertBanner) + 하단(SolderWarningGrid)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 * 설정 아이콘을 누르면 임계값 조정 모달이 열린다.
 */
'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import SolderWarningGrid from './SolderWarningGrid';
import SolderThresholdModal from './SolderThresholdModal';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import useSolderThresholds from '@/hooks/useSolderThresholds';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl } from '@/lib/display-helpers';

interface SolderWarningStatusProps {
  screenId: string;
}

/**
 * Solder Paste Warning List 메인 컴포넌트.
 * SWR로 데이터를 polling하고 NG 배너 + 경고 테이블을 조합한다.
 */
export default function SolderWarningStatus({
  screenId,
}: SolderWarningStatusProps) {
  const t = useTranslations('display');
  const timing = useDisplayTiming();
  const thresholds = useSolderThresholds();

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const ngCount: number = data?.ngCount ?? 0;
  const errorMsg = error ? String(error.message ?? error) : data?.error ?? null;

  const renderSettingsModal = useCallback(
    (props: { isOpen: boolean; onClose: () => void }) => (
      <SolderThresholdModal isOpen={props.isOpen} onClose={props.onClose} />
    ), [],
  );

  return (
    <DisplayLayout screenId={screenId} renderSettingsModal={renderSettingsModal}>
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={t('solderNgWarning', { count: ngCount })} />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <SolderWarningGrid
            rows={data?.warningList ?? []}
            isLoading={isLoading}
            error={errorMsg}
            scrollSeconds={timing.scrollSeconds}
            thresholds={thresholds}
          />
        </div>
      </div>
    </DisplayLayout>
  );
}
