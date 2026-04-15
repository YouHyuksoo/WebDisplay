/**
 * @file src/app/ai-chat/_components/SqlPreviewCard.tsx
 * @description 위험 SQL 사용자 확인 카드 — ▶ 클릭 시 /api/ai-chat/sql/confirm 호출.
 */
'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';

interface Props {
  messageId: string;
  sql: string;
  estimatedCost?: number;
  estimatedRows?: number;
  reason?: string;
  onResolved: () => void;
}

export default function SqlPreviewCard({ messageId, sql, estimatedCost, estimatedRows, reason, onResolved }: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await fetch('/api/ai-chat/sql/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      onResolved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-4 my-2 rounded border border-amber-700 bg-amber-950/40 p-3">
      <div className="mb-1 text-sm font-medium text-amber-300">⚠ 이 쿼리를 실행할까요?</div>
      <div className="mb-2 text-xs text-amber-200/80">{reason}</div>
      <div className="text-xs text-amber-100/70">
        예상 비용: {estimatedCost ?? '?'} · 예상 행수: {estimatedRows ?? '?'}
      </div>
      <pre className="my-2 max-h-40 overflow-auto rounded bg-zinc-900 p-2 font-mono text-xs text-zinc-300">{sql}</pre>
      <div className="flex gap-2">
        <button onClick={handleConfirm} disabled={busy}
          className="flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500 disabled:opacity-50">
          <Play className="size-3" /> {busy ? '실행 중...' : '실행'}
        </button>
        <button onClick={onResolved}
          className="flex items-center gap-1 rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
          <X className="size-3" /> 취소
        </button>
      </div>
    </div>
  );
}
