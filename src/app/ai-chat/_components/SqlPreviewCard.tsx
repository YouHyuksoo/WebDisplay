'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Play, X } from 'lucide-react';

interface Props {
  sessionId: string;
  messageId: string;
  sql: string;
  estimatedCost?: number;
  estimatedRows?: number;
  reason?: string;
  onResolved: () => void;
  onCancel: () => void;
}

export default function SqlPreviewCard({
  sessionId,
  messageId,
  sql,
  estimatedCost,
  estimatedRows,
  reason,
  onResolved,
  onCancel,
}: Props) {
  const t = useTranslations('aiChat');
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/ai-chat/sql/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messageId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'confirm failed');
      }

      onResolved();
    } catch (e) {
      console.error('[ai-chat/sql-confirm]', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 my-2 rounded border border-amber-700 bg-amber-950/40 p-3">
      <div className="mb-1 text-sm font-medium text-amber-300">{t('sqlRiskyTitle')}</div>
      <div className="mb-2 text-xs text-amber-200/80">{reason}</div>
      <div className="text-xs text-amber-100/70">
        {t('estimatedCost')}: {estimatedCost ?? '?'} / {t('estimatedRows')}: {estimatedRows ?? '?'}
      </div>
      <pre className="my-2 max-h-40 overflow-auto rounded bg-zinc-900 p-2 font-mono text-xs text-zinc-300">{sql}</pre>
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500 disabled:opacity-50"
        >
          <Play className="size-3" /> {busy ? t('executing') : t('execute')}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <X className="size-3" /> {t('cancel')}
        </button>
      </div>
    </div>
  );
}
