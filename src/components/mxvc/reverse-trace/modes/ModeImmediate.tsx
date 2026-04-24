/**
 * @file src/components/mxvc/reverse-trace/modes/ModeImmediate.tsx
 * @description 즉시입력 모드 — 릴번호 직접 입력 후 바로 결과 표시
 */
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  onSubmit: (reelCd: string) => void;
  onBack:   () => void;
}

export default function ModeImmediate({ onSubmit, onBack }: Props) {
  const t = useTranslations('mxvcReverseTrace');
  const [reelCd, setReelCd] = useState('');
  const canSubmit = reelCd.trim().length > 0;
  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">{t('immediate.label')}</label>
        <input
          type="text"
          value={reelCd}
          onChange={(e) => setReelCd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit(reelCd.trim()); }}
          autoFocus
          placeholder={t('immediate.placeholder')}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">{t('immediate.hint')}</p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">{t('back')}</button>
        <button
          onClick={() => onSubmit(reelCd.trim())}
          disabled={!canSubmit}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{t('search')}</button>
      </div>
    </div>
  );
}
