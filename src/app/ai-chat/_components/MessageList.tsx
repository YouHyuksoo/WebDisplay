/**
 * @file src/app/ai-chat/_components/MessageList.tsx
 * @description 메시지 스크롤 영역. 빈 화면 시 샘플 프롬프트 4개 표시.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessageRow } from '@/lib/ai/chat-store';
import MessageBubble from './MessageBubble';
import SqlPreviewCard from './SqlPreviewCard';

interface PendingConfirm {
  messageId: string;
  sql: string;
  estimatedCost?: number;
  estimatedRows?: number;
  reason?: string;
}

interface Props {
  messages: ChatMessageRow[];
  isStreaming: boolean;
  onConfirm: () => void;
}

const SAMPLE_PROMPTS = [
  '오늘 P51 야간 FPY 알려줘',
  '어제 SMD 라인별 생산수량 비교',
  '이번 주 CTQ 이상점 라인 톱 5',
  'SMPS 라인 시간대별 실적 차트',
];

export default function MessageList({ messages, isStreaming, onConfirm }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingConfirm] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-2xl font-bold text-zinc-300">무엇을 도와드릴까요?</h2>
        <div className="grid max-w-2xl grid-cols-2 gap-3">
          {SAMPLE_PROMPTS.map((p) => (
            <div key={p} className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-300 hover:border-cyan-700 hover:bg-zinc-800">
              {p}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {messages.map((m) => <MessageBubble key={m.messageId} message={m} />)}
      {pendingConfirm && (
        <SqlPreviewCard
          messageId={pendingConfirm.messageId}
          sql={pendingConfirm.sql}
          estimatedCost={pendingConfirm.estimatedCost}
          estimatedRows={pendingConfirm.estimatedRows}
          reason={pendingConfirm.reason}
          onResolved={onConfirm}
        />
      )}
    </div>
  );
}
