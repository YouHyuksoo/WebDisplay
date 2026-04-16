/**
 * @file src/app/ai-chat/_components/ChatLayout.tsx
 * @description 좌측 세션 사이드바 + 우측 본문 레이아웃.
 *   모델/페르소나 선택은 DisplayHeader extraHeaderContent로 배치 (wbsmaster 패턴).
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import DisplayLayout from '@/components/display/DisplayLayout';
import SessionSidebar from './SessionSidebar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import PersonaPicker from './PersonaPicker';
import ModelPicker from './ModelPicker';
import type { ChatMessageRow } from '@/lib/ai/chat-store';
import type { ProviderId } from '@/lib/ai/providers/types';

interface PendingConfirm {
  sessionId: string;
  messageId: string;
  sql: string;
  estimatedCost?: number;
  estimatedRows?: number;
  reason?: string;
}

interface SelectedContext {
  tables: string[];
  domains: string[];
  site: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  claude: 'bg-orange-500/20 text-orange-400',
  gemini: 'bg-blue-500/20 text-blue-400',
  mistral: 'bg-amber-500/20 text-amber-400',
  kimi: 'bg-cyan-500/20 text-cyan-400',
};

export default function ChatLayout() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [providerId, setProviderId] = useState<ProviderId>('mistral');
  const [modelId, setModelId] = useState<string>('');
  const [personaId, setPersonaId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedInput, setSuggestedInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [streamingStage, setStreamingStage] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [selectedContext, setSelectedContext] = useState<SelectedContext | null>(null);

  useEffect(() => {
    if (!currentSessionId) return;
    fetch(`/api/ai-chat/sessions/${currentSessionId}/messages`, { cache: 'no-store' })
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

  const refreshMessages = useCallback(async (overrideId?: string) => {
    const sid = overrideId || currentSessionId;
    if (!sid) return;
    const r = await fetch(`/api/ai-chat/sessions/${sid}/messages`, { cache: 'no-store' });
    const d = await r.json();
    setMessages(d.messages || []);
  }, [currentSessionId]);

  const headerContent = (
    <div className="flex items-center gap-2">
      {/* 현재 모델 뱃지 */}
      {modelId && (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PROVIDER_COLORS[providerId] || 'bg-zinc-700 text-zinc-300'}`}>
          {modelId.replace(/^(claude-|gemini-|mistral-|moonshot-|kimi-)/, '').replace(/-latest$/, '')}
        </span>
      )}
      {/* 페르소나 선택 */}
      <PersonaPicker value={personaId} onChange={setPersonaId} />
      {/* 모델 선택 */}
      <ModelPicker
        providerId={providerId}
        modelId={modelId}
        onProviderChange={setProviderId}
        onModelChange={setModelId}
      />
    </div>
  );

  return (
    <DisplayLayout title="AI 어시스턴트" extraHeaderContent={headerContent} hideTimingBadge>
      <div className="flex h-full">
        <SessionSidebar
          currentSessionId={currentSessionId}
          onSelect={setCurrentSessionId}
          onNew={handleSessionCreate}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <MessageList
            messages={currentSessionId ? messages : []}
            isStreaming={isStreaming}
            streamingText={streamingText}
            streamingStage={streamingStage}
            pendingConfirm={pendingConfirm}
            onConfirm={async () => { setPendingConfirm(null); await refreshMessages(); }}
            onDismissPendingConfirm={() => setPendingConfirm(null)}
            onSuggestionClick={setSuggestedInput}
            selectedContext={selectedContext}
            sessionId={currentSessionId ?? undefined}
            providerId={providerId}
            modelId={modelId}
          />
          <ChatInput
            sessionId={currentSessionId}
            providerId={providerId}
            modelId={modelId}
            personaId={personaId}
            onStreamStart={() => { setIsStreaming(true); setStreamingText(''); setStreamingStage(''); setPendingConfirm(null); setSelectedContext(null); }}
            onStreamEnd={async (sid?: string) => { await refreshMessages(sid); setIsStreaming(false); setStreamingText(''); setStreamingStage(''); }}
            onStreamToken={(delta, stage) => {
              if (stage) setStreamingStage(stage);
              if (delta) setStreamingText((prev) => prev + delta);
            }}
            onConfirmRequired={(payload) => setPendingConfirm(payload)}
            onContextSelected={(ctx) => setSelectedContext(ctx)}
            onSessionAutoCreate={(sid) => setCurrentSessionId(sid)}
            suggestedInput={suggestedInput}
            onSuggestedInputHandled={() => setSuggestedInput('')}
          />
        </div>
      </div>
    </DisplayLayout>
  );
}
