/**
 * @file SiteTableNav.tsx
 * @description 좌측 네비 — 사이트 목록 + 접두어 트리.
 *
 * 초보자 가이드:
 * - `activeSite` 버튼 클릭 시 Zustand 사이트 전환.
 * - `LOG_`, `IP_` 등 접두어 그룹은 현재 순수 표시용 (필터링은 Phase 3b).
 */

'use client';

import { useAiTablesStore } from '../../_hooks/useAiTablesStore';

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SiteTableNav() {
  const { bootstrap, activeSite, setActiveSite } = useAiTablesStore();
  if (!bootstrap) return null;

  return (
    <nav className="p-3 text-sm">
      <div className="mb-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        사이트
      </div>
      {bootstrap.sites.map((site: string) => {
        const rows = (bootstrap.tables[site] ?? []) as any[];
        const prefixGroups = groupByPrefix(rows.map((r) => r.name));
        const active = site === activeSite;
        return (
          <div key={site} className="mb-3">
            <button
              type="button"
              className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                active
                  ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              onClick={() => setActiveSite(site)}
            >
              <span className="font-medium">{site}</span>
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                ({rows.length})
              </span>
            </button>
            {active && prefixGroups.length > 0 && (
              <div className="mt-1 ml-2 border-l border-zinc-200 dark:border-zinc-800 pl-2">
                {prefixGroups.map(([prefix, count]) => (
                  <div
                    key={prefix}
                    className="py-0.5 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    {prefix}
                    <span className="ml-1 opacity-60">({count})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
        통계: 전체 {bootstrap.stats?.tables ?? 0} · enabled{' '}
        {bootstrap.stats?.enabled ?? 0} · 예제 {bootstrap.stats?.examples ?? 0}
      </div>
    </nav>
  );
}

function groupByPrefix(names: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const n of names) {
    const i = n.indexOf('_');
    const prefix = i > 0 ? n.slice(0, i + 1) : n;
    map.set(prefix, (map.get(prefix) ?? 0) + 1);
  }
  return [...map.entries()].sort();
}
/* eslint-enable @typescript-eslint/no-explicit-any */
