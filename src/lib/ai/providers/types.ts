/**
 * @file src/lib/ai/providers/types.ts
 * @description LLM 프로바이더 공통 인터페이스. 4개 프로바이더(Claude/Gemini/Mistral/Kimi)는
 *   이 타입을 구현해 동일한 호출 규약으로 사용 가능.
 *
 * 초보자 가이드:
 * - ChatMessage: LLM에 보내는 메시지 한 개 (role + content)
 * - ChatStreamChunk: 스트리밍 이벤트 한 조각 (token/done/error)
 * - AiProvider: 각 프로바이더가 구현해야 할 표준 인터페이스
 */

export type ProviderId = 'claude' | 'gemini' | 'mistral' | 'kimi';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatStreamOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string; // role:'system' 메시지가 안 통하는 SDK용 (Gemini 등)
}

export interface ChatStreamChunk {
  type: 'token' | 'done' | 'error';
  delta?: string;
  tokensIn?: number;
  tokensOut?: number;
  error?: string;
}

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  detectedModel?: string;
}

export interface AiProvider {
  id: ProviderId;
  /** SDK가 모델 목록 API를 제공하면 그 결과, 아니면 하드코딩된 후보 */
  listModels(): string[];
  /** 메시지를 보내고 토큰 단위로 비동기 스트리밍 */
  chatStream(opts: ChatStreamOptions, apiKey: string): AsyncIterable<ChatStreamChunk>;
  /** API 키 유효성 + 간단한 ping 응답 확인 */
  testConnection(apiKey: string, model?: string): Promise<ConnectionTestResult>;
}
