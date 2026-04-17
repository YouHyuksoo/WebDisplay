/**
 * @file DictionaryTab.tsx
 * @description resolvedColumns 를 domainId 별로 묶어 보여주는 readonly 뷰.
 *
 * 초보자 가이드:
 * - data.resolvedColumns 는 /api/ai-tables/[site]/[table] 응답에 포함됨.
 * - domainId 가 있는 컬럼만 그룹핑. 없는 컬럼은 '(도메인 없음)' 섹션.
 */

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  data: any;
}

export default function DictionaryTab({ data }: Props) {
  const resolved: Array<{ name: string; domainId?: string }> =
    data.resolvedColumns ?? [];
  const byDomain: Record<string, string[]> = {};
  const noDomain: string[] = [];
  for (const c of resolved) {
    if (c.domainId) {
      (byDomain[c.domainId] ??= []).push(c.name);
    } else {
      noDomain.push(c.name);
    }
  }
  const entries = Object.entries(byDomain);

  if (entries.length === 0 && noDomain.length === 0) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        해석된 컬럼이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {entries.map(([id, cols]) => (
        <div
          key={id}
          className="p-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900"
        >
          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
            📚 {id}
          </div>
          <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-1">
            {cols.join(', ')}
          </div>
        </div>
      ))}
      {noDomain.length > 0 && (
        <div className="p-2 border border-dashed border-zinc-300 dark:border-zinc-700 rounded">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            도메인 미할당 ({noDomain.length})
          </div>
          <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1">
            {noDomain.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
