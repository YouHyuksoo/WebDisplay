/**
 * @file src/components/mxvc/traceability/modes/ModeSingleValue.tsx
 * @description 단일값 입력 모드 공통 컴포넌트 — runNo/magazine/box/pallet/carrier 공용.
 *
 * 초보자 가이드:
 * - label/placeholder/hint 만 모드별로 다르고 입력 구조는 동일
 * - onSubmit(value)로 상위에 값 전달
 */
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  label: string;
  placeholder?: string;
  hint?: string;
  onSubmit: (value: string) => void;
  onBack:   () => void;
  loading?: boolean;
}

export default function ModeSingleValue({ label, placeholder, hint, onSubmit, onBack, loading }: Props) {
  const t = useTranslations('mxvc.traceability.wizard');
  const [value, setValue] = useState('');
  const canSubmit = value.trim().length > 0;
  const submit = () => canSubmit && onSubmit(value.trim());
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">{label} *</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          autoFocus
          placeholder={placeholder}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ {t('back')}</button>
        <button
          onClick={submit}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? t('querying') : `${t('query')} →`}</button>
      </div>
    </div>
  );
}
