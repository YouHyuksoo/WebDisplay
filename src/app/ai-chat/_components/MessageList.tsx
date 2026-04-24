'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3, ShieldCheck, Cpu, Link2, TrendingUp, Thermometer } from 'lucide-react';
import type { ChatMessageRow } from '@/lib/ai/chat-store';
import MessageBubble from './MessageBubble';
import SqlPreviewCard from './SqlPreviewCard';

interface PendingConfirm {
  sessionId: string;
  messageId: string;
  sql: string;
  estimatedCost?: number;
  estimatedRows?: number;
  reason?: string;
}

interface Props {
  messages: ChatMessageRow[];
  isStreaming: boolean;
  streamingText?: string;
  streamingStage?: string;
  pendingConfirm: PendingConfirm | null;
  onConfirm: () => void;
  onDismissPendingConfirm: () => void;
  onSuggestionClick?: (text: string) => void;
  selectedContext?: { tables: string[]; domains: string[]; site: string } | null;
  /** 피드백 저장에 필요한 세션·모델 정보 */
  sessionId?: string;
  providerId?: string;
  modelId?: string;
}

const SUGGESTION_META = [
  { key: 'production', icon: BarChart3, color: 'text-cyan-400',    bgColor: 'bg-cyan-500/10',    borderColor: 'border-cyan-500/20' },
  { key: 'quality',    icon: ShieldCheck, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  { key: 'kpi',        icon: TrendingUp, color: 'text-amber-400',   bgColor: 'bg-amber-500/10',   borderColor: 'border-amber-500/20' },
  { key: 'equipment',  icon: Cpu,        color: 'text-violet-400',  bgColor: 'bg-violet-500/10',  borderColor: 'border-violet-500/20' },
  { key: 'env',        icon: Thermometer, color: 'text-rose-400',   bgColor: 'bg-rose-500/10',    borderColor: 'border-rose-500/20' },
  { key: 'trace',      icon: Link2,      color: 'text-blue-400',    bgColor: 'bg-blue-500/10',    borderColor: 'border-blue-500/20' },
] as const;

function parseRows(json: string | null): Record<string, unknown>[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
  } catch {
    return [];
  }
}

export default function MessageList({
  messages,
  isStreaming,
  streamingText,
  streamingStage,
  pendingConfirm,
  onConfirm,
  onDismissPendingConfirm,
  onSuggestionClick,
  selectedContext,
  sessionId,
  providerId,
  modelId,
}: Props) {
  const t = useTranslations('aiChat');
  const scrollRef = useRef<HTMLDivElement>(null);
  const suggestionCategories = useMemo(
    () => SUGGESTION_META.map((m) => ({
      ...m,
      title: t(`suggestions.${m.key}.title`),
      questions: [0, 1, 2, 3].map((i) => t(`suggestions.${m.key}.q${i}`)),
    })),
    [t],
  );

  const scrollTrigger = streamingText?.length ?? 0;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isStreaming, scrollTrigger]);

  const renderedMessages = useMemo(() => {
    const items: Array<{ msg: ChatMessageRow; resultRows?: Record<string, unknown>[]; userQuery?: string }> = [];
    let latestRows: Record<string, unknown>[] = [];
    let lastUserContent = '';

    for (const msg of messages) {
      if (msg.role === 'user') {
        lastUserContent = msg.content || '';
        items.push({ msg });
        continue;
      }

      if (msg.role === 'sql_result') {
        latestRows = parseRows(msg.resultJson);
        items.push({ msg });
        continue;
      }

      if (msg.role === 'assistant') {
        items.push({ msg, resultRows: latestRows, userQuery: lastUserContent });
        continue;
      }

      items.push({ msg });
    }

    return items;
  }, [messages]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {t('emptySubtitle')}
          </p>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
          {suggestionCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.title} className={`rounded-xl border ${cat.borderColor} ${cat.bgColor} p-3`}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon className={`size-4 ${cat.color}`} />
                  <span className={`text-xs font-semibold ${cat.color}`}>{cat.title}</span>
                </div>
                <div className="space-y-1">
                  {cat.questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onSuggestionClick?.(q)}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-xs leading-snug text-zinc-600 transition-colors hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-white/10"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {renderedMessages.map(({ msg, resultRows, userQuery }) => (
        <MessageBubble
          key={msg.messageId}
          message={msg}
          resultRows={resultRows}
          sessionId={sessionId}
          providerId={providerId}
          modelId={modelId}
          userQuery={userQuery}
        />
      ))}

      {isStreaming && streamingText && (
        <div className="px-4 py-2">
          <div className="flex items-start gap-2">
            {streamingStage && (
              <span className="mt-1 shrink-0 rounded-full bg-cyan-600/20 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                {streamingStage === 'context_selection'
                  ? t('stageContextSelection')
                  : streamingStage === 'sql_generation'
                    ? t('stageSqlGeneration')
                    : t('stageAnalysis')}
              </span>
            )}
            <div className="max-w-2xl whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {streamingText}
              <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-cyan-500" />
            </div>
          </div>
        </div>
      )}

      {/* selectedContext(선택 site/tables/domains) 는 UI 에 노출하지 않는다.
          내부 상태는 유지되어 스트리밍 단계 분기·분석 페이지에서 계속 활용됨. */}

      {isStreaming && !streamingText && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-cyan-500" />
            {t('generatingResponse')}
          </div>
        </div>
      )}

      {pendingConfirm && (
        <SqlPreviewCard
          sessionId={pendingConfirm.sessionId}
          messageId={pendingConfirm.messageId}
          sql={pendingConfirm.sql}
          estimatedCost={pendingConfirm.estimatedCost}
          estimatedRows={pendingConfirm.estimatedRows}
          reason={pendingConfirm.reason}
          onResolved={onConfirm}
          onCancel={onDismissPendingConfirm}
        />
      )}
    </div>
  );
}
