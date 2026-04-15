/**
 * @file src/lib/ai/providers/gemini.ts
 * @description Google Gemini 프로바이더 — @google/generative-ai 사용.
 *
 * 초보자 가이드:
 * - Gemini는 system instruction을 generationConfig가 아닌 systemInstruction에 분리
 * - role 매핑: 'assistant' → 'model'
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AiProvider, ChatStreamOptions, ChatStreamChunk, ConnectionTestResult } from './types';

const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-thinking-exp',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
];

export const geminiProvider: AiProvider = {
  id: 'gemini',
  listModels() { return MODELS; },

  async *chatStream(opts: ChatStreamOptions, apiKey: string): AsyncIterable<ChatStreamChunk> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const systemMsg = opts.messages.find((m) => m.role === 'system')?.content ?? opts.systemPrompt;
      const model = genAI.getGenerativeModel({
        model: opts.model,
        systemInstruction: systemMsg,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 4096,
        },
      });

      const history = opts.messages
        .filter((m) => m.role !== 'system')
        .slice(0, -1)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      const lastMsg = opts.messages.filter((m) => m.role !== 'system').slice(-1)[0]?.content ?? '';

      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(lastMsg);

      let outTokens = 0;
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield { type: 'token', delta: text };
      }
      const final = await result.response;
      const usage = final.usageMetadata;
      if (usage) outTokens = usage.candidatesTokenCount ?? 0;
      yield { type: 'done', tokensIn: usage?.promptTokenCount, tokensOut: outTokens };
    } catch (e) {
      yield { type: 'error', error: e instanceof Error ? e.message : String(e) };
    }
  },

  async testConnection(apiKey: string, model = 'gemini-2.0-flash'): Promise<ConnectionTestResult> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const m = genAI.getGenerativeModel({ model });
      const res = await m.generateContent('reply OK');
      const text = res.response.text();
      return { ok: text.length > 0, detectedModel: model };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
