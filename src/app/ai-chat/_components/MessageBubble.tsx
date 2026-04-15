/**
 * @file src/app/ai-chat/_components/MessageBubble.tsx
 * @description 역할별 메시지 버블 — user(우측), assistant(좌측), sql(코드블록), sql_result(테이블/차트)
 */
'use client';

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
  if (message.role === 'system') return null;

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-2">
        <div className="max-w-2xl rounded-2xl bg-cyan-600 px-4 py-2 text-white">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === 'sql') {
    return (
      <div className="px-4 py-2">
        <div className="rounded-md bg-zinc-900 p-3 font-mono text-xs text-zinc-300">
          <div className="mb-1 text-zinc-500">
            ✓ SQL {message.execMs ? `(${message.execMs}ms)` : ''}
          </div>
          <pre className="whitespace-pre-wrap">{message.sqlText}</pre>
          {message.content && <div className="mt-2 text-zinc-400">{message.content}</div>}
        </div>
      </div>
    );
  }

  if (message.role === 'sql_result' && message.resultJson) {
    let rows: Record<string, unknown>[] = [];
    try { rows = JSON.parse(message.resultJson); } catch { /* 무시 */ }
    return (
      <div className="px-4 py-2">
        <ResultTable rows={rows} />
      </div>
    );
  }

  // assistant
  const chartSpec = message.content ? extractChartSpec(message.content) : null;
  return (
    <div className="flex justify-start px-4 py-2">
      <div className="max-w-2xl whitespace-pre-wrap rounded-2xl bg-zinc-800 px-4 py-2 text-zinc-100">
        {message.content || '...'}
        {chartSpec && <ResultChart spec={chartSpec} rows={[]} />}
      </div>
    </div>
  );
}
