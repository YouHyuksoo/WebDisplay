/**
 * @file src/lib/ai-tables/wiki-draft.ts
 * @description wiki/ai-chat/{tables,functions,procedures}/ 용 MD 초안 생성기.
 *
 * 초보자 가이드:
 * - /api/ai-context/wiki/[kind]/[slug]/draft (UI "자동 초안" 버튼) 과
 *   /api/ai-context/wiki/[kind]/[slug]/toggle (사용함 토글) 에서 공유.
 * - tables: schema-cache.json 기반
 * - functions/procedures: db-objects-cache.json 기반
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SCHEMA_CACHE = path.join(ROOT, 'data', 'ai-context', 'schema-cache.json');
const DB_OBJECTS_CACHE = path.join(
  ROOT,
  'data',
  'ai-context',
  'db-objects-cache.json',
);

export type WikiKind = 'tables' | 'functions' | 'procedures';

interface DbArg {
  name: string | null;
  type: string;
  mode: string;
  position: number;
}

/**
 * 주어진 kind+slug 에 대한 MD 초안을 반환. DB 캐시에 해당 객체 없으면 null.
 * enabled 필드는 기본 false (보강 전엔 AI 주입 대상 아님).
 */
export async function buildWikiDraft(
  kind: WikiKind,
  slug: string,
): Promise<string | null> {
  const objectName = slug.toUpperCase().replace(/-/g, '_');
  const today = new Date().toISOString().slice(0, 10);

  if (kind === 'tables') return draftTable(objectName, today);
  if (kind === 'functions') {
    const obj = await loadDbObject('functions', objectName);
    return obj ? draftFunction(obj, today) : null;
  }
  const obj = await loadDbObject('procedures', objectName);
  return obj ? draftProcedure(obj, today) : null;
}

/**
 * MD 문자열의 frontmatter 에서 `enabled` 값을 교체.
 * 필드가 없으면 frontmatter 끝에 추가.
 */
export function setEnabledInFrontmatter(md: string, enabled: boolean): string {
  if (/^enabled:\s*(true|false)/m.test(md)) {
    return md.replace(/^enabled:\s*(true|false)/m, `enabled: ${enabled}`);
  }
  // frontmatter 블록 끝(`---`) 앞에 enabled 추가
  return md.replace(
    /^(---\r?\n[\s\S]*?)(\r?\n---\r?\n)/,
    `$1\nenabled: ${enabled}$2`,
  );
}

// ---------------------------------------------------------------------------

async function draftTable(
  tableName: string,
  today: string,
): Promise<string | null> {
  const raw = await readJsonOrNull(SCHEMA_CACHE);
  if (!raw) return null;
  const sites = raw.sites ?? {};
  const siteKey = sites['default'] ? 'default' : Object.keys(sites)[0];
  const meta = sites[siteKey]?.tables?.[tableName];
  if (!meta) return null;

  const pk: string[] = Array.isArray(meta.pkColumns) ? meta.pkColumns : [];
  const columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    comment: string | null;
  }> = Array.isArray(meta.columns) ? meta.columns : [];

  const rows = columns
    .map((c) => {
      const cleanComment = stripPbHints(c.comment).replace(/\|/g, '\\|');
      return `| ${c.name} | ${c.type} | ${c.nullable ? 'Y' : 'N'} | ${cleanComment} |`;
    })
    .join('\n');

  const cleanTableComment = stripPbHints(meta.tableComment);

  return `---
object: ${tableName}
kind: table
category: ${meta.category ?? ''}
pk: [${pk.join(', ')}]
enabled: false
tags: []
updated: ${today}
---

## 개요
${cleanTableComment || '(사람 작성)'}

## 용도
(사람 작성 — 이 테이블이 어떤 비즈니스 상황에 쓰이는지)

## 컬럼
| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
${rows || '| (컬럼 없음) | | | |'}

## 자주 쓰는 JOIN
(사람 작성)

## 주의
(사람 작성)
`;
}

function draftFunction(
  obj: { name: string; returns: string | null; args: DbArg[] },
  today: string,
): string {
  const argsYaml = obj.args.length
    ? obj.args
        .map(
          (a) =>
            `  - { name: ${a.name}, type: ${a.type}, mode: ${a.mode} }`,
        )
        .join('\n')
    : '  []';
  const argList = obj.args.map((a) => a.name).join(', ');
  return `---
object: ${obj.name}
kind: function
returns: ${obj.returns ?? 'UNKNOWN'}
args:
${argsYaml}
enabled: false
tags: []
updated: ${today}
---

## 개요
(사람 작성)

## 용도
(사람 작성)

## 사용법
\`\`\`sql
${obj.name}(${argList})  -- RETURN ${obj.returns ?? 'UNKNOWN'}
\`\`\`

## 주의
(사람 작성)
`;
}

function draftProcedure(
  obj: { name: string; args: DbArg[] },
  today: string,
): string {
  const argsYaml = obj.args.length
    ? obj.args
        .map(
          (a) =>
            `  - { name: ${a.name}, type: ${a.type}, mode: ${a.mode} }`,
        )
        .join('\n')
    : '  []';
  const argList = obj.args
    .map((a) => (a.mode === 'OUT' ? `OUT ${a.name}` : a.name))
    .join(', ');
  return `---
object: ${obj.name}
kind: procedure
args:
${argsYaml}
enabled: false
tags: []
updated: ${today}
---

## 개요
(사람 작성)

## 용도
(사람 작성 — 언제 실행되는지, 어느 테이블을 갱신하는지)

## 호출 (참고용 — AI 는 sql-guard 로 실행 SQL 생성 금지)
\`\`\`sql
BEGIN ${obj.name}(${argList}); END;
\`\`\`

## 주의
(사람 작성)
`;
}

async function loadDbObject(
  kind: 'functions' | 'procedures',
  name: string,
): Promise<{ name: string; returns: string | null; args: DbArg[] } | null> {
  const raw = await readJsonOrNull(DB_OBJECTS_CACHE);
  if (!raw) return null;
  const obj = raw[kind]?.[name];
  if (!obj) return null;
  return {
    name: obj.name,
    returns: obj.returns ?? null,
    args: Array.isArray(obj.args) ? obj.args : [],
  };
}

/**
 * 테이블/컬럼 주석에서 PB화면 / DataWindow / 기타 파이프 구분 메타 제거.
 * PowerBuilder 잔재는 이제 프로젝트와 무관. 순수 도메인 의미만 남긴다.
 *
 * 규칙: 첫 ` | ` 구분자 이후 전부 제거. 앞뒤 공백 정리.
 */
function stripPbHints(s: string | null | undefined): string {
  if (!s) return '';
  let t = s;
  const pipeIdx = t.indexOf(' | ');
  if (pipeIdx > 0) t = t.slice(0, pipeIdx);
  return t.trim();
}

async function readJsonOrNull(p: string): Promise<any> {
  try {
    const raw = await fs.readFile(p, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
