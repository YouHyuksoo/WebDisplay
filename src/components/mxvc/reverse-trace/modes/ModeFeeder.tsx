/**
 * @file src/components/mxvc/reverse-trace/modes/ModeFeeder.tsx
 * @description 슬롯번호 모드 — 날짜범위 + 장비명 + 슬롯번호로 HW_VW_LTS 에서 릴 조회
 */
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FeederModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: FeederModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeFeeder({ onSubmit, onBack, loading }: Props) {
  const t = useTranslations('mxvcReverseTrace');
  const [startDtFrom, setFrom]       = useState(TODAY());
  const [startDtTo,   setTo]         = useState(TODAY());
  const [eqpNm,       setEqpNm]      = useState('');
  const [feederSlot,  setFeederSlot] = useState('');
  const canSubmit = !!startDtFrom && !!startDtTo && !!eqpNm.trim() && !!feederSlot.trim();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('common.dateFromReq')}</label>
          <input type="date" value={startDtFrom} onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('common.dateToReq')}</label>
          <input type="date" value={startDtTo} onChange={(e) => setTo(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('feeder.eqpLabel')}</label>
          <input type="text" value={eqpNm} onChange={(e) => setEqpNm(e.target.value)} autoFocus
            placeholder={t('feeder.eqpPlaceholder')}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">{t('feeder.slotLabel')}</label>
          <input type="text" value={feederSlot} onChange={(e) => setFeederSlot(e.target.value)}
            placeholder={t('feeder.slotPlaceholder')}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <p className="text-xs text-zinc-500">{t('feeder.hint')}</p>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">{t('back')}</button>
        <button
          onClick={() => onSubmit({ startDtFrom, startDtTo, eqpNm: eqpNm.trim(), feederSlot: feederSlot.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? t('searching') : t('search')}</button>
      </div>
    </div>
  );
}
