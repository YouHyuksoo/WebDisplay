/**
 * @file src/lib/ai/provider-store.ts
 * @description AI_PROVIDER_SETTING 테이블 CRUD + API 키 인코딩/디코딩 (base64).
 *
 * 초보자 가이드:
 * - 4행 고정 (claude/gemini/mistral/kimi) — 마이그레이션에서 시드됨
 * - listProviders: UI용 (apiKey 마스킹)
 * - getProviderForRuntime: 서버용 (apiKey 평문)
 */

import type oracledb from 'oracledb';
import { executeQuery, executeDml } from '@/lib/db';
import type { ProviderId } from './providers/types';

export interface ProviderSettingPublic {
  providerId:        ProviderId;
  enabled:           boolean;
  apiKeyMasked:      string | null;
  hasApiKey:         boolean;
  defaultModelId:    string | null;
  sqlSystemPrompt:   string | null;
  analysisPrompt:    string | null;
  updatedAt:         string;
}

export interface ProviderSettingRuntime extends Omit<ProviderSettingPublic, 'apiKeyMasked'> {
  apiKey: string | null;
}

interface DbRow {
  PROVIDER_ID: string; ENABLED: number; API_KEY_ENC: string | null;
  DEFAULT_MODEL_ID: string | null; SQL_SYSTEM_PROMPT: string | null;
  ANALYSIS_PROMPT: string | null; UPDATED_AT: Date;
}

function decode(s: string | null): string | null {
  if (!s) return null;
  try { return Buffer.from(s, 'base64').toString('utf-8'); }
  catch { return null; }
}

function encode(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64');
}

function maskKey(k: string | null): string | null {
  if (!k || k.length < 8) return null;
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

export async function listProviders(): Promise<ProviderSettingPublic[]> {
  const rows = await executeQuery<DbRow>(
    `SELECT PROVIDER_ID,ENABLED,API_KEY_ENC,DEFAULT_MODEL_ID,SQL_SYSTEM_PROMPT,ANALYSIS_PROMPT,UPDATED_AT
       FROM AI_PROVIDER_SETTING ORDER BY PROVIDER_ID`,
  );
  return rows.map((r) => {
    const apiKey = decode(r.API_KEY_ENC);
    return {
      providerId: r.PROVIDER_ID as ProviderId,
      enabled: r.ENABLED === 1,
      apiKeyMasked: maskKey(apiKey),
      hasApiKey: !!apiKey,
      defaultModelId: r.DEFAULT_MODEL_ID,
      sqlSystemPrompt: r.SQL_SYSTEM_PROMPT,
      analysisPrompt: r.ANALYSIS_PROMPT,
      updatedAt: r.UPDATED_AT.toISOString(),
    };
  });
}

export async function getProviderForRuntime(providerId: ProviderId): Promise<ProviderSettingRuntime | null> {
  const rows = await executeQuery<DbRow>(
    `SELECT PROVIDER_ID,ENABLED,API_KEY_ENC,DEFAULT_MODEL_ID,SQL_SYSTEM_PROMPT,ANALYSIS_PROMPT,UPDATED_AT
       FROM AI_PROVIDER_SETTING WHERE PROVIDER_ID = :providerId`,
    { providerId },
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    providerId: r.PROVIDER_ID as ProviderId,
    enabled: r.ENABLED === 1,
    apiKey: decode(r.API_KEY_ENC),
    hasApiKey: !!r.API_KEY_ENC,
    defaultModelId: r.DEFAULT_MODEL_ID,
    sqlSystemPrompt: r.SQL_SYSTEM_PROMPT,
    analysisPrompt: r.ANALYSIS_PROMPT,
    updatedAt: r.UPDATED_AT.toISOString(),
  };
}

export async function updateProvider(providerId: ProviderId, input: {
  enabled?: boolean; apiKey?: string | null; defaultModelId?: string;
  sqlSystemPrompt?: string | null; analysisPrompt?: string | null;
}): Promise<void> {
  const fields: string[] = [];
  const binds: Record<string, unknown> = { providerId };
  if (input.enabled !== undefined)         { fields.push('ENABLED = :enabled'); binds.enabled = input.enabled ? 1 : 0; }
  if (input.apiKey !== undefined)          { fields.push('API_KEY_ENC = :apiKeyEnc'); binds.apiKeyEnc = input.apiKey ? encode(input.apiKey) : null; }
  if (input.defaultModelId !== undefined)  { fields.push('DEFAULT_MODEL_ID = :defaultModelId'); binds.defaultModelId = input.defaultModelId; }
  if (input.sqlSystemPrompt !== undefined) { fields.push('SQL_SYSTEM_PROMPT = :sqlSystemPrompt'); binds.sqlSystemPrompt = input.sqlSystemPrompt; }
  if (input.analysisPrompt !== undefined)  { fields.push('ANALYSIS_PROMPT = :analysisPrompt'); binds.analysisPrompt = input.analysisPrompt; }
  if (fields.length === 0) return;
  fields.push('UPDATED_AT = SYSTIMESTAMP');
  await executeDml(
    `UPDATE AI_PROVIDER_SETTING SET ${fields.join(', ')} WHERE PROVIDER_ID = :providerId`,
    binds as oracledb.BindParameters,
  );
}
