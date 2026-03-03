/**
 * @file MslWarningStatus.tsx
 * @description MSL Warning List (Mount) 메인 화면 (메뉴 29). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 데이터를 가져와 상단(NgAlertBanner) + 하단(MslWarningGrid)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 */
'use client';

import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import MslWarningGrid from './MslWarningGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl, DEFAULT_ORG_ID } from '@/lib/display-helpers';

interface MslWarningStatusProps {
  screenId: string;
}

/**
 * MSL Warning List (Mount) 메인 컴포넌트.
 * SWR로 데이터를 polling하고 NG 배너 + 경고 테이블을 조합한다.
 */
export default function MslWarningStatus({
  screenId,
}: MslWarningStatusProps) {
  const t = useTranslations('display');
  const timing = useDisplayTiming();

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId, { orgId: DEFAULT_ORG_ID }),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

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

  const ngCount: number = data?.ngCount ?? 0;

  return (
    <DisplayLayout
      title="MSL Warning List (Mount)"
      screenId={screenId}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={t('mslNgWarning', { count: ngCount })} />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <MslWarningGrid rows={data?.warningList ?? []} scrollSeconds={timing.scrollSeconds} />
        </div>
      </div>
    </DisplayLayout>
  );
}
