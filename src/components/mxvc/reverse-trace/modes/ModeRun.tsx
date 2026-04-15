/**
 * @file src/components/mxvc/reverse-trace/modes/ModeRun.tsx
 * @description 런번호 모드 — RUN_NO로 해당 작업지시에 출고된 릴 리스트 조회
 */
'use client';
import { useState } from 'react';
import type { RunModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: RunModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

export default function ModeRun({ onSubmit, onBack, loading }: Props) {
  const [runNo, setRunNo] = useState('');
  const canSubmit = runNo.trim().length > 0;
  return (
    <div className="space-y-3">
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">런번호 (RUN_NO) *</label>
        <input
          type="text"
          value={runNo}
          onChange={(e) => setRunNo(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit({ runNo: runNo.trim() }); }}
          autoFocus
          placeholder="예: RUN-20260414-01"
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">IM_ITEM_ISSUE.RUN_NO 기준 — 해당 작업지시로 출고된 모든 릴 조회</p>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit({ runNo: runNo.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? '조회 중...' : '조회 →'}</button>
      </div>
    </div>
  );
}
