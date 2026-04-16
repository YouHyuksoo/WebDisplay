/**
 * @file src/app/settings/ai-models/_components/ProviderCard.tsx
 * @description 단일 프로바이더 카드 — 활성 토글, API 키, 모델 선택, 연결 테스트.
 */
'use client';

import { useState } from 'react';
import { Plug } from 'lucide-react';
import ApiKeyInput from './ApiKeyInput';
import type { ProviderSettingPublic } from '@/lib/ai/provider-store';

interface Props {
  provider: ProviderSettingPublic;
  modelOptions: string[];
  onUpdated: () => void;
}

export default function ProviderCard({ provider, modelOptions, onUpdated }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const [model, setModel] = useState(provider.defaultModelId || modelOptions[0]);

  const update = async (input: Record<string, unknown>) => {
    await fetch('/api/ai-chat/providers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: provider.providerId, ...input }),
    });
    onUpdated();
  };

  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/ai-chat/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.providerId, apiKey: '<USE_SAVED>', model }),
      });
      const d = await res.json();
      setTestResult({ ok: d.ok, message: d.error || d.detectedModel });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold capitalize text-zinc-100">{provider.providerId}</h3>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={provider.enabled}
            onChange={(e) => update({ enabled: e.target.checked })} />
          활성
        </label>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-zinc-400">API Key</label>
        <ApiKeyInput
          hasKey={provider.hasApiKey}
          masked={provider.apiKeyMasked}
          onSave={(newKey) => update({ apiKey: newKey })}
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-zinc-400">기본 모델</label>
        <select value={model} onChange={(e) => { setModel(e.target.value); update({ defaultModelId: e.target.value }); }}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
          {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <button onClick={test} disabled={!provider.hasApiKey || testing}
        className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50">
        <Plug className="size-3" /> {testing ? '테스트 중...' : '연결 테스트'}
      </button>
      {testResult && (
        <div className={`mt-2 text-xs ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>
          {testResult.ok ? `✓ ${testResult.message ?? 'OK'}` : `✗ ${testResult.message}`}
        </div>
      )}
    </div>
  );
}
