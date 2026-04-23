/**
 * @file src/app/api/ai-context/objects/route.ts
 * @description AI 학습 대상 DB 객체(테이블/함수/프로시저) 통합 뷰.
 *
 * 초보자 가이드:
 * - schema-cache.json: DB 테이블 스냅샷 (기존, /api/ai-tables/sync 로 갱신)
 * - db-objects-cache.json: DB 함수·프로시저 스냅샷 (scripts/extract-db-objects.py 로 갱신)
 * - wiki/ai-chat/{tables,functions,procedures}/*.md: 사람이 작성한 학습자료
 *
 * 이 엔드포인트는 3개 소스를 합쳐서 UI 목록에 뿌릴 단순 배열을 반환한다.
 * 각 항목마다 등록 여부(MD 존재)·enabled 플래그 포함.
 *
 * 응답 형식:
 *   {
 *     tables:     [{ name, category, pk, registered, enabled, summary? }, ...],
 *     functions:  [{ name, returns, argCount, registered, enabled }, ...],
 *     procedures: [{ name, argCount, registered, enabled }, ...]
 *   }
 */

import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadAiChatContext } from '@/lib/ai/context/md-loader';

const ROOT = process.cwd();
const SCHEMA_CACHE = path.join(ROOT, 'data', 'ai-context', 'schema-cache.json');
const DB_OBJECTS_CACHE = path.join(
  ROOT,
  'data',
  'ai-context',
  'db-objects-cache.json',
);

interface TableItem {
  name: string;
  category?: string;
  pk: string[];
  summary?: string;
  registered: boolean;
  enabled: boolean;
}

interface FunctionItem {
  name: string;
  returns: string | null;
  argCount: number;
  registered: boolean;
  enabled: boolean;
}

interface ProcedureItem {
  name: string;
  argCount: number;
  registered: boolean;
  enabled: boolean;
}

export async function GET() {
  const [schemaRaw, dbObjRaw, wiki] = await Promise.all([
    readJsonOrEmpty(SCHEMA_CACHE),
    readJsonOrEmpty(DB_OBJECTS_CACHE),
    loadAiChatContext(),
  ]);

  // --- tables ----------------------------------------------------
  const tables: TableItem[] = [];
  const sites = schemaRaw?.sites ?? {};
  // default 사이트 우선, 없으면 첫 번째
  const siteKey = sites['default'] ? 'default' : Object.keys(sites)[0];
  const siteTables = sites[siteKey]?.tables ?? {};

  for (const [name, meta] of Object.entries<Record<string, unknown>>(siteTables)) {
    const registered = await hasWikiFile('tables', slugify(name));
    const mdEntry = wiki.tables[name];
    tables.push({
      name,
      category: (meta.category as string) ?? undefined,
      pk: Array.isArray(meta.pkColumns)
        ? (meta.pkColumns as string[])
        : [],
      summary: (meta.tableComment as string) ?? undefined,
      registered,
      enabled: mdEntry?.enabled ?? false,
    });
  }
  tables.sort((a, b) => a.name.localeCompare(b.name));

  // --- functions / procedures -----------------------------------
  const functions: FunctionItem[] = [];
  for (const [name, meta] of Object.entries<Record<string, unknown>>(
    dbObjRaw?.functions ?? {},
  )) {
    const registered = await hasWikiFile('functions', slugify(name));
    const mdEntry = wiki.functions[name];
    functions.push({
      name,
      returns: (meta.returns as string) ?? null,
      argCount: Array.isArray(meta.args) ? (meta.args as unknown[]).length : 0,
      registered,
      enabled: mdEntry?.enabled ?? false,
    });
  }
  functions.sort((a, b) => a.name.localeCompare(b.name));

  const procedures: ProcedureItem[] = [];
  for (const [name, meta] of Object.entries<Record<string, unknown>>(
    dbObjRaw?.procedures ?? {},
  )) {
    const registered = await hasWikiFile('procedures', slugify(name));
    const mdEntry = wiki.procedures[name];
    procedures.push({
      name,
      argCount: Array.isArray(meta.args) ? (meta.args as unknown[]).length : 0,
      registered,
      enabled: mdEntry?.enabled ?? false,
    });
  }
  procedures.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ tables, functions, procedures });
}

// ---------------------------------------------------------------------------

async function readJsonOrEmpty(p: string): Promise<any> {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function hasWikiFile(
  kind: 'tables' | 'functions' | 'procedures',
  slug: string,
): Promise<boolean> {
  const p = path.join(ROOT, 'wiki', 'ai-chat', kind, `${slug}.md`);
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** DB 객체 이름 (LOG_ICT, F_GET_LINE_NAME) → MD 슬러그 (log-ict, f-get-line-name) */
function slugify(objectName: string): string {
  return objectName.toLowerCase().replace(/_/g, '-');
}
