/**
 * @file src/lib/ai/providers/mistral.ts
 * @description Mistral AI 프로바이더 — @mistralai/mistralai v2.2.0 사용.
 *
 * 초보자 가이드:
 * - Mistral은 OpenAI 호환 messages 배열 그대로 사용 (role: system/user/assistant)
 * - system 메시지는 messages 첫 번째에 포함시켜 전달 (별도 systemPrompt 파라미터 없음)
 * - SDK v2는 named export `Mistral`을 사용 (v1의 default export와 다름)
 * - 스트리밍 이벤트는 `event.data.choices[0].delta.content` 구조 (OpenAI와 유사)
 * - usage 필드명은 camelCase: promptTokens / completionTokens (Outbound는 snake_case)
 */

import { Mistral } from '@mistralai/mistralai';
import type {
  AiProvider,
  ChatStreamOptions,
  ChatStreamChunk,
  ConnectionTestResult,
} from './types';

const MODELS = [
  'mistral-large-latest',
  'mistral-medium-latest',
  'mistral-small-latest',
  'codestral-latest',
];

export const mistralProvider: AiProvider = {
  id: 'mistral',
  listModels() {
    return MODELS;
  },

  async *chatStream(
    opts: ChatStreamOptions,
    apiKey: string,
  ): AsyncIterable<ChatStreamChunk> {
    try {
      const client = new Mistral({ apiKey });

      // system 메시지가 없고 systemPrompt가 있으면 앞에 삽입
      const hasSystem = opts.messages.some((m) => m.role === 'system');
      const prepared =
        opts.systemPrompt && !hasSystem
          ? [
              { role: 'system' as const, content: opts.systemPrompt },
              ...opts.messages,
            ]
          : opts.messages;

      // SDK 메시지 유니온 타입은 role별로 다르게 요구되지만
      // 실제로는 { role, content } 형태면 모두 허용됨 → 캐스팅으로 해결.
      const messages = prepared.map((m) => ({
        role: m.role,
        content: m.content,
      })) as Parameters<typeof client.chat.stream>[0]['messages'];

      const stream = await client.chat.stream({
        model: opts.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        maxTokens: opts.maxTokens ?? 4096,
      });

      let inTokens = 0;
      let outTokens = 0;
      for await (const event of stream) {
        const chunk = event.data;
        const deltaContent = chunk.choices[0]?.delta?.content;
        // delta.content는 string | ContentChunk[] | null — 문자열일 때만 흘림
        if (typeof deltaContent === 'string' && deltaContent.length > 0) {
          yield { type: 'token', delta: deltaContent };
        }
        if (chunk.usage) {
          inTokens = chunk.usage.promptTokens ?? inTokens;
          outTokens = chunk.usage.completionTokens ?? outTokens;
        }
      }
      yield { type: 'done', tokensIn: inTokens, tokensOut: outTokens };
    } catch (e) {
      yield {
        type: 'error',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },

  async testConnection(
    apiKey: string,
    model = 'mistral-small-latest',
  ): Promise<ConnectionTestResult> {
    try {
      const client = new Mistral({ apiKey });
      const res = await client.chat.complete({
        model,
        messages: [{ role: 'user', content: 'reply OK' }],
      });
      const content = res.choices?.[0]?.message?.content;
      const textStr = typeof content === 'string' ? content : '';
      return { ok: textStr.length > 0, detectedModel: model };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  },
};
