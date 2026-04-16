/**
 * @file src/app/ai-chat/_components/MessageBubble.tsx
 * @description 역할별 메시지 버블 — wbsmaster 패턴 반영.
 *   assistant: 마크다운 렌더 + SQL 접기 + 좋아요/싫어요/복사 + 차트
 */
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThumbsUp, ThumbsDown, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChatMessageRow } from '@/lib/ai/chat-store';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';

interface Props {
  message: ChatMessageRow;
}

interface ChartSpec { chartType: 'bar'|'line'|'pie'|'area'; xKey: string; yKey: string; }

function extractChartSpec(text: string): ChartSpec | null {
  const m = text.match(/```json\s*({[\s\S]*?})\s*```/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[1]);
    if (obj.chartType && obj.xKey && obj.yKey) return obj as ChartSpec;
  } catch { /* 무시 */ }
  return null;
}

export default function MessageBubble({ message }: Props) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [copied, setCopied] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);

  if (message.role === 'system') return null;

  // user 버블
  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-2xl rounded-2xl bg-cyan-600 px-4 py-2 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  // sql 버블 — 접기/펼치기
  if (message.role === 'sql') {
    return (
      <div className="px-4 py-1">
        <button
          onClick={() => setSqlOpen(!sqlOpen)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          {sqlOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          실행된 SQL {message.execMs ? `(${message.execMs}ms)` : ''}
        </button>
        {sqlOpen && (
          <pre className="mt-1 rounded-md bg-zinc-100 p-3 font-mono text-xs text-zinc-700 whitespace-pre-wrap dark:bg-zinc-900 dark:text-zinc-300">
            {message.sqlText}
          </pre>
        )}
      </div>
    );
  }

  // sql_result 버블
  if (message.role === 'sql_result' && message.resultJson) {
    let rows: Record<string, unknown>[] = [];
    try { rows = JSON.parse(message.resultJson); } catch { /* 무시 */ }
    return (
      <div className="px-4 py-2">
        <ResultTable rows={rows} />
      </div>
    );
  }

  // assistant 버블 — 마크다운 + 피드백 + 복사
  const chartSpec = message.content ? extractChartSpec(message.content) : null;

  const handleCopy = async () => {
    if (!message.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-3xl">
        {/* 마크다운 본문 */}
        <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert rounded-2xl bg-zinc-100 px-5 py-3 dark:bg-zinc-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content || '...'}
          </ReactMarkdown>
          {chartSpec && <ResultChart spec={chartSpec} rows={[]} />}
        </div>

        {/* 하단 액션 바: 좋아요 / 싫어요 / 복사 */}
        <div className="mt-1 flex items-center gap-1 px-2">
          <button
            onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
            className={`rounded p-1 transition-colors ${
              feedback === 'up' ? 'text-cyan-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
            title="도움이 됐어요"
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
            className={`rounded p-1 transition-colors ${
              feedback === 'down' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
            title="도움이 안됐어요"
          >
            <ThumbsDown className="size-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            title="복사"
          >
            {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
          </button>
          {feedback && (
            <span className="ml-1 text-[10px] text-zinc-400">
              {feedback === 'up' ? '감사합니다!' : '개선하겠습니다'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
