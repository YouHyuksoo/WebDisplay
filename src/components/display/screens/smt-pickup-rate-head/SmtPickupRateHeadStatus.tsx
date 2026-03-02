/**
 * @file SmtPickupRateHeadStatus.tsx
 * @description SMT 픽업률현황(HEAD) 메인 화면 (메뉴 35). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 HEAD 아이템의 라인별 픽업률 데이터를 가져와 NG 배너 + 데이터 그리드에 전달.
 * DisplayLayout이 100vh 프레임을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 * PB 원본: w_display_smt_pickup_rate_head
 */
'use client';

import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import NgAlertBanner from '../../NgAlertBanner';
import SmtPickupRateGrid from '../smt-pickup-rate/SmtPickupRateGrid';
import useDisplayTiming from '@/hooks/useDisplayTiming';
import { fetcher } from '@/lib/fetcher';
import { buildDisplayApiUrl } from '@/lib/display-helpers';

interface SmtPickupRateHeadStatusProps {
  screenId: string;
}

export default function SmtPickupRateHeadStatus({
  screenId,
}: SmtPickupRateHeadStatusProps) {
  const timing = useDisplayTiming();

  const { data, error, isLoading } = useSWR(
    buildDisplayApiUrl(screenId),
    fetcher,
    { refreshInterval: timing.refreshSeconds * 1000 },
  );

  const ngCount: number = data?.ngCount ?? 0;

  return (
    <DisplayLayout screenId={screenId}>
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <NgAlertBanner message={`Pickup Rate (Head) NG Warning: ${ngCount} line(s) detected`} showIcon={false} compact />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <SmtPickupRateGrid rows={data?.pickupList ?? []} isLoading={isLoading} error={error} storageKey="grid-widths-smt-pickup-head" scrollSeconds={timing.scrollSeconds} />
        </div>
      </div>
    </DisplayLayout>
  );
}
