/**
 * @file HistoryTab.tsx
 * @description 주석 변경 이력 — scripts/sql/comment-history/*.sql 파일 목록.
 *
 * 초보자 가이드:
 * - `/api/ai-tables/comment-history?table=X` 호출 결과를 표시.
 * - BEFORE/AFTER 를 분홍/연두로 비교 노출.
 */

'use client';

import useSWR from 'swr';
import { api } from '../../_lib/api-client';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  tableName: string;
}

export default function HistoryTab({ tableName }: Props) {
  const { data, error, isLoading } = useSWR(
    ['comment-history', tableName],
    () => api.commentHistory(tableName),
  );

  if (error) {
    return (
      <div className="p-2 text-red-600 dark:text-red-400">
        이력 로드 실패: {error.message ?? String(error)}
      </div>
    );
  }
  if (isLoading || !data) {
    return <div className="text-sm text-zinc-500">로딩...</div>;
  }

  const entries = (data.entries ?? []) as any[];
  if (entries.length === 0) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        아직 주석 변경 이력이 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <li
          key={e.filename}
          className="p-3 border rounded border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span>
              {e.timestamp ?? '?'} · {e.osUser ?? '?'}
              {e.column ? ` · ${e.column}` : ''}
              <span className="ml-1 opacity-70">({e.changeType})</span>
            </span>
            <span className="font-mono text-[10px]">{e.filename}</span>
          </div>
          <div className="text-xs mb-1">
            <span className="text-zinc-500 dark:text-zinc-400">전: </span>
            <span className="line-through text-red-700 dark:text-red-300">
              {e.before ?? '(없음)'}
            </span>
          </div>
          <div className="text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">후: </span>
            <span className="text-green-700 dark:text-green-300">
              {e.after ?? '(없음)'}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
