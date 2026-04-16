/**
 * @file src/app/settings/ai-personas/_components/PersonaForm.tsx
 * @description 페르소나 추가/수정 폼.
 */
'use client';

import { useState } from 'react';
import type { Persona } from '@/lib/ai/persona-store';

interface Props {
  initial?: Persona;
  onSubmit: (data: Omit<Persona, 'personaId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function PersonaForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    await onSubmit({
      name, description, icon, systemPrompt, isDefault, isActive,
      sortOrder: initial?.sortOrder ?? 0,
    });
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        <input value={icon ?? ''} onChange={(e) => setIcon(e.target.value)} placeholder="아이콘 (lucide 이름)"
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
      </div>
      <input value={description ?? ''} onChange={(e) => setDescription(e.target.value)} placeholder="설명"
        className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
      <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
        rows={6} placeholder="시스템 프롬프트 (응답 어조)"
        className="mb-3 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100" />
      <div className="mb-3 flex gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> 기본
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> 활성
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={busy || !name || !systemPrompt}
          className="rounded bg-cyan-600 px-3 py-1 text-xs text-white hover:bg-cyan-500 disabled:opacity-50">
          {busy ? '저장 중...' : '저장'}
        </button>
        <button onClick={onCancel}
          className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
          취소
        </button>
      </div>
    </div>
  );
}
