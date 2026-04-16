/**
 * @file src/app/ai-chat/_components/ChatLayout.tsx
 * @description 좌측 세션 사이드바 + 우측 본문(MessageList + ChatInput) 레이아웃.
 *
 * 초보자 가이드:
 * - currentSessionId 상태로 사이드바 ↔ 본문 동기화
 * - 세션 변경 시 본문 메시지 다시 로드
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings } from 'lucide-react';
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

  // 세션 변경 시 메시지 로드
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
    <div className="flex h-full flex-col">
      {/* 상단 네비게이션 바 */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ArrowLeft className="size-4" />
            메인메뉴
          </Link>
          <span className="text-sm font-medium text-zinc-200">AI 어시스턴트</span>
        </div>
        <Link href="/settings/ai-models" className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
          <Settings className="size-4" />
          모델 설정
        </Link>
      </header>

      {/* 본문: 사이드바 + 채팅 영역 */}
      <div className="flex min-h-0 flex-1">
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
    </div>
  );
}
