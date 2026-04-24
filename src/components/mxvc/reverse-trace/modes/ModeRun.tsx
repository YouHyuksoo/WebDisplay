/**
 * @file src/components/mxvc/reverse-trace/modes/ModeRun.tsx
 * @description 런번호 모드 — RUN_NO로 해당 작업지시에 출고된 릴 리스트 조회
 */
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { RunModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: RunModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

export default function ModeRun({ onSubmit, onBack, loading }: Props) {
  const t = useTranslations('mxvcReverseTrace');
  const [runNo, setRunNo] = useState('');
  const canSubmit = runNo.trim().length > 0;
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">{t('run.label')}</label>
        <input
          type="text"
          value={runNo}
          onChange={(e) => setRunNo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit({ runNo: runNo.trim() }); }}
          autoFocus
          placeholder={t('run.placeholder')}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">{t('run.hint')}</p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">{t('back')}</button>
        <button
          onClick={() => onSubmit({ runNo: runNo.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? t('searching') : t('search')}</button>
      </div>
    </div>
  );
}
