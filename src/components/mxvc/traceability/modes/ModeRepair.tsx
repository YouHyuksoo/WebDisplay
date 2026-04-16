/**
 * @file src/components/mxvc/traceability/modes/ModeRepair.tsx
 * @description 수리이력 모드 — 기간 + 품목코드(ITEM_CODE)로 수리 발생 SERIAL_NO 조회
 */
'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { BarcodeRepairModeInput } from '@/types/mxvc/traceability-wizard';

interface Props {
  onSubmit: (input: BarcodeRepairModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeRepair({ onSubmit, onBack, loading }: Props) {
  const t = useTranslations('mxvc.traceability.wizard');
  const [dateFrom, setDateFrom] = useState(TODAY());
  const [dateTo,   setDateTo]   = useState(TODAY());
  const [itemCode, setItemCode] = useState('');

  const daysDiff = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    const a = new Date(dateFrom).getTime();
    const b = new Date(dateTo).getTime();
    return Math.round((b - a) / 86400000);
  }, [dateFrom, dateTo]);

  const tooLong = daysDiff > 90;
  const canSubmit = Boolean(dateFrom && dateTo && itemCode.trim() && daysDiff >= 0);

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ mode: 'repair', dateFrom, dateTo, itemCode: itemCode.trim() });
  };

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
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">{t('itemCode')} *</label>
        <input type="text" value={itemCode} onChange={(e) => setItemCode(e.target.value)} autoFocus
          placeholder={t('itemCodePlaceholder')} required
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        <p className="mt-1 text-xs text-zinc-500">{t('itemCodeHint')}</p>
      </div>
      {tooLong && (
        <div className="rounded border border-amber-700 bg-amber-900/30 p-2 text-xs text-amber-300">
          {t('longRangeWarning', { days: daysDiff })}
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
