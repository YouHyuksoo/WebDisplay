/**
 * @file src/app/settings/ai-tables/_hooks/useAiDraftStream.ts
 * @description AI 초안 SSE 클라이언트 훅 — fetch + ReadableStream 파서.
 *
 * 초보자 가이드:
 * - EventSource 가 아닌 fetch POST + Body stream 로 읽는다 (POST SSE 필요).
 * - 버퍼 `buf` 에 디코드된 텍스트를 쌓고 `\n\n` 기준으로 이벤트를 파싱.
 * - 이벤트 포맷: `event: <type>\ndata: <json>\n\n`.
 * - `drafts` 는 누적 배열, `status` 는 idle|streaming|done|error.
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import type { Example, ExampleKind } from '@/lib/ai-tables/types';

export type DraftStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface UseAiDraftStreamResult {
  drafts: Partial<Example>[];
  status: DraftStatus;
  error: string | null;
  totalTokens: number | null;
  start: (count?: number, kinds?: ExampleKind[]) => Promise<void>;
  reset: () => void;
  cancel: () => void;
}

export function useAiDraftStream(
  site: string,
  table: string,
): UseAiDraftStreamResult {
  const [drafts, setDrafts] = useState<Partial<Example>[]>([]);
  const [status, setStatus] = useState<DraftStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setDrafts([]);
    setStatus('idle');
    setError(null);
    setTotalTokens(null);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(
    async (count = 3, kinds: ExampleKind[] = ['exact', 'template']) => {
      reset();
      setStatus('streaming');
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const r = await fetch(
          `/api/ai-tables/${encodeURIComponent(site)}/${encodeURIComponent(table)}/examples/ai-draft`,
          {
            method: 'POST',
            body: JSON.stringify({ count, kinds }),
            headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
          },
        );
        if (!r.ok || !r.body) {
          const text = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}: ${text}`);
        }
        const reader = r.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          // 이벤트 단위 분리
          let sep = buf.indexOf('\n\n');
          while (sep >= 0) {
            const raw = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            const dataLine = raw
              .split('\n')
              .find((l) => l.startsWith('data: '));
            if (dataLine) {
              try {
                const parsed = JSON.parse(dataLine.slice(6));
                if (parsed.type === 'draft' && parsed.example) {
                  setDrafts((prev) => [...prev, parsed.example]);
                } else if (parsed.type === 'done') {
                  setTotalTokens(parsed.totalTokens ?? null);
                  setStatus('done');
                } else if (parsed.type === 'error') {
                  setError(parsed.message ?? 'stream error');
                  setStatus('error');
                }
              } catch {
                // 파싱 실패한 개별 이벤트는 무시
              }
            }
            sep = buf.indexOf('\n\n');
          }
        }
        // reader 가 끝났는데 status 가 streaming 이면 done 으로 정리
        setStatus((s) => (s === 'streaming' ? 'done' : s));
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      } finally {
        abortRef.current = null;
      }
    },
    [site, table, reset],
  );

  return { drafts, status, error, totalTokens, start, reset, cancel };
}
