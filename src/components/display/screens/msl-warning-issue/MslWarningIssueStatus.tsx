/**
 * @file MslWarningIssueStatus.tsx
 * @description MSL Warning List 출고기준 메인 화면 (메뉴 30). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 데이터를 가져와 상단(NgBanner) + 하단(IssueGrid)에 전달.
 * 장착기준(메뉴 29)과 동일한 UI 패턴이나 SQL 조건과 컬럼 구성이 다르다.
 * PB 원본: w_display_msl_warning_list_issue_item.srw
 */
'use client';

import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import MslWarningIssueGrid from './MslWarningIssueGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl } from '@/lib/display-helpers';

interface MslWarningIssueStatusProps {
  screenId: string;
}

export default function MslWarningIssueStatus({
  screenId,
}: MslWarningIssueStatusProps) {
  const t = useTranslations('display');
  const timing = useDisplayTiming();

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId),
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
      title="MSL Warning List (Issue)"
      screenId={screenId}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={t('mslNgWarning', { count: ngCount })} />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <MslWarningIssueGrid rows={data?.warningList ?? []} scrollSeconds={timing.scrollSeconds} />
        </div>
      </div>
    </DisplayLayout>
  );
}
