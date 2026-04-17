/**
 * @file DomainNav.tsx
 * @description 도메인 모드 좌측 네비게이션 — 도메인 목록 + 자동 제안 버튼.
 *
 * 초보자 가이드:
 * - bootstrap.domains 를 리스트로 렌더. 선택 시 onSelect(id).
 * - 자동 제안: /api/ai-tables/domains/auto-suggest POST → 결과 개수 표시.
 *   (글로벌 CLAUDE.md 규칙상 alert 금지 → 인라인 상태 div 로 표시.)
 * - v1 에서는 생성·수정은 UI에 노출하지 않음 (v2 확장).
 */

'use client';

import { useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function DomainNav({ selectedId, onSelect }: Props) {
  const domains = useAiTablesStore((s) => s.bootstrap?.domains ?? []) as any[];
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const autoSuggest = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await api.autoSuggestDomains();
      const n = res?.suggestions?.length ?? 0;
      if (n === 0) {
        setStatus('추가 제안 없음 (기존 도메인에 이미 포함).');
      } else {
        const preview = (res.suggestions as Array<{ name: string }>)
          .slice(0, 3)
          .map((s) => s.name)
          .join(', ');
        setStatus(`${n}개 제안 — ${preview}${n > 3 ? ' 외' : ''}`);
      }
    } catch (e) {
      setStatus(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-2">
      <button
        type="button"
        onClick={autoSuggest}
        disabled={busy}
        className="w-full mb-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {busy ? '제안 중…' : '🔍 자동 제안'}
      </button>
      {status && (
        <div className="mb-2 text-[11px] text-zinc-600 dark:text-zinc-400 px-1 py-1 rounded bg-zinc-100 dark:bg-zinc-800">
          {status}
        </div>
      )}
      <div className="space-y-0.5">
        {domains.length === 0 && (
          <div className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400">
            도메인이 없습니다.
          </div>
        )}
        {domains.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={`w-full text-left px-2 py-1 text-sm rounded transition-colors ${
              selectedId === d.id
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span className="mr-1">
              {d.excludeFromPrompt ? '🔇' : d.priority === 'key' ? '🔑' : '📊'}
            </span>
            {d.name}{' '}
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({d.members?.length ?? 0})
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
