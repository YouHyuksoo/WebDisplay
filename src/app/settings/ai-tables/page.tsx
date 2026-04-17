/**
 * @file src/app/settings/ai-tables/page.tsx
 * @description AI Tables 페이지 shell — 3단 레이아웃 + Zustand + SWR bootstrap.
 *
 * 초보자 가이드:
 * - 좌측(18%): 사이트 + 접두어 트리 (`SiteTableNav`)
 * - 중간(27%): 테이블 목록 + 검색 (`TableList`)
 * - 우측(나머지): 선택 테이블 상세 (`TableDetail`)
 * - bootstrap 데이터는 SWR로 1회 로드 후 Zustand에 보관.
 */

'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from './_lib/api-client';
import { useAiTablesStore } from './_hooks/useAiTablesStore';
import SiteTableNav from './_components/nav/SiteTableNav';
import TableList from './_components/list/TableList';
import TableDetail from './_components/detail/TableDetail';

export default function AiTablesPage() {
  const { data, error, isLoading } = useSWR('ai-tables-bootstrap', api.bootstrap);
  const setBootstrap = useAiTablesStore((s) => s.setBootstrap);
  const setActiveSite = useAiTablesStore((s) => s.setActiveSite);

  useEffect(() => {
    if (data) {
      setBootstrap(data);
      if (data.activeSite) setActiveSite(data.activeSite);
    }
  }, [data, setBootstrap, setActiveSite]);

  if (error) {
    return (
      <div className="p-6 text-red-600 dark:text-red-400">
        로드 실패: {error.message ?? String(error)}
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="p-6 text-zinc-600 dark:text-zinc-400">로딩 중...</div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="w-[18%] min-w-[220px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <SiteTableNav />
      </aside>
      <section className="w-[27%] min-w-[300px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <TableList />
      </section>
      <main className="flex-1 overflow-y-auto">
        <TableDetail />
      </main>
    </div>
  );
}
