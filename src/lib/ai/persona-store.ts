/**
 * @file src/lib/ai/persona-store.ts
 * @description AI_PERSONA 테이블 CRUD.
 */

import type oracledb from 'oracledb';
import { executeQuery, executeDml } from '@/lib/db';
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

interface DbRow {
  PERSONA_ID: string; NAME: string; DESCRIPTION: string | null; ICON: string | null;
  SYSTEM_PROMPT: string; IS_DEFAULT: number; IS_ACTIVE: number; SORT_ORDER: number;
  CREATED_AT: Date; UPDATED_AT: Date | null;
}

function rowToPersona(r: DbRow): Persona {
  return {
    personaId: r.PERSONA_ID, name: r.NAME, description: r.DESCRIPTION, icon: r.ICON,
    systemPrompt: r.SYSTEM_PROMPT, isDefault: r.IS_DEFAULT === 1, isActive: r.IS_ACTIVE === 1,
    sortOrder: r.SORT_ORDER,
    createdAt: r.CREATED_AT.toISOString(),
    updatedAt: r.UPDATED_AT?.toISOString() ?? null,
  };
}

export async function listPersonas(activeOnly = true): Promise<Persona[]> {
  const sql = `
    SELECT PERSONA_ID,NAME,DESCRIPTION,ICON,SYSTEM_PROMPT,IS_DEFAULT,IS_ACTIVE,SORT_ORDER,CREATED_AT,UPDATED_AT
      FROM AI_PERSONA
     WHERE (:activeOnly = 0 OR IS_ACTIVE = 1)
     ORDER BY SORT_ORDER, NAME`;
  const rows = await executeQuery<DbRow>(sql, { activeOnly: activeOnly ? 1 : 0 });
  return rows.map(rowToPersona);
}

export async function getPersona(personaId: string): Promise<Persona | null> {
  const rows = await executeQuery<DbRow>(
    `SELECT PERSONA_ID,NAME,DESCRIPTION,ICON,SYSTEM_PROMPT,IS_DEFAULT,IS_ACTIVE,SORT_ORDER,CREATED_AT,UPDATED_AT
       FROM AI_PERSONA WHERE PERSONA_ID = :personaId`,
    { personaId },
  );
  return rows.length > 0 ? rowToPersona(rows[0]) : null;
}

export async function getDefaultPersona(): Promise<Persona | null> {
  const rows = await executeQuery<DbRow>(
    `SELECT PERSONA_ID,NAME,DESCRIPTION,ICON,SYSTEM_PROMPT,IS_DEFAULT,IS_ACTIVE,SORT_ORDER,CREATED_AT,UPDATED_AT
       FROM AI_PERSONA WHERE IS_DEFAULT = 1 AND IS_ACTIVE = 1 AND ROWNUM = 1`,
  );
  return rows.length > 0 ? rowToPersona(rows[0]) : null;
}

export async function createPersona(input: Omit<Persona, 'personaId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const personaId = `p_${randomUUID().slice(0, 8)}`;
  if (input.isDefault) {
    await executeDml('UPDATE AI_PERSONA SET IS_DEFAULT = 0', {});
  }
  await executeDml(
    `INSERT INTO AI_PERSONA (PERSONA_ID,NAME,DESCRIPTION,ICON,SYSTEM_PROMPT,IS_DEFAULT,IS_ACTIVE,SORT_ORDER,CREATED_AT)
     VALUES (:personaId,:name,:description,:icon,:systemPrompt,:isDefault,:isActive,:sortOrder,SYSTIMESTAMP)`,
    {
      personaId,
      name: input.name, description: input.description, icon: input.icon,
      systemPrompt: input.systemPrompt,
      isDefault: input.isDefault ? 1 : 0,
      isActive:  input.isActive  ? 1 : 0,
      sortOrder: input.sortOrder,
    },
  );
  return personaId;
}

export async function updatePersona(personaId: string, input: Partial<Omit<Persona, 'personaId' | 'createdAt'>>): Promise<void> {
  if (input.isDefault === true) {
    await executeDml('UPDATE AI_PERSONA SET IS_DEFAULT = 0', {});
  }
  const fields: string[] = [];
  const binds: Record<string, unknown> = { personaId };
  if (input.name !== undefined)         { fields.push('NAME = :name'); binds.name = input.name; }
  if (input.description !== undefined)  { fields.push('DESCRIPTION = :description'); binds.description = input.description; }
  if (input.icon !== undefined)         { fields.push('ICON = :icon'); binds.icon = input.icon; }
  if (input.systemPrompt !== undefined) { fields.push('SYSTEM_PROMPT = :systemPrompt'); binds.systemPrompt = input.systemPrompt; }
  if (input.isDefault !== undefined)    { fields.push('IS_DEFAULT = :isDefault'); binds.isDefault = input.isDefault ? 1 : 0; }
  if (input.isActive !== undefined)     { fields.push('IS_ACTIVE = :isActive'); binds.isActive = input.isActive ? 1 : 0; }
  if (input.sortOrder !== undefined)    { fields.push('SORT_ORDER = :sortOrder'); binds.sortOrder = input.sortOrder; }
  if (fields.length === 0) return;
  fields.push('UPDATED_AT = SYSTIMESTAMP');
  await executeDml(
    `UPDATE AI_PERSONA SET ${fields.join(', ')} WHERE PERSONA_ID = :personaId`,
    binds as oracledb.BindParameters,
  );
}

export async function deletePersona(personaId: string): Promise<void> {
  await executeDml('DELETE FROM AI_PERSONA WHERE PERSONA_ID = :personaId', { personaId });
}
