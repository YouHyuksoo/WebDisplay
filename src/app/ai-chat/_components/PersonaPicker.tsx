/**
 * @file src/app/ai-chat/_components/PersonaPicker.tsx
 * @description 페르소나 드롭다운 — /api/ai-chat/personas 로드.
 */
'use client';

import { useEffect, useState } from 'react';
import type { Persona } from '@/lib/ai/persona-store';

interface Props {
  value: string;
  onChange: (personaId: string) => void;
}

export default function PersonaPicker({ value, onChange }: Props) {
  const [personas, setPersonas] = useState<Persona[]>([]);

  useEffect(() => {
    fetch('/api/ai-chat/personas')
      .then((r) => r.json())
      .then((d) => {
        const raw = Array.isArray(d?.personas) ? d.personas : [];
        const list = (raw as Persona[]).filter((p) => p.isActive);
        setPersonas(list);
        if (!value && list.length > 0) {
          const def = list.find((p) => p.isDefault) || list[0];
          onChange(def.personaId);
        }
      })
      .catch(() => { /* API 에러 시 빈 목록 유지 */ });
  }, [value, onChange]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
    >
      {personas.map((p) => (
        <option key={p.personaId} value={p.personaId}>{p.name}</option>
      ))}
    </select>
  );
}
