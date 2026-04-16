'use client';

import { useEffect, useMemo, useRef } from 'react';
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
}

const SUGGESTION_CATEGORIES = [
  {
    title: '생산',
    icon: BarChart3,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    questions: [
      '오늘 라인별 생산 실적 요약',
      '어제 대비 오늘 조립 공정 실적 비교',
      '최근 7일 생산 추이 차트로 보여줘',
      '라인별 UPH 순위 알려줘',
    ],
  },
  {
    title: '품질',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    questions: [
      '오늘 불량 상위 라인 알려줘',
      '최근 7일 FPY 추이 분석해줘',
      'AOI/ICT 불량 유형 비중 보여줘',
      '이상치 있는 라인 찾아줘',
    ],
  },
  {
    title: 'KPI',
    icon: TrendingUp,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    questions: [
      '목표 대비 실적 달성률 알려줘',
      '라인별 생산성 순위 보여줘',
      '재작업률 높은 라인 알려줘',
      '주간 KPI 변화 요약해줘',
    ],
  },
  {
    title: '설비',
    icon: Cpu,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    questions: [
      '오늘 설비 알람 빈도 Top 10',
      '현재 MSL 경고 자재 목록',
      '설비 이상 로그 최근 20건',
      '라인별 설비 가동률 비교',
    ],
  },
  {
    title: '환경',
    icon: Thermometer,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    questions: [
      '온습도 기준 초과 구역 알려줘',
      '작업장 환경 경고 현황 요약',
      '최근 환경 이상 이벤트 추이',
      '환경값 급변 구간 찾아줘',
    ],
  },
  {
    title: '추적',
    icon: Link2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    questions: [
      '특정 바코드 공정 이력 조회',
      '입고/출고 수량 비교',
      '리페어 이력 최근 내역',
      '자재 사용 이력 보여줘',
    ],
  },
];

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
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTrigger = streamingText?.length ?? 0;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isStreaming, scrollTrigger]);

  const renderedMessages = useMemo(() => {
    const items: Array<{ msg: ChatMessageRow; resultRows?: Record<string, unknown>[] }> = [];
    let latestRows: Record<string, unknown>[] = [];

    for (const msg of messages) {
      if (msg.role === 'sql_result') {
        latestRows = parseRows(msg.resultJson);
        items.push({ msg });
        continue;
      }

      if (msg.role === 'assistant') {
        items.push({ msg, resultRows: latestRows });
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
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">MES AI 어시스턴트</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            생산, 품질, 설비, 추적 데이터를 자연어로 조회하세요.
          </p>
        </div>

        <div className="grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-3">
          {SUGGESTION_CATEGORIES.map((cat) => {
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
      {renderedMessages.map(({ msg, resultRows }) => (
        <MessageBubble key={msg.messageId} message={msg} resultRows={resultRows} />
      ))}

      {isStreaming && streamingText && (
        <div className="px-4 py-2">
          <div className="flex items-start gap-2">
            {streamingStage && (
              <span className="mt-1 shrink-0 rounded-full bg-cyan-600/20 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                {streamingStage === 'context_selection'
                  ? '컨텍스트 선택'
                  : streamingStage === 'sql_generation'
                    ? 'SQL 생성'
                    : '분석'}
              </span>
            )}
            <div className="max-w-2xl whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {streamingText}
              <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-cyan-500" />
            </div>
          </div>
        </div>
      )}

      {isStreaming && selectedContext && (
        <div className="px-4 py-1">
          <div className="max-w-3xl rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
            <div>선택 site: {selectedContext.site}</div>
            <div>tables: {selectedContext.tables.join(', ') || '-'}</div>
            <div>domains: {selectedContext.domains.join(', ') || '-'}</div>
          </div>
        </div>
      )}

      {isStreaming && !streamingText && (
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-cyan-500" />
            응답 생성 중...
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
