/**
 * @file src/components/mxvc/traceability/modes/ModeDateRange.tsx
 * @description 날짜 구간 전용 모드 — SPI/AOI 설비 로그 기준 바코드 추출
 */
'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { BarcodeDateRangeModeInput, DateRangeMode } from '@/types/mxvc/traceability-wizard';

interface Props {
  mode: DateRangeMode;
  hint?: string;
  onSubmit: (input: BarcodeDateRangeModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeDateRange({ mode, hint, onSubmit, onBack, loading }: Props) {
  const t = useTranslations('mxvc.traceability.wizard');
  const [dateFrom, setDateFrom] = useState(TODAY());
  const [dateTo,   setDateTo]   = useState(TODAY());

  const daysDiff = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    return Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000);
  }, [dateFrom, dateTo]);
  const tooLong = daysDiff > 30;
  const canSubmit = Boolean(dateFrom && dateTo && daysDiff >= 0);

  const submit = () => canSubmit && onSubmit({ mode, dateFrom, dateTo });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('dateFrom')}</label>
          <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('dateTo')}</label>
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {tooLong && (
        <div className="rounded border border-amber-700 bg-amber-900/30 p-2 text-xs text-amber-300">
          {t('longRangeEquipmentWarning', { days: daysDiff })}
        </div>
      )}
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
