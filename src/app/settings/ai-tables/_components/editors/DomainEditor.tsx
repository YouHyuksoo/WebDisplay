/**
 * @file DomainEditor.tsx
 * @description 선택된 도메인의 상세 — 현재 v1 에서는 readonly 요약 + members 목록.
 *
 * 초보자 가이드:
 * - /api/ai-tables/domains 전체를 받아와 id 매칭.
 * - v2 에서 priority/hint/decode 편집 폼 추가 예정.
 */

'use client';

import useSWR from 'swr';
import { api } from '../../_lib/api-client';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  domainId: string | null;
}

export default function DomainEditor({ domainId }: Props) {
  const { data, error, isLoading } = useSWR(
    domainId ? ['ai-tables-domains'] : null,
    () => api.listDomains(),
  );

  if (!domainId) {
    return (
      <div className="p-8 text-zinc-500 dark:text-zinc-400">
        왼쪽에서 도메인을 선택하세요.
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-red-600 dark:text-red-400">
        로드 실패: {error.message ?? String(error)}
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="p-8 text-zinc-600 dark:text-zinc-400">로딩…</div>
    );
  }

  const domain = (data.domains as any[])?.find((x) => x.id === domainId);
  if (!domain) {
    return (
      <div className="p-8 text-zinc-500 dark:text-zinc-400">
        도메인을 찾을 수 없습니다: {domainId}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4 text-zinc-900 dark:text-zinc-100">
      <div>
        <h2 className="text-xl font-bold">{domain.name}</h2>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          id: <code>{domain.id}</code>
        </div>
        {domain.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {domain.description}
          </p>
        )}
      </div>

      <section>
        <h3 className="text-sm font-semibold mb-1">
          📋 Members ({domain.members?.length ?? 0})
        </h3>
        {(!domain.members || domain.members.length === 0) && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            (비어 있음)
          </div>
        )}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs font-mono text-zinc-700 dark:text-zinc-300">
          {(domain.members ?? []).map((m: string) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>

      <section className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold mb-1">⚙️ 설정</h3>
        <dl className="text-xs space-y-0.5">
          <div>
            <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
              Priority:{' '}
            </dt>
            <dd className="inline">{domain.priority ?? '(미지정)'}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
              Exclude from prompt:{' '}
            </dt>
            <dd className="inline">
              {domain.excludeFromPrompt ? 'Y' : 'N'}
            </dd>
          </div>
          {domain.hint && (
            <div>
              <dt className="inline font-medium text-zinc-600 dark:text-zinc-400">
                Hint:{' '}
              </dt>
              <dd className="inline">{domain.hint}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-zinc-600 dark:text-zinc-400">
              Decode:
            </dt>
            <dd>
              <pre className="mt-1 p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] overflow-x-auto">
                {JSON.stringify(domain.decode ?? { kind: 'raw' }, null, 2)}
              </pre>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
