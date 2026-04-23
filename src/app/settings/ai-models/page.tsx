/**
 * @file src/app/settings/ai-models/page.tsx
 * @description 4개 프로바이더 카드 그리드.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import ProviderCard from './_components/ProviderCard';
import SystemPromptPanel from './_components/SystemPromptPanel';
import type { ProviderSettingPublic } from '@/lib/ai/provider-store';

const MODEL_OPTIONS: Record<string, string[]> = {
  claude:  ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  gemini:  ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  kimi:    ['kimi-k2-0905-preview', 'moonshot-v1-128k', 'moonshot-v1-32k'],
};

export default function AiModelsPage() {
  const t = useTranslations('settingsAi.models');
  const [providers, setProviders] = useState<ProviderSettingPublic[]>([]);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/ai-chat/providers');
    const d = await r.json();
    setProviders(d.providers || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-zinc-100">{t('title')}</h1>
      <p className="mb-6 text-sm text-zinc-400">{t('description')}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {providers.map((p) => (
          <ProviderCard
            key={p.providerId}
            provider={p}
            modelOptions={MODEL_OPTIONS[p.providerId] || []}
            onUpdated={refresh}
          />
        ))}
      </div>

      <SystemPromptPanel providers={providers} onUpdated={refresh} />
    </div>
  );
}
