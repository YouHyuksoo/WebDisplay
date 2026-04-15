/**
 * @file src/app/(mxvc)/mxvc/reverse-trace/page.tsx
 * @description 멕시코전장 역추적 페이지 (임시 — 위자드 통합 전 단계)
 *
 * 초보자 가이드:
 * 1. 상단 입력바: 자재릴번호(ReelCd) 입력 → 조회 버튼 / Enter
 * 2. 결과 영역은 TraceResultPanel 컴포넌트에 위임
 * 3. 위자드는 후속 Task에서 추가 예정
 */
'use client';

import { useState } from 'react';
import DisplayHeader from '@/components/display/DisplayHeader';
import DisplayFooter from '@/components/display/DisplayFooter';
import TraceResultPanel from '@/components/mxvc/reverse-trace/TraceResultPanel';

const SCREEN_ID = 'mxvc-reverse-trace';

export default function ReverseTracePage() {
  const [input, setInput]   = useState('');
  const [reelCd, setReelCd] = useState('');

  const submit = () => {
    const t = input.trim();
    if (t) setReelCd(t);
  };

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
      <DisplayHeader title="멕시코전장 역추적(자재→PCB)" screenId={SCREEN_ID} />

      {/* 입력바 */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <span className="font-semibold shrink-0">자재릴번호</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="ReelCd 입력 (예: 품번-LOT-수량)"
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm w-80 placeholder:text-gray-400"
          />
        </label>
        <button
          onClick={submit}
          disabled={!input.trim()}
          className="px-4 py-1.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        >
          조회
        </button>
      </div>

      {/* 결과 영역 */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <TraceResultPanel reelCd={reelCd} />
      </main>

      <DisplayFooter />
    </div>
  );
}
