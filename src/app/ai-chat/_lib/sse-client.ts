/**
 * @file src/app/ai-chat/_lib/sse-client.ts
 * @description fetch + ReadableStream 기반 SSE 파서. EventSource는 POST를 못 받음.
 */
import { createParser, type EventSourceMessage } from 'eventsource-parser';

export interface SseEvent {
  event: string;
  data: unknown;
}

export async function postSse(
  url: string,
  body: unknown,
  onEvent: (ev: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  // LLM 응답은 오래 걸릴 수 있으므로 5분 타임아웃 (기본 fetch는 ~30초)
  const controller = !signal ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 5 * 60 * 1000) : null;
  const effectiveSignal = signal || controller?.signal;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify(body),
    signal: effectiveSignal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`SSE ${res.status}`);
  }

  const parser = createParser({
    onEvent(ev: EventSourceMessage) {
      try {
        onEvent({ event: ev.event || 'message', data: JSON.parse(ev.data) });
      } catch {
        onEvent({ event: ev.event || 'message', data: ev.data });
      }
    },
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
