/**
 * @file src/app/ai-chat/_components/ModelPicker.tsx
 * @description 프로바이더 + 모델 2단 드롭다운.
 */
'use client';

import { useEffect, useState } from 'react';
import type { ProviderId } from '@/lib/ai/providers/types';
import type { ProviderSettingPublic } from '@/lib/ai/provider-store';

interface Props {
  providerId: ProviderId;
  modelId: string;
  onProviderChange: (id: ProviderId) => void;
  onModelChange: (id: string) => void;
}

const MODEL_OPTIONS: Record<ProviderId, string[]> = {
  claude:  ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  gemini:  ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  kimi:    ['kimi-k2-0905-preview', 'moonshot-v1-128k', 'moonshot-v1-32k'],
};

export default function ModelPicker({ providerId, modelId, onProviderChange, onModelChange }: Props) {
  const [enabled, setEnabled] = useState<ProviderId[]>([]);

  useEffect(() => {
    fetch('/api/ai-chat/providers').then((r) => r.json()).then((d) => {
      const list = (d.providers as ProviderSettingPublic[])
        .filter((p) => p.enabled && p.hasApiKey)
        .map((p) => p.providerId);
      setEnabled(list);
      if (list.length > 0 && !list.includes(providerId)) {
        onProviderChange(list[0]);
      }
    });
  }, [providerId, onProviderChange]);

  return (
    <div className="flex gap-1">
      <select
        value={providerId}
        onChange={(e) => {
          const pid = e.target.value as ProviderId;
          onProviderChange(pid);
          onModelChange(MODEL_OPTIONS[pid][0]);
        }}
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
      >
        {(['claude','gemini','mistral','kimi'] as ProviderId[]).map((p) => (
          <option key={p} value={p} disabled={!enabled.includes(p)}>
            {p}{!enabled.includes(p) ? ' (키 미등록)' : ''}
          </option>
        ))}
      </select>
      <select
        value={modelId}
        onChange={(e) => onModelChange(e.target.value)}
        className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
      >
        {MODEL_OPTIONS[providerId].map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  );
}
