/**
 * @file src/app/settings/ai-models/_components/ApiKeyInput.tsx
 * @description API 키 입력 — 등록되어 있으면 마스킹, 편집 모드 시 평문 입력.
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Edit2, Eye, EyeOff } from 'lucide-react';

interface Props {
  hasKey: boolean;
  masked: string | null;
  onSave: (newKey: string) => Promise<void>;
}

export default function ApiKeyInput({ hasKey, masked, onSave }: Props) {
  const t = useTranslations('settingsAi.models');
  const tc = useTranslations('common');
  const [editing, setEditing] = useState(false);
  const [show, setShow] = useState(false);
  const [val, setVal] = useState('');
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
          {hasKey ? masked : t('notRegistered')}
        </div>
        <button onClick={() => { setEditing(true); setVal(''); }}
          className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
          <Edit2 className="size-3" /> {t('editKey')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type={show ? 'text' : 'password'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={t('newKeyPlaceholder')}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 pr-10 text-sm text-zinc-100"
        />
        <button onClick={() => setShow(!show)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <button
        disabled={!val || busy}
        onClick={async () => { setBusy(true); await onSave(val); setBusy(false); setEditing(false); }}
        className="rounded bg-cyan-600 px-3 py-2 text-xs text-white hover:bg-cyan-500 disabled:opacity-50">
        {busy ? t('saving') : t('save')}
      </button>
      <button onClick={() => setEditing(false)}
        className="rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
        {tc('cancel')}
      </button>
    </div>
  );
}
