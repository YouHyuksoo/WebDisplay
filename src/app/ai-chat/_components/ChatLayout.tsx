/**
 * @file src/app/ai-chat/_components/ChatLayout.tsx
 * @description 좌측 세션 사이드바 + 우측 본문(MessageList + ChatInput) 레이아웃.
 *   표준 DisplayLayout(언어·테마·시각·뒤로가기)을 공유.
 *
 * 초보자 가이드:
 * - currentSessionId 상태로 사이드바 ↔ 본문 동기화
 * - 세션 변경 시 본문 메시지 다시 로드
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import DisplayLayout from '@/components/display/DisplayLayout';
import SessionSidebar from './SessionSidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { ChatMessageRow } from '@/lib/ai/chat-store';
import type { ProviderId } from '@/lib/ai/providers/types';

export default function ChatLayout() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [providerId, setProviderId] = useState<ProviderId>('claude');
  const [modelId, setModelId] = useState<string>('');
  const [personaId, setPersonaId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    fetch(`/api/ai-chat/sessions/${currentSessionId}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch(() => setMessages([]));
  }, [currentSessionId]);

  const handleSessionCreate = useCallback(async () => {
    const res = await fetch('/api/ai-chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId, modelId, personaId }),
    });
    const data = await res.json();
    setCurrentSessionId(data.sessionId);
  }, [providerId, modelId, personaId]);

  const refreshMessages = useCallback(async () => {
    if (!currentSessionId) return;
    const r = await fetch(`/api/ai-chat/sessions/${currentSessionId}/messages`);
    const d = await r.json();
    setMessages(d.messages || []);
  }, [currentSessionId]);

  return (
    <DisplayLayout title="AI 어시스턴트">
      <div className="flex h-full">
        <SessionSidebar
          currentSessionId={currentSessionId}
          onSelect={setCurrentSessionId}
          onNew={handleSessionCreate}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            onConfirm={refreshMessages}
          />
          <ChatInput
            sessionId={currentSessionId}
            providerId={providerId}
            modelId={modelId}
            personaId={personaId}
            onProviderChange={setProviderId}
            onModelChange={setModelId}
            onPersonaChange={setPersonaId}
            onStreamStart={() => setIsStreaming(true)}
            onStreamEnd={() => { setIsStreaming(false); refreshMessages(); }}
            onSessionAutoCreate={(sid) => setCurrentSessionId(sid)}
          />
        </div>
      </div>
    </DisplayLayout>
  );
}
