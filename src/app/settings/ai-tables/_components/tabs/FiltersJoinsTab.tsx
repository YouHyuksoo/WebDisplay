/**
 * @file FiltersJoinsTab.tsx
 * @description 테이블의 keywords / businessNotes 편집 + joinPatterns readonly 뷰.
 *
 * 초보자 가이드:
 * - keywords: 쉼표 구분 input → 배열로 변환 저장.
 * - businessNotes: textarea 자유 편집.
 * - joinPatterns 는 이번 단계에서 JSON readonly 로만 노출 (v2 에서 전용 에디터 예정).
 */

'use client';

import { useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  data: any;
  onChange: () => void;
}

export default function FiltersJoinsTab({ data, onChange }: Props) {
  const { activeSite, activeTable } = useAiTablesStore();
  const meta = data.meta ?? {};

  const [keywords, setKeywords] = useState<string>(
    Array.isArray(meta.keywords) ? meta.keywords.join(', ') : '',
  );
  const [notes, setNotes] = useState<string>(meta.businessNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await api.patchTable(activeSite, activeTable as string, {
        keywords: keywords
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        businessNotes: notes,
      });
      setStatus('저장됨');
      onChange();
    } catch (e) {
      setStatus(`오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const joinPatterns = Array.isArray(meta.joinPatterns)
    ? meta.joinPatterns
    : [];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          키워드 (쉼표 구분)
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="예: 공정이력, 불량, coating"
          className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          비즈니스 노트 (사용 주의사항 / 야간 배치 / 기타)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded font-mono"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? '저장 중…' : '저장'}
        </button>
        {status && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {status}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
          Join 패턴 ({joinPatterns.length}) — readonly
        </h3>
        <pre className="p-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-[11px] overflow-x-auto text-zinc-800 dark:text-zinc-200">
          {joinPatterns.length === 0
            ? '(없음)'
            : JSON.stringify(joinPatterns, null, 2)}
        </pre>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
