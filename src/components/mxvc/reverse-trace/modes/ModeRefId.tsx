/**
 * @file src/components/mxvc/reverse-trace/modes/ModeRefId.tsx
 * @description ReferenceID 모드 — HW_VW_LTS에서 ReferenceID + 날짜로 릴 후보 조회
 */
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RefIdModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: RefIdModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

export default function ModeRefId({ onSubmit, onBack, loading }: Props) {
  const t = useTranslations('mxvcReverseTrace');
  const today = new Date().toISOString().slice(0, 10);
  const [referenceId,  setReferenceId]  = useState('');
  const [startDtFrom,  setStartDtFrom]  = useState(today);
  const [startDtTo,    setStartDtTo]    = useState(today);
  const canSubmit = referenceId.trim().length > 0 && startDtFrom.length > 0 && startDtTo.length > 0;

  const handleSubmit = () => {
    if (canSubmit) onSubmit({ referenceId: referenceId.trim(), startDtFrom, startDtTo });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">{t('refid.refLabel')}</label>
        <input
          type="text"
          value={referenceId}
          onChange={(e) => setReferenceId(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleSubmit(); }}
          autoFocus
          placeholder={t('refid.refPlaceholder')}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('refid.installFrom')}</label>
          <input
            type="date"
            value={startDtFrom}
            onChange={(e) => setStartDtFrom(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('refid.installTo')}</label>
          <input
            type="date"
            value={startDtTo}
            onChange={(e) => setStartDtTo(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t('refid.hint')}</p>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">{t('back')}</button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? t('searching') : t('search')}</button>
      </div>
    </div>
  );
}
