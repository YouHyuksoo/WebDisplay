/**
 * @file MslWarningStatus.tsx
 * @description MSL Warning List 메인 화면 (메뉴 29). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 데이터를 가져와 상단(NgAlertBanner) + 하단(MslWarningGrid)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 */
'use client';

import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import MslNgBanner from './MslNgBanner';
import MslWarningGrid from './MslWarningGrid';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface MslWarningStatusProps {
  screenId: string;
  refreshInterval?: number;
}

/**
 * MSL Warning List 메인 컴포넌트.
 * SWR로 데이터를 polling하고 NG 배너 + 경고 테이블을 조합한다.
 */
export default function MslWarningStatus({
  screenId,
  refreshInterval = 30,
}: MslWarningStatusProps) {
  const { data, error, isLoading } = useSWR(
    '/api/display/29?orgId=1',
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  if (isLoading) {
    return (
      <DisplayLayout title="MSL Warning List" screenId={screenId}>
        <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-500">
          데이터 로딩 중...
        </div>
      </DisplayLayout>
    );
  }

  if (error) {
    return (
      <DisplayLayout title="MSL Warning List" screenId={screenId}>
        <div className="flex h-full items-center justify-center text-red-400 dark:text-red-500">
          데이터 로드 실패
        </div>
      </DisplayLayout>
    );
  }

  const ngCount: number = data?.ngCount ?? 0;

  return (
    <DisplayLayout
      title="MSL Warning List"
      screenId={screenId}
      refreshInterval={refreshInterval}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <MslNgBanner count={ngCount} />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <MslWarningGrid rows={data?.warningList ?? []} />
        </div>
      </div>
    </DisplayLayout>
  );
}
