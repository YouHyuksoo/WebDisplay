/**
 * @file src/lib/ai/provider-store.ts
 * @description AI 프로바이더 설정 CRUD — data/ai-config.json 기반.
 *
 * 초보자 가이드:
 * - listProviders: UI용 (apiKey 마스킹)
 * - getProviderForRuntime: 서버용 (apiKey 평문)
 * - updateProvider: 단건 수정 후 파일 저장
 */

import { getAiConfig, saveAiConfig } from '@/lib/ai-config';
import type { ProviderId } from './providers/types';

export interface ProviderSettingPublic {
  providerId:        ProviderId;
  enabled:           boolean;
  apiKeyMasked:      string | null;
  hasApiKey:         boolean;
  defaultModelId:    string | null;
  sqlSystemPrompt:   string | null;
  analysisPrompt:    string | null;
}

export interface ProviderSettingRuntime extends Omit<ProviderSettingPublic, 'apiKeyMasked'> {
  apiKey: string | null;
}

function maskKey(k: string | null): string | null {
  if (!k || k.length < 8) return null;
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export async function listProviders(): Promise<ProviderSettingPublic[]> {
  const config = await getAiConfig();
  return config.providers.map((p) => ({
    providerId: p.providerId as ProviderId,
    enabled: p.enabled,
    apiKeyMasked: maskKey(p.apiKey),
    hasApiKey: !!p.apiKey,
    defaultModelId: p.defaultModelId,
    sqlSystemPrompt: p.sqlSystemPrompt,
    analysisPrompt: p.analysisPrompt,
  }));
}

export async function getProviderForRuntime(providerId: ProviderId): Promise<ProviderSettingRuntime | null> {
  const config = await getAiConfig();
  const p = config.providers.find((x) => x.providerId === providerId);
  if (!p) return null;
  return {
    providerId: p.providerId as ProviderId,
    enabled: p.enabled,
    apiKey: p.apiKey,
    hasApiKey: !!p.apiKey,
    defaultModelId: p.defaultModelId,
    sqlSystemPrompt: p.sqlSystemPrompt,
    analysisPrompt: p.analysisPrompt,
  };
}

export async function updateProvider(providerId: ProviderId, input: {
  enabled?: boolean; apiKey?: string | null; defaultModelId?: string;
  sqlSystemPrompt?: string | null; analysisPrompt?: string | null;
}): Promise<void> {
  const config = await getAiConfig();
  const p = config.providers.find((x) => x.providerId === providerId);
  if (!p) return;
  if (input.enabled !== undefined) p.enabled = input.enabled;
  if (input.apiKey !== undefined) p.apiKey = input.apiKey;
  if (input.defaultModelId !== undefined) p.defaultModelId = input.defaultModelId;
  if (input.sqlSystemPrompt !== undefined) p.sqlSystemPrompt = input.sqlSystemPrompt;
  if (input.analysisPrompt !== undefined) p.analysisPrompt = input.analysisPrompt;
  await saveAiConfig(config);
}
