/**
 * @file src/lib/ai/providers/kimi.ts
 * @description Moonshot Kimi 프로바이더 — OpenAI 호환 API를 fetch로 직접 호출.
 *
 * 초보자 가이드:
 * - 베이스 URL: https://api.moonshot.ai/v1
 * - SSE 스트리밍 응답을 eventsource-parser로 파싱
 */

import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type { AiProvider, ChatStreamOptions, ChatStreamChunk, ConnectionTestResult } from './types';

const BASE_URL = 'https://api.moonshot.ai/v1';
const MODELS = [
  'kimi-k2-0905-preview',
  'moonshot-v1-128k',
  'moonshot-v1-32k',
  'moonshot-v1-8k',
];

export const kimiProvider: AiProvider = {
  id: 'kimi',
  listModels() { return MODELS; },

  async *chatStream(opts: ChatStreamOptions, apiKey: string): AsyncIterable<ChatStreamChunk> {
    try {
      const messages = opts.systemPrompt && !opts.messages.some((m) => m.role === 'system')
        ? [{ role: 'system' as const, content: opts.systemPrompt }, ...opts.messages]
        : opts.messages;

      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: opts.model,
          messages,
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxTokens ?? 4096,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) {
        const txt = await res.text();
        yield { type: 'error', error: `Kimi API ${res.status}: ${txt.slice(0, 200)}` };
        return;
      }

      const queue: ChatStreamChunk[] = [];
      let inTokens = 0;
      let outTokens = 0;
      let done = false;

      const parser = createParser({
        onEvent(ev: EventSourceMessage) {
          if (ev.data === '[DONE]') { done = true; return; }
          try {
            const obj = JSON.parse(ev.data);
            const delta = obj.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length > 0) {
              queue.push({ type: 'token', delta });
            }
            if (obj.usage) {
              inTokens = obj.usage.prompt_tokens ?? 0;
              outTokens = obj.usage.completion_tokens ?? 0;
            }
          } catch { /* JSON 파싱 실패는 무시 */ }
        },
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        parser.feed(decoder.decode(value, { stream: true }));
        while (queue.length > 0) yield queue.shift()!;
        if (done) break;
      }
      yield { type: 'done', tokensIn: inTokens, tokensOut: outTokens };
    } catch (e) {
      yield { type: 'error', error: e instanceof Error ? e.message : String(e) };
    }
  },

  async testConnection(apiKey: string, model = 'moonshot-v1-8k'): Promise<ConnectionTestResult> {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'reply OK' }],
          max_tokens: 10,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, error: `${res.status}: ${txt.slice(0, 200)}` };
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return { ok: text.length > 0, detectedModel: model };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
