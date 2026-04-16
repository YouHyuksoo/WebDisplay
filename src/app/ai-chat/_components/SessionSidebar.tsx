/**
 * @file src/app/ai-chat/_components/SessionSidebar.tsx
 * @description 좌측 세션 목록 — 신규 버튼, 세션 클릭 시 선택, 인라인 삭제 확인.
 *   alert/confirm 사용 금지 — 인라인 확인 UI 사용.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, MessageSquareText, Trash2, Check, X } from 'lucide-react';
import type { SessionMeta } from '@/lib/ai/chat-store';

interface Props {
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

export default function SessionSidebar({ currentSessionId, onSelect, onNew }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/ai-chat/sessions');
    const d = await r.json();
    setSessions(d.sessions || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refresh(); }, [currentSessionId, refresh]);

  const handleDelete = async (sid: string) => {
    await fetch(`/api/ai-chat/sessions/${sid}`, { method: 'DELETE' });
    if (currentSessionId === sid) onSelect('');
    setConfirmDeleteId(null);
    refresh();
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500"
        >
          <Plus className="size-4" />
          새 대화
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-zinc-500">아직 대화가 없습니다</div>
        )}
        {sessions.map((s) => (
          <div key={s.sessionId}>
            <button
              onClick={() => onSelect(s.sessionId)}
              className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
                currentSessionId === s.sessionId
                  ? 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
              }`}
            >
              <MessageSquareText className="size-4 shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1 truncate">{s.title}</span>
              <Trash2
                className="size-4 shrink-0 text-zinc-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(s.sessionId); }}
              />
            </button>
            {/* 인라인 삭제 확인 */}
            {confirmDeleteId === s.sessionId && (
              <div className="ml-6 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs dark:bg-red-950/30">
                <span className="flex-1 text-red-600 dark:text-red-400">삭제할까요?</span>
                <button onClick={() => handleDelete(s.sessionId)}
                  className="rounded p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50">
                  <Check className="size-3" />
                </button>
                <button onClick={() => setConfirmDeleteId(null)}
                  className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
