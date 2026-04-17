/**
 * @file PromptPreviewTab.tsx
 * @description Stage 1 compact 블록 프리뷰 + 예상 토큰 수 표시.
 *
 * 초보자 가이드:
 * - SWR 로 /preview GET → pre 에 compactBlock 표시.
 * - 토큰 수는 Math.ceil(len/3) 근사치 (tokenizer.ts 정책).
 */

'use client';

import useSWR from 'swr';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';

export default function PromptPreviewTab() {
  const { activeSite, activeTable } = useAiTablesStore();
  const key =
    activeTable ? ['ai-tables-preview', activeSite, activeTable] : null;
  const { data, error, isLoading } = useSWR(key, () =>
    api.getPromptPreview(activeSite, activeTable as string),
  );

  if (isLoading) return <div className="text-sm text-zinc-500">로딩…</div>;
  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        로드 실패: {error.message ?? String(error)}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        예상 토큰:{' '}
        <strong className="text-zinc-900 dark:text-zinc-100">
          {data.estimatedTokens}
        </strong>{' '}
        <span className="text-xs text-zinc-400">
          (문자 {data.compactBlock?.length ?? 0})
        </span>
      </div>
      <pre className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs overflow-x-auto whitespace-pre text-zinc-800 dark:text-zinc-200">
        {data.compactBlock || '(빈 프롬프트)'}
      </pre>
    </div>
  );
}
