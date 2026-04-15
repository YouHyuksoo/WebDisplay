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
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
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
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    parser.feed(decoder.decode(value, { stream: true }));
  }
}
