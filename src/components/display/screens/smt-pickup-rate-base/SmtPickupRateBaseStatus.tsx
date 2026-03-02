/**
 * @file SmtPickupRateBaseStatus.tsx
 * @description SMT 픽업률현황(BASE) 메인 화면 (메뉴 34). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 라인별 픽업률 데이터를 가져와 NG 배너 + 데이터 그리드에 전달.
 * DisplayLayout이 100vh 프레임을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 * PB 원본: w_display_smt_pickup_rate_base
 */
'use client';

import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import SmtPickupRateBaseNgBanner from './SmtPickupRateBaseNgBanner';
import SmtPickupRateBaseGrid from './SmtPickupRateBaseGrid';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SmtPickupRateBaseStatusProps {
  screenId: string;
  refreshInterval?: number;
}

export default function SmtPickupRateBaseStatus({
  screenId,
  refreshInterval = 30,
}: SmtPickupRateBaseStatusProps) {
  const { data, error, isLoading } = useSWR(
    '/api/display/34',
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  const ngCount: number = data?.ngCount ?? 0;

  return (
    <DisplayLayout title="SMT Pickup Rate (Base)" screenId={screenId} refreshInterval={refreshInterval}>
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <SmtPickupRateBaseNgBanner count={ngCount} />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <SmtPickupRateBaseGrid rows={data?.pickupList ?? []} isLoading={isLoading} error={error} />
        </div>
      </div>
    </DisplayLayout>
  );
}
