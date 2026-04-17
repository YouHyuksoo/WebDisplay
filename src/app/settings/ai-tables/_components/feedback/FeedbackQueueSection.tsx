/**
 * @file FeedbackQueueSection.tsx
 * @description Examples 탭 하단에 걸리는 승격 대기 피드백 목록.
 *
 * 초보자 가이드:
 * - SWR 로 /feedback-queue GET → 항목 렌더.
 * - 승격 버튼: 기본값 (kind=exact, question/sql은 큐에서 자동) 으로 promote 호출.
 * - 기각 버튼: window.confirm 으로 간단 확인 후 DELETE.
 * - 빈 큐면 아무것도 렌더하지 않음 (ExamplesTab 레이아웃 간섭 방지).
 */

'use client';

import useSWR from 'swr';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';

interface Props {
  onChange: () => void;
}

interface QueueItem {
  id: string;
  sessionId: string;
  question: string;
  sql: string;
  likedAt: string;
  tablesReferenced: string[];
}

export default function FeedbackQueueSection({ onChange }: Props) {
  const { activeSite, activeTable } = useAiTablesStore();
  const key =
    activeTable ? ['ai-tables-fbq', activeSite, activeTable] : null;
  const { data, mutate } = useSWR(key, () =>
    api.getFeedbackQueue(activeSite, activeTable as string),
  );

  if (!data?.queue?.length) return null;
  const queue = data.queue as QueueItem[];

  const onPromote = async (q: QueueItem) => {
    await api.promoteFeedback(activeSite, activeTable as string, q.id, {
      kind: 'exact',
      question: q.question,
      sql: q.sql,
      why: '(승격됨)',
    });
    mutate();
    onChange();
  };

  const onReject = async (q: QueueItem) => {
    if (!window.confirm(`이 피드백을 큐에서 제거할까요?\n${q.question}`)) return;
    await api.rejectFeedback(activeSite, activeTable as string, q.id);
    mutate();
  };

  return (
    <div className="mt-4 p-3 border border-amber-300 dark:border-amber-700 rounded bg-amber-50/50 dark:bg-amber-950/20">
      <h3 className="font-semibold text-sm mb-2 text-zinc-800 dark:text-zinc-200">
        🔔 승격 대기 ({queue.length})
      </h3>
      <div className="space-y-2">
        {queue.map((q) => (
          <div
            key={q.id}
            className="p-2 rounded bg-white/70 dark:bg-zinc-900/60 border border-amber-200 dark:border-amber-800"
          >
            <div className="text-xs text-zinc-700 dark:text-zinc-200 mb-1">
              {q.question || <em className="text-zinc-400">(질문 없음)</em>}
            </div>
            <code className="block text-[11px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 p-1 rounded overflow-x-auto whitespace-pre">
              {q.sql}
            </code>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => onPromote(q)}
                className="px-2 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                승격
              </button>
              <button
                type="button"
                onClick={() => onReject(q)}
                className="px-2 py-0.5 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
              >
                기각
              </button>
              <span className="ml-auto text-[10px] text-zinc-500 dark:text-zinc-400">
                {new Date(q.likedAt).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
