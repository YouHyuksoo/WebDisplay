/**
 * @file src/app/settings/ai-personas/page.tsx
 * @description 페르소나 목록 + 추가/수정/삭제.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, Star, Check, X } from 'lucide-react';
import PersonaForm from './_components/PersonaForm';
import type { Persona } from '@/lib/ai/persona-store';

export default function AiPersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editing, setEditing] = useState<Persona | null>(null);
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(async () => {
    const r = await fetch('/api/ai-chat/personas');
    const d = await r.json();
    setPersonas(d.personas || []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const handleCreate = async (data: Omit<Persona, 'personaId' | 'createdAt' | 'updatedAt'>) => {
    await fetch('/api/ai-chat/personas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    setAdding(false);
    refresh();
  };

  const handleUpdate = async (data: Omit<Persona, 'personaId' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    await fetch(`/api/ai-chat/personas/${editing.personaId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    setEditing(null);
    refresh();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await fetch(`/api/ai-chat/personas/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    refresh();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">AI 페르소나</h1>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded bg-cyan-600 px-3 py-2 text-sm text-white hover:bg-cyan-500">
          <Plus className="size-4" /> 추가
        </button>
      </div>

      {adding && <PersonaForm onSubmit={handleCreate} onCancel={() => setAdding(false)} />}

      <div className="mt-4 space-y-2">
        {personas.map((p) => (
          <div key={p.personaId} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {editing?.personaId === p.personaId ? (
              <PersonaForm initial={p} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {p.isDefault && <Star className="size-4 text-yellow-400" />}
                    <span className="font-medium text-zinc-100">{p.name}</span>
                    {!p.isActive && <span className="text-xs text-zinc-500">(비활성)</span>}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">{p.description}</p>
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-zinc-950 p-2 text-xs text-zinc-300">{p.systemPrompt}</pre>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(p)} className="rounded p-2 text-zinc-400 hover:bg-zinc-800">
                    <Edit2 className="size-4" />
                  </button>
                  <button onClick={() => setConfirmDeleteId(p.personaId)} className="rounded p-2 text-red-400 hover:bg-zinc-800">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {confirmDeleteId === p.personaId && (
                  <div className="mt-2 flex items-center gap-2 rounded bg-red-50 px-3 py-1 dark:bg-red-950/30">
                    <span className="flex-1 text-xs text-red-600 dark:text-red-400">삭제할까요?</span>
                    <button onClick={() => handleDelete(p.personaId)} className="rounded p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"><Check className="size-3" /></button>
                    <button onClick={() => setConfirmDeleteId(null)} className="rounded p-1 text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"><X className="size-3" /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
