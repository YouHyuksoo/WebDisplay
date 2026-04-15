/**
 * @file src/app/ai-chat/_components/ChatInput.tsx
 * @description 하단 입력창 — 메시지 입력 + 페르소나/모델 선택 + 전송.
 */
'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { postSse } from '../_lib/sse-client';
import PersonaPicker from './PersonaPicker';
import ModelPicker from './ModelPicker';
import type { ProviderId } from '@/lib/ai/providers/types';

interface Props {
  sessionId: string | null;
  providerId: ProviderId;
  modelId: string;
  personaId: string;
  onProviderChange: (id: ProviderId) => void;
  onModelChange: (id: string) => void;
  onPersonaChange: (id: string) => void;
  onStreamStart: () => void;
  onStreamEnd: () => void;
  onSessionAutoCreate: (sessionId: string) => void;
}

export default function ChatInput({
  sessionId, providerId, modelId, personaId,
  onProviderChange, onModelChange, onPersonaChange,
  onStreamStart, onStreamEnd, onSessionAutoCreate,
}: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    onStreamStart();

    try {
      let sid = sessionId;
      if (!sid) {
        const res = await fetch('/api/ai-chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, modelId, personaId, title: text.slice(0, 60) }),
        });
        const data = await res.json();
        sid = data.sessionId;
        if (sid) onSessionAutoCreate(sid);
      }

      await postSse('/api/ai-chat/stream', {
        sessionId: sid, prompt: text, providerId, modelId, personaId,
      }, () => { /* 토큰 이벤트는 onStreamEnd 후 messages 재로드로 표시 */ });

      setText('');
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
      onStreamEnd();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-900 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PersonaPicker value={personaId} onChange={onPersonaChange} />
          <ModelPicker providerId={providerId} modelId={modelId} onProviderChange={onProviderChange} onModelChange={onModelChange} />
        </div>
      </div>
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder="질문을 입력하세요… (Shift+Enter 줄바꿈)"
          className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-cyan-600 focus:outline-none"
          disabled={busy}
        />
        <button
          onClick={handleSend}
          disabled={busy || !text.trim()}
          className="flex items-center justify-center rounded-md bg-cyan-600 px-4 text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
