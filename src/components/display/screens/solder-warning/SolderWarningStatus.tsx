/**
 * @file SolderWarningStatus.tsx
 * @description Solder Paste Warning List 메인 화면 (메뉴 31). SWR polling + 다크 UI.
 * 초보자 가이드: API에서 데이터를 가져와 상단(SolderNgBanner) + 하단(SolderWarningGrid)에 전달.
 * DisplayLayout이 100vh 프레임(헤더+메시지바)을 제공하고, 콘텐츠는 스크롤 없이 꽉 찬다.
 */
'use client';

import useSWR from 'swr';
import DisplayLayout from '../../DisplayLayout';
import SolderNgBanner from './SolderNgBanner';
import SolderWarningGrid from './SolderWarningGrid';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API 오류 (${res.status})`);
  return res.json();
};

interface SolderWarningStatusProps {
  screenId: string;
  refreshInterval?: number;
}

/**
 * Solder Paste Warning List 메인 컴포넌트.
 * SWR로 데이터를 polling하고 NG 배너 + 경고 테이블을 조합한다.
 */
export default function SolderWarningStatus({
  screenId,
  refreshInterval = 30,
}: SolderWarningStatusProps) {
  const { data, error, isLoading } = useSWR(
    '/api/display/31',
    fetcher,
    { refreshInterval: refreshInterval * 1000 },
  );

  const ngCount: number = data?.ngCount ?? 0;
  const errorMsg = error ? String(error.message ?? error) : data?.error ?? null;

  return (
    <DisplayLayout
      title="Solder Paste Warning List"
      screenId={screenId}
      refreshInterval={refreshInterval}
    >
      <div className="flex h-full flex-col overflow-hidden">
        {ngCount > 0 && <SolderNgBanner count={ngCount} />}
        <div className="min-h-0 flex-1 overflow-hidden p-2">
          <SolderWarningGrid
            rows={data?.warningList ?? []}
            isLoading={isLoading}
            error={errorMsg}
          />
        </div>
      </div>
    </DisplayLayout>
  );
}
