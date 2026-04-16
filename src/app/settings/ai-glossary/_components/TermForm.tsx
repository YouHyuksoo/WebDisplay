/**
 * @file src/app/settings/ai-glossary/_components/TermForm.tsx
 * @description 용어 추가/수정 폼.
 */
'use client';

import { useState } from 'react';
import type { GlossaryTerm } from '@/lib/ai/context/glossary-store';

interface Props {
  initial?: GlossaryTerm;
  onSubmit: (data: Omit<GlossaryTerm, 'termId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES: GlossaryTerm['category'][] = ['abbreviation', 'code', 'rule', 'example'];

export default function TermForm({ initial, onSubmit, onCancel }: Props) {
  const [category, setCategory] = useState<GlossaryTerm['category']>(initial?.category ?? 'abbreviation');
  const [term, setTerm] = useState(initial?.term ?? '');
  const [definition, setDefinition] = useState(initial?.definition ?? '');
  const [exampleSql, setExampleSql] = useState(initial?.exampleSql ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 50);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 grid grid-cols-3 gap-3">
        <select value={category} onChange={(e) => setCategory(e.target.value as GlossaryTerm['category'])}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="용어 (예: P51)"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))}
          placeholder="우선순위" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
      </div>
      <textarea value={definition} onChange={(e) => setDefinition(e.target.value)}
        rows={3} placeholder="정의 / 설명"
        className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
      <textarea value={exampleSql ?? ''} onChange={(e) => setExampleSql(e.target.value)}
        rows={2} placeholder="예시 SQL (선택)"
        className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100" />
      <label className="mb-3 flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> 활성
      </label>
      <div className="flex gap-2">
        <button onClick={() => onSubmit({ category, term, definition, exampleSql: exampleSql || null, priority, isActive })}
          disabled={!term || !definition}
          className="rounded bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-500 disabled:opacity-50">
          저장
        </button>
        <button onClick={onCancel}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
          취소
        </button>
      </div>
    </div>
  );
}
