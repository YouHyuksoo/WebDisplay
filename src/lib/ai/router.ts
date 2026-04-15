/**
 * @file src/lib/ai/router.ts
 * @description ProviderId 문자열로 4개 프로바이더 인스턴스 dispatch.
 *
 * 초보자 가이드:
 * - getProvider('claude') → anthropicProvider 반환
 * - 신규 프로바이더 추가 시 import + REGISTRY에 등록만 하면 됨
 */

import type { AiProvider, ProviderId } from './providers/types';
import { anthropicProvider } from './providers/anthropic';
import { geminiProvider } from './providers/gemini';
import { mistralProvider } from './providers/mistral';
import { kimiProvider } from './providers/kimi';

const REGISTRY: Record<ProviderId, AiProvider> = {
  claude: anthropicProvider,
  gemini: geminiProvider,
  mistral: mistralProvider,
  kimi: kimiProvider,
};

export function getProvider(id: ProviderId): AiProvider {
  const p = REGISTRY[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export function listProviderIds(): ProviderId[] {
  return Object.keys(REGISTRY) as ProviderId[];
}
