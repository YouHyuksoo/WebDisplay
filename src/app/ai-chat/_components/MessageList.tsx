/**
 * @file src/app/ai-chat/_components/MessageList.tsx
 * @description 메시지 스크롤 영역. 빈 화면 시 MES 도메인 카테고리별 예시 질문 표시.
 *   WebDisplay 실제 화면(투입/포장/SMD/SPI/AOI/CTQ/설비/추적)을 분석해 예시 구성.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, ShieldCheck, Cpu, Link2, TrendingUp, Thermometer } from 'lucide-react';
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
  streamingText?: string;
  streamingStage?: string;
  onConfirm: () => void;
  onSuggestionClick?: (text: string) => void;
}

/* ------------------------------------------------------------------ */
/*  MES 도메인 카테고리별 예시 질문 — WebDisplay 화면 기반              */
/* ------------------------------------------------------------------ */

const SUGGESTION_CATEGORIES = [
  {
    title: '생산 현황',
    icon: BarChart3,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    questions: [
      '오늘 SMPS 라인별 시프트별 생산수량 합계',
      '어제 대비 오늘 포장(W220) 실적 비교',
      '이번 주 SMD 라인 일별 생산 추이 차트',
      'P51 라인 시간대별 목표 대비 실적',
    ],
  },
  {
    title: '품질 분석',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    questions: [
      '오늘 AOI 검사 라인별 불량률 순위',
      '이번 달 CTQ A등급 이상점 발생 라인 톱 5',
      'SPI 검사 결과 최근 7일 추이',
      'EOL 검사 불량 유형별 파레토 차트',
    ],
  },
  {
    title: 'KPI / FPY',
    icon: TrendingUp,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    questions: [
      '라인별 UPH 달성률 순위 (오늘)',
      '이번 주 FPY 워스트 5 라인',
      '일간 생산 계획 달성률 차트',
      '라인별 작업자 수 대비 생산량 비교',
    ],
  },
  {
    title: '설비 / 자재',
    icon: Cpu,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    questions: [
      '현재 MSL 경고 발생 자재 목록',
      '오늘 설비 알람 최근 20건',
      '솔더 투입 이력 (오늘 전체 라인)',
      '마운터 에러 빈도 톱 10',
    ],
  },
  {
    title: '환경 / 안전',
    icon: Thermometer,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    questions: [
      '현재 온습도 기준 초과 구역',
      '납땜 경고 현황',
      'Foolproof 체크 실패 라인',
      '코팅 비전 검사 불량률',
    ],
  },
  {
    title: '추적 / 이력',
    icon: Link2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    questions: [
      '런카드별 투입/포장 수량 비교',
      '매거진 재고 현황 (라인별)',
      '팩 시리얼 최근 출하 이력',
      '자재 수불 내역 (오늘)',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  컴포넌트                                                           */
/* ------------------------------------------------------------------ */

export default function MessageList({ messages, isStreaming, streamingText, streamingStage, onConfirm, onSuggestionClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pendingConfirm] = useState<PendingConfirm | null>(null);

  const scrollTrigger = streamingText?.length ?? 0;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isStreaming, scrollTrigger]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">MES AI 어시스턴트</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            생산·품질·설비·추적 데이터를 자연어로 질의하세요
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

        <p className="text-xs text-zinc-400">예시를 클릭하면 입력창에 자동으로 채워집니다</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {messages.map((m) => <MessageBubble key={m.messageId} message={m} />)}
      {/* 스트리밍 중 실시간 표시 */}
      {isStreaming && streamingText && (
        <div className="px-4 py-2">
          <div className="flex items-start gap-2">
            {streamingStage && (
              <span className="mt-1 shrink-0 rounded-full bg-cyan-600/20 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                {streamingStage === 'sql_generation' ? 'SQL 생성' : '분석'}
              </span>
            )}
            <div className="max-w-2xl whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-2 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
              {streamingText}
              <span className="ml-1 inline-block size-2 animate-pulse rounded-full bg-cyan-500" />
            </div>
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
