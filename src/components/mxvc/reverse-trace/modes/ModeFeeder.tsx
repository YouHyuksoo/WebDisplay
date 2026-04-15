/**
 * @file src/components/mxvc/reverse-trace/modes/ModeFeeder.tsx
 * @description 피더번호 모드 — 일자 + 장비 + 피더번호로 그 시점 걸려있던 릴 조회
 */
'use client';
import { useState } from 'react';
import type { FeederModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: FeederModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeFeeder({ onSubmit, onBack, loading }: Props) {
  const [date, setDate]         = useState(TODAY());
  const [eqpCd, setEqpCd]       = useState('');
  const [feederCd, setFeederCd] = useState('');
  const canSubmit = !!date && !!eqpCd.trim() && !!feederCd.trim();
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">일자 *</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">장비코드 (EqpCd) *</label>
          <input type="text" value={eqpCd} onChange={(e) => setEqpCd(e.target.value)} autoFocus
            placeholder="예: NXT3-01"
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">피더코드 (FeederCd) *</label>
          <input type="text" value={feederCd} onChange={(e) => setFeederCd(e.target.value)}
            placeholder="예: F001"
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        해당 일자에 지정한 장비-피더에 <span className="text-zinc-300">설치되어 있었던</span> 모든 자재바코드롯트를 조회합니다.
      </p>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit({ date, eqpCd: eqpCd.trim(), feederCd: feederCd.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? '조회 중...' : '조회 →'}</button>
      </div>
    </div>
  );
}
