/**
 * @file src/app/settings/ai-tables/page.tsx
 * @description AI Tables 페이지 shell — 모드별 레이아웃 분기 + Zustand + SWR bootstrap.
 *
 * 초보자 가이드:
 * - mode = 'tables' : 3단 레이아웃 (사이트 트리 / 테이블 목록 / 상세)
 * - mode = 'domains' : 2단 레이아웃 (도메인 목록 / 도메인 상세)
 * - ModeSwitcher 가 좌측 aside 맨 위에 항상 존재.
 * - bootstrap 데이터는 SWR 로 1회 로드 후 Zustand 에 보관.
 */

'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from './_lib/api-client';
import { useAiTablesStore } from './_hooks/useAiTablesStore';
import SiteTableNav from './_components/nav/SiteTableNav';
import TableList from './_components/list/TableList';
import TableDetail from './_components/detail/TableDetail';
import ModeSwitcher from './_components/nav/ModeSwitcher';
import DomainNav from './_components/nav/DomainNav';
import DomainEditor from './_components/editors/DomainEditor';

export default function AiTablesPage() {
  const { data, error, isLoading } = useSWR('ai-tables-bootstrap', api.bootstrap);
  const setBootstrap = useAiTablesStore((s) => s.setBootstrap);
  const setActiveSite = useAiTablesStore((s) => s.setActiveSite);
  const mode = useAiTablesStore((s) => s.mode);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setBootstrap(data);
      if (data.activeSite) setActiveSite(data.activeSite);
    }
  }, [data, setBootstrap, setActiveSite]);

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400">
        로드 실패: {error.message ?? String(error)}
      </div>
    );
  }
  if (isLoading || !data) {
    return <div className="text-zinc-600 dark:text-zinc-400">로딩 중...</div>;
  }

  // 이 페이지는 두 가지 호스트에서 임베드된다:
  //  (1) /settings/ai-tables — settings layout main 이 p-6 패딩 + overflow-y-auto 제공
  //  (2) /display/18 의 DisplayOption 탭 — 부모가 min-h-0 flex-1 overflow-auto 제공
  // 부모가 이미 높이·스크롤을 관장하므로 여기선 h-full 로 채우고 내부에서만 스크롤.
  return (
    <div className="flex h-full bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="w-[18%] min-w-[220px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <ModeSwitcher />
        {mode === 'tables' ? (
          <SiteTableNav />
        ) : (
          <DomainNav
            selectedId={selectedDomain}
            onSelect={setSelectedDomain}
          />
        )}
      </aside>
      {mode === 'tables' ? (
        <>
          <section className="w-[27%] min-w-[300px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
            <TableList />
          </section>
          <main className="flex-1 overflow-y-auto">
            <TableDetail />
          </main>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <DomainEditor domainId={selectedDomain} />
        </main>
      )}
    </div>
  );
}
