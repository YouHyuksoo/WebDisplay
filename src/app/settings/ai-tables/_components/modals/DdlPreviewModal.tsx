/**
 * @file DdlPreviewModal.tsx
 * @description 테이블/컬럼 주석 DDL 미리보기 모달.
 *
 * 초보자 가이드:
 * - before/after 비교 + 실제 실행될 DDL 노출 → 사용자 명시적 확인 후 실행.
 * - `alert()` 금지 규칙 준수 — 모달만 사용.
 */

'use client';

import { useState } from 'react';

interface Props {
  open: boolean;
  title?: string;
  before: string | null;
  after: string;
  ddl: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export default function DdlPreviewModal({
  open,
  title,
  before,
  after,
  ddl,
  onCancel,
  onConfirm,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const handleConfirm = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onConfirm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 p-6 rounded-lg max-w-2xl w-full shadow-xl">
        <h3 className="text-lg font-bold mb-4">
          {title ?? '주석 변경 미리보기'}
        </h3>

        <div className="mb-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            변경 전
          </div>
          <div className="p-2 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200 rounded text-sm whitespace-pre-wrap break-words min-h-[2rem]">
            {before ?? '(없음)'}
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            변경 후
          </div>
          <div className="p-2 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200 rounded text-sm whitespace-pre-wrap break-words min-h-[2rem]">
            {after || '(빈 문자열)'}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            실행될 DDL
          </div>
          <pre className="p-2 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100 rounded text-xs overflow-x-auto">
            {ddl}
          </pre>
        </div>

        {err && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 text-xs rounded">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
            onClick={onCancel}
            disabled={busy}
          >
            취소
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? '실행 중...' : '확인 실행'}
          </button>
        </div>
      </div>
    </div>
  );
}
