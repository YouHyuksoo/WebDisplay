/**
 * @file ExamplesTab.tsx
 * @description Examples 탭 메인 — kind 서브탭 + AI 초안 3개 생성 + 기존 목록.
 *
 * 초보자 가이드:
 * - kind 서브탭(exact/template/skeleton) 으로 필터링.
 * - "AI 초안 3개" 버튼으로 useAiDraftStream 호출 → DraftCard 렌더 → 저장 시 목록에 반영.
 * - Phase 3b part 2 에서 FeedbackQueueSection 을 하단에 삽입 예정 (placeholder 존재).
 */

'use client';

import { useMemo, useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { useAiDraftStream } from '../../_hooks/useAiDraftStream';
import KindSubTabs from './examples/KindSubTabs';
import ExampleCard from './examples/ExampleCard';
import DraftCard from './examples/DraftCard';
import type { Example, ExampleKind } from '@/lib/ai-tables/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  data: any;
  onChange: () => void;
}

export default function ExamplesTab({ data, onChange }: Props) {
  const { activeSite, activeTable } = useAiTablesStore();
  const site = activeSite;
  const table = activeTable as string;

  const [kind, setKind] = useState<ExampleKind>('exact');
  const allExamples: Example[] = data.meta?.examples ?? [];

  const { drafts, status, error, totalTokens, start, reset } =
    useAiDraftStream(site, table);

  const counts = useMemo(() => {
    const c: Record<ExampleKind, number> = {
      exact: 0,
      template: 0,
      skeleton: 0,
    };
    for (const e of allExamples) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [allExamples]);

  const filtered = allExamples.filter((e) => e.kind === kind);

  return (
    <div className="space-y-5">
      {/* 헤더: kind 탭 + AI 초안 버튼 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <KindSubTabs value={kind} onChange={setKind} counts={counts} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              start(3, kind === 'skeleton' ? ['skeleton'] : ['exact', 'template'])
            }
            disabled={status === 'streaming'}
            className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50"
          >
            {status === 'streaming' ? '생성 중...' : '✨ AI 초안 3개'}
          </button>
          {(drafts.length > 0 || status !== 'idle') && (
            <button
              type="button"
              onClick={reset}
              className="px-2 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:underline"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* AI 초안 상태 */}
      {(status === 'streaming' ||
        status === 'done' ||
        status === 'error' ||
        drafts.length > 0) && (
        <div className="space-y-2">
          {status === 'streaming' && (
            <div className="text-xs text-amber-700 dark:text-amber-400">
              LLM 응답 대기 중… (보통 10~30초)
            </div>
          )}
          {status === 'error' && error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              오류: {error}
            </div>
          )}
          {status === 'done' && totalTokens != null && drafts.length === 0 && (
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              초안이 생성되지 않았습니다. (약 {totalTokens} tokens 사용)
            </div>
          )}
          {drafts.map((d, i) => (
            <DraftCard
              key={i}
              site={site}
              table={table}
              draft={d}
              index={i}
              onSaved={onChange}
            />
          ))}
          {status === 'done' && totalTokens != null && drafts.length > 0 && (
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              총 {totalTokens} tokens · {drafts.length}개 초안
            </div>
          )}
        </div>
      )}

      {/* 기존 예제 목록 */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          저장된 예제 ({kind}, {filtered.length})
        </div>
        {filtered.length === 0 ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded">
            아직 {kind} 예제가 없습니다. AI 초안으로 시작해 보세요.
          </div>
        ) : (
          filtered.map((ex) => (
            <ExampleCard
              key={ex.id}
              site={site}
              table={table}
              example={ex}
              onDelete={onChange}
            />
          ))
        )}
      </div>

      {/* phase3b-part2: FeedbackQueueSection placeholder */}
      {/* <FeedbackQueueSection site={site} table={table} /> */}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
