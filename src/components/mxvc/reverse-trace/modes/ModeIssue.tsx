/**
 * @file src/components/mxvc/reverse-trace/modes/ModeIssue.tsx
 * @description 출고기준 모드 — 기간 + 품목코드로 릴 리스트 조회
 *
 * 초보자 가이드:
 * - dateFrom/dateTo/itemCode 전부 필수
 * - 기간 90일 초과 시 경고 배너
 * - onSubmit(dateFrom, dateTo, itemCode) 호출 — 부모가 /candidates?mode=issue 호출
 */
'use client';
import { useState, useMemo } from 'react';
import type { IssueModeInput } from '@/types/mxvc/reverse-trace-wizard';

interface Props {
  onSubmit: (input: IssueModeInput) => void;
  onBack:   () => void;
  loading?: boolean;
}

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function ModeIssue({ onSubmit, onBack, loading }: Props) {
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
  const canSubmit = dateFrom && dateTo && itemCode.trim() && daysDiff >= 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">시작일</label>
          <input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block mb-1 text-xs font-medium text-zinc-300">종료일</label>
          <input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 [color-scheme:dark] focus:border-blue-500 focus:outline-none" />
        </div>
      </div>
      <div>
        <label className="block mb-1 text-xs font-medium text-zinc-300">품목코드 *</label>
        <input type="text" value={itemCode} onChange={(e) => setItemCode(e.target.value)} autoFocus
          placeholder="예: 10-1234-567" required
          className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none" />
      </div>
      {tooLong && (
        <div className="rounded border border-amber-700 bg-amber-900/30 p-2 text-xs text-amber-300">
          ⚠ 기간이 {daysDiff}일입니다(90일 초과). DB 부하가 생길 수 있어요. 그래도 조회하려면 아래 [조회]를 누르세요.
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onBack} className="px-3 py-1.5 text-sm rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800">◀ 뒤로</button>
        <button
          onClick={() => onSubmit({ dateFrom, dateTo, itemCode: itemCode.trim() })}
          disabled={!canSubmit || loading}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40"
        >{loading ? '조회 중...' : '조회 →'}</button>
      </div>
    </div>
  );
}
