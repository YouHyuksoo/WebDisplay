/**
 * @file src/app/settings/ai-glossary/page.tsx
 * @description 용어 목록 + CRUD.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import TermForm from './_components/TermForm';
import type { GlossaryTerm } from '@/lib/ai/context/glossary-store';

export default function AiGlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [editing, setEditing] = useState<GlossaryTerm | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/ai-chat/glossary');
    const d = await r.json();
    setTerms(d.terms || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (data: Omit<GlossaryTerm, 'termId' | 'createdAt' | 'updatedAt'>) => {
    await fetch('/api/ai-chat/glossary', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (data: Omit<GlossaryTerm, 'termId' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    await fetch(`/api/ai-chat/glossary/${editing.termId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    setEditing(null);
    refresh();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await fetch(`/api/ai-chat/glossary/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    refresh();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">AI 용어사전</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-500">
          <Plus className="size-4" /> 추가
        </button>
      </div>

      {adding && <TermForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />}

      <table className="mt-4 w-full text-sm">
        <thead className="bg-zinc-800 text-zinc-300">
          <tr>
            <th className="px-3 py-2 text-left">카테고리</th>
            <th className="px-3 py-2 text-left">용어</th>
            <th className="px-3 py-2 text-left">정의</th>
            <th className="px-3 py-2 text-right">우선순위</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t) => (
            editing?.termId === t.termId ? (
              <tr key={t.termId}>
                <td colSpan={5} className="bg-zinc-950 p-0">
                  <TermForm initial={t} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
                </td>
              </tr>
            ) : (
              <tr key={t.termId} className="border-b border-zinc-800">
                <td className="px-3 py-2 text-xs text-zinc-400">{t.category}</td>
                <td className="px-3 py-2 font-mono text-zinc-100">{t.term}</td>
                <td className="px-3 py-2 text-zinc-300">{t.definition.slice(0, 80)}{t.definition.length > 80 ? '…' : ''}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{t.priority}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setEditing(t)} className="rounded p-1 text-zinc-400 hover:bg-zinc-800">
                    <Edit2 className="size-4" />
                  </button>
                  <button onClick={() => setConfirmDeleteId(t.termId)} className="rounded p-1 text-red-400 hover:bg-zinc-800">
                    <Trash2 className="size-4" />
                  </button>
                  {confirmDeleteId === t.termId && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 dark:bg-red-950/30">
                      <span className="text-[10px] text-red-600 dark:text-red-400">삭제?</span>
                      <button onClick={() => handleDelete(t.termId)} className="rounded p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"><Check className="size-3" /></button>
                      <button onClick={() => setConfirmDeleteId(null)} className="rounded p-0.5 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"><X className="size-3" /></button>
                    </span>
                  )}
                </td>
              </tr>
            )
          ))}
        </tbody>
      </table>
    </div>
  );
}
