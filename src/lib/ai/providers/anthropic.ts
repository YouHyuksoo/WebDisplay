/**
 * @file src/lib/ai/providers/anthropic.ts
 * @description Anthropic Claude 프로바이더 — @anthropic-ai/sdk 사용.
 *
 * 초보자 가이드:
 * - Claude는 system 프롬프트를 별도 파라미터로 받음 (messages에서 분리)
 * - 스트리밍은 messages.stream() → MessageStreamEvent 비동기 이터레이터
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider, ChatStreamOptions, ChatStreamChunk, ConnectionTestResult } from './types';

const MODELS = [
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
];

export const anthropicProvider: AiProvider = {
  id: 'claude',

  listModels() {
    return MODELS;
  },

  async *chatStream(opts: ChatStreamOptions, apiKey: string): AsyncIterable<ChatStreamChunk> {
    const client = new Anthropic({ apiKey });
    const systemMsg = opts.messages.find((m) => m.role === 'system')?.content ?? opts.systemPrompt;
    const userAssistantMsgs = opts.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = client.messages.stream({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.3,
      system: systemMsg,
      messages: userAssistantMsgs,
    });

    let inTokens = 0;
    let outTokens = 0;

    try {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'token', delta: event.delta.text };
        } else if (event.type === 'message_delta' && event.usage) {
          outTokens = event.usage.output_tokens;
        } else if (event.type === 'message_start' && event.message.usage) {
          inTokens = event.message.usage.input_tokens;
        }
      }
      yield { type: 'done', tokensIn: inTokens, tokensOut: outTokens };
    } catch (e) {
      yield { type: 'error', error: e instanceof Error ? e.message : String(e) };
    }
  },

  async testConnection(apiKey: string, model = 'claude-haiku-4-5-20251001'): Promise<ConnectionTestResult> {
    try {
      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'reply OK' }],
      });
      const text = res.content[0].type === 'text' ? res.content[0].text : '';
      return { ok: text.length > 0, detectedModel: res.model };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
