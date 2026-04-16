/**
 * @file src/lib/ai/persona-store.ts
 * @description AI 페르소나 CRUD — data/ai-config.json 기반.
 */

import { getAiConfig, saveAiConfig } from '@/lib/ai-config';
import { randomUUID } from 'crypto';

export interface Persona {
  personaId:    string;
  name:         string;
  description:  string | null;
  icon:         string | null;
  systemPrompt: string;
  isDefault:    boolean;
  isActive:     boolean;
  sortOrder:    number;
  createdAt:    string;
  updatedAt:    string | null;
}

export async function listPersonas(activeOnly = true): Promise<Persona[]> {
  const config = await getAiConfig();
  const now = new Date().toISOString();
  const list = config.personas.map((p) => ({
    ...p,
    createdAt: now,
    updatedAt: null,
  }));
  return activeOnly ? list.filter((p) => p.isActive) : list;
}

export async function getPersona(personaId: string): Promise<Persona | null> {
  const config = await getAiConfig();
  const p = config.personas.find((x) => x.personaId === personaId);
  if (!p) return null;
  return { ...p, createdAt: new Date().toISOString(), updatedAt: null };
}

export async function getDefaultPersona(): Promise<Persona | null> {
  const config = await getAiConfig();
  const p = config.personas.find((x) => x.isDefault && x.isActive);
  if (!p) return config.personas[0] ? { ...config.personas[0], createdAt: new Date().toISOString(), updatedAt: null } : null;
  return { ...p, createdAt: new Date().toISOString(), updatedAt: null };
}

export async function createPersona(input: Omit<Persona, 'personaId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const config = await getAiConfig();
  const personaId = `p_${randomUUID().slice(0, 8)}`;
  if (input.isDefault) {
    config.personas.forEach((p) => { p.isDefault = false; });
  }
  config.personas.push({
    personaId, name: input.name, description: input.description, icon: input.icon,
    systemPrompt: input.systemPrompt, isDefault: input.isDefault, isActive: input.isActive,
    sortOrder: input.sortOrder,
  });
  await saveAiConfig(config);
  return personaId;
}

export async function updatePersona(personaId: string, input: Partial<Omit<Persona, 'personaId' | 'createdAt'>>): Promise<void> {
  const config = await getAiConfig();
  const p = config.personas.find((x) => x.personaId === personaId);
  if (!p) return;
  if (input.isDefault === true) {
    config.personas.forEach((x) => { x.isDefault = false; });
  }
  if (input.name !== undefined) p.name = input.name;
  if (input.description !== undefined) p.description = input.description;
  if (input.icon !== undefined) p.icon = input.icon;
  if (input.systemPrompt !== undefined) p.systemPrompt = input.systemPrompt;
  if (input.isDefault !== undefined) p.isDefault = input.isDefault;
  if (input.isActive !== undefined) p.isActive = input.isActive;
  if (input.sortOrder !== undefined) p.sortOrder = input.sortOrder;
  await saveAiConfig(config);
}

export async function deletePersona(personaId: string): Promise<void> {
  const config = await getAiConfig();
  config.personas = config.personas.filter((x) => x.personaId !== personaId);
  await saveAiConfig(config);
}
