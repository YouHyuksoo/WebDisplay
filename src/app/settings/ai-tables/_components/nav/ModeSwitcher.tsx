/**
 * @file ModeSwitcher.tsx
 * @description 좌측 상단 상위 모드 스위처 (테이블 ↔ 도메인).
 *
 * 초보자 가이드:
 * - Zustand store.mode 에 바인딩.
 * - 2개 탭 중 활성 탭에 강조 스타일.
 */

'use client';

import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import type { AiTablesMode } from '../../_hooks/useAiTablesStore';

const MODES: Array<{ id: AiTablesMode; label: string }> = [
  { id: 'tables', label: '🗃️ 테이블' },
  { id: 'domains', label: '📚 도메인' },
];

export default function ModeSwitcher() {
  const mode = useAiTablesStore((s) => s.mode);
  const setMode = useAiTablesStore((s) => s.setMode);
  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMode(m.id)}
          className={`flex-1 py-2 text-sm transition-colors ${
            mode === m.id
              ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
