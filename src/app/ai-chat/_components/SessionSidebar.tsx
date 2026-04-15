/**
 * @file src/app/ai-chat/_components/SessionSidebar.tsx
 * @description 좌측 세션 목록 — 신규 버튼, 세션 클릭 시 선택, 삭제 버튼.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, MessageSquareText, Trash2 } from 'lucide-react';
import type { SessionMeta } from '@/lib/ai/chat-store';

interface Props {
  currentSessionId: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
}

export default function SessionSidebar({ currentSessionId, onSelect, onNew }: Props) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/ai-chat/sessions');
    const d = await r.json();
    setSessions(d.sessions || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { refresh(); }, [currentSessionId, refresh]);

  const handleDelete = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (!confirm('이 대화를 삭제할까요?')) return;
    await fetch(`/api/ai-chat/sessions/${sid}`, { method: 'DELETE' });
    if (currentSessionId === sid) onSelect('');
    refresh();
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 p-3">
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
          <button
            key={s.sessionId}
            onClick={() => onSelect(s.sessionId)}
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
              currentSessionId === s.sessionId ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800/60'
            }`}
          >
            <MessageSquareText className="size-4 shrink-0 text-zinc-500" />
            <span className="min-w-0 flex-1 truncate">{s.title}</span>
            <Trash2
              className="size-4 shrink-0 text-zinc-600 opacity-0 hover:text-red-400 group-hover:opacity-100"
              onClick={(e) => handleDelete(e, s.sessionId)}
            />
          </button>
        ))}
      </nav>
    </aside>
  );
}
