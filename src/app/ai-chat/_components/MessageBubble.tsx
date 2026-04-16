'use client';

import { useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThumbsUp, ThumbsDown, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import type { ChatMessageRow } from '@/lib/ai/chat-store';
import ResultTable from './ResultTable';
import ResultChart from './ResultChart';

/**
 * @description MessageBubble에 전달하는 props
 *   피드백(좋아요/싫어요)을 DB에 영속 저장하기 위해
 *   sessionId, providerId, modelId, userQuery, perf 정보를 추가로 받는다.
 */
interface Props {
  message: ChatMessageRow;
  resultRows?: Record<string, unknown>[];
  sessionId?: string;
  providerId?: string;
  modelId?: string;
  /** 직전 user 메시지의 content (피드백 저장 시 함께 기록) */
  userQuery?: string;
  /** 성능 지표 (피드백 저장 시 함께 기록) */
  perf?: { totalMs?: number; sqlGenMs?: number; sqlExecMs?: number; analysisMs?: number };
}

interface ChartSpec {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  xKey: string;
  yKey: string;
}

interface ParsedChart {
  spec: ChartSpec | null;
  inlineRows: Record<string, unknown>[];
  cleanedText: string;
}

function parseJsonCodeBlock(text: string): Record<string, unknown> | null {
  const m = text.match(/```json\s*({[\s\S]*?})\s*```/i);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1]);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return null;
}

function parseChartDataMarker(text: string): Record<string, unknown>[] {
  const m = text.match(/\[CHART_DATA:(\{[\s\S]*?\})\]/i);
  if (!m) return [];

  try {
    const parsed = JSON.parse(m[1]) as unknown;
    if (!parsed) return [];

    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
    }

    if (typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.labels) && Array.isArray(obj.values)) {
        const labels = obj.labels as unknown[];
        const values = obj.values as unknown[];
        const rows: Record<string, unknown>[] = [];
        for (let i = 0; i < Math.min(labels.length, values.length); i += 1) {
          rows.push({ name: String(labels[i] ?? ''), value: Number(values[i]) || 0 });
        }
        return rows;
      }
    }
  } catch {
    // ignore
  }

  return [];
}

function parseChartSpec(text: string): ParsedChart {
  const fromCode = parseJsonCodeBlock(text);
  const chartTypeMarker = text.match(/\[CHART:([a-z_\-0-9]+)\]/i)?.[1]?.toLowerCase() ?? '';
  const inlineRows = parseChartDataMarker(text);

  const normalizedType = (() => {
    const t = chartTypeMarker.replace(/[-_]/g, '');
    if (!t) return null;
    if (t.includes('bar')) return 'bar';
    if (t.includes('line')) return 'line';
    if (t.includes('pie')) return 'pie';
    if (t.includes('area')) return 'area';
    return null;
  })();

  let spec: ChartSpec | null = null;

  if (fromCode) {
    const chartType = String(fromCode.chartType ?? '').toLowerCase();
    const xKey = String(fromCode.xKey ?? 'name');
    const yKey = String(fromCode.yKey ?? 'value');
    if (['bar', 'line', 'pie', 'area'].includes(chartType) && xKey && yKey) {
      spec = { chartType: chartType as ChartSpec['chartType'], xKey, yKey };
    }
  }

  if (!spec && normalizedType) {
    spec = { chartType: normalizedType, xKey: 'name', yKey: 'value' };
  }

  const cleanedText = text
    .replace(/```json\s*({[\s\S]*?})\s*```/gi, '')
    .replace(/\[CHART:[^\]]+\]/gi, '')
    .replace(/\[CHART_DATA:[\s\S]*?\]/gi, '')
    .trim();

  return { spec, inlineRows, cleanedText };
}

export default function MessageBubble({
  message,
  resultRows = [],
  sessionId,
  providerId,
  modelId,
  userQuery,
  perf,
}: Props) {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sqlOpen, setSqlOpen] = useState(false);

  const parsed = useMemo(() => parseChartSpec(message.content || ''), [message.content]);

  /**
   * @description 좋아요/싫어요 피드백을 DB에 저장·삭제·전환 처리
   *   - 같은 버튼 재클릭 → DELETE (토글 해제)
   *   - 다른 버튼 클릭 → 기존 DELETE 후 새로 POST
   *   - 새로 클릭 → POST
   */
  const handleFeedback = useCallback(
    async (type: 'up' | 'down') => {
      // 같은 버튼 재클릭 → 토글 해제 (DELETE)
      if (feedback === type) {
        if (feedbackId) {
          try {
            await fetch('/api/ai-chat/feedback', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedbackIds: [feedbackId] }),
            });
          } catch {
            // 삭제 실패해도 UI는 해제
          }
        }
        setFeedback(null);
        setFeedbackId(null);
        return;
      }

      // 다른 버튼 클릭 → 기존 삭제 후 새로 POST
      if (feedbackId) {
        try {
          await fetch('/api/ai-chat/feedback', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedbackIds: [feedbackId] }),
          });
        } catch {
          // 삭제 실패해도 계속 진행
        }
      }

      // POST 새 피드백
      const rating = type === 'up' ? 'POSITIVE' : 'NEGATIVE';
      try {
        const res = await fetch('/api/ai-chat/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: message.messageId,
            sessionId: sessionId ?? '',
            rating,
            userQuery: userQuery ?? null,
            llmResponse: message.content ?? null,
            sqlQuery: message.sqlText ?? null,
            providerId: providerId ?? null,
            modelId: modelId ?? null,
            totalMs: perf?.totalMs ?? null,
            sqlGenMs: perf?.sqlGenMs ?? null,
            sqlExecMs: perf?.sqlExecMs ?? null,
            analysisMs: perf?.analysisMs ?? null,
          }),
        });
        const data = await res.json();
        setFeedbackId(data.feedbackId ?? null);
      } catch {
        // POST 실패해도 UI는 반영
      }

      setFeedback(type);
    },
    [feedback, feedbackId, message.messageId, message.content, message.sqlText, sessionId, providerId, modelId, userQuery, perf],
  );
  const chartRows = parsed.inlineRows.length > 0 ? parsed.inlineRows : resultRows;

  if (message.role === 'system') return null;

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-2xl rounded-2xl bg-cyan-600 px-4 py-2 text-white">{message.content}</div>
      </div>
    );
  }

  if (message.role === 'sql') {
    return (
      <div className="px-4 py-1">
        <button onClick={() => setSqlOpen((prev) => !prev)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300">
          {sqlOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          실행된 SQL {message.execMs ? `(${message.execMs}ms)` : ''}
        </button>
        {sqlOpen && (
          <pre className="mt-1 whitespace-pre-wrap rounded-md bg-zinc-100 p-3 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{message.sqlText}</pre>
        )}
      </div>
    );
  }

  if (message.role === 'sql_result' && message.resultJson) {
    let rows: Record<string, unknown>[] = [];
    try {
      const parsedRows = JSON.parse(message.resultJson) as unknown;
      if (Array.isArray(parsedRows)) {
        rows = parsedRows.filter((v): v is Record<string, unknown> => !!v && typeof v === 'object');
      }
    } catch {
      // ignore
    }

    return (
      <div className="px-4 py-2">
        <ResultTable rows={rows} />
      </div>
    );
  }

  const handleCopy = async () => {
    if (!message.content) return;
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-3xl">
        <div className="prose prose-sm prose-zinc max-w-none rounded-2xl bg-zinc-100 px-5 py-3 dark:prose-invert dark:bg-zinc-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.cleanedText || '...'}</ReactMarkdown>
          {parsed.spec && <ResultChart spec={parsed.spec} rows={chartRows} />}
        </div>

        <div className="mt-1 flex items-center gap-1 px-2">
          <button
            onClick={() => handleFeedback('up')}
            className={`rounded p-1 transition-colors ${feedback === 'up' ? 'text-cyan-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            title="도움이 됐어요"
          >
            <ThumbsUp className="size-3.5" />
          </button>
          <button
            onClick={() => handleFeedback('down')}
            className={`rounded p-1 transition-colors ${feedback === 'down' ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            title="도움이 안됐어요"
          >
            <ThumbsDown className="size-3.5" />
          </button>
          <button onClick={handleCopy} className="rounded p-1 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300" title="복사">
            {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
