# AI 지도학습 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/settings/ai-tables` 페이지를 구현해 테이블·컬럼·예제·도메인을 큐레이션하여 `/ai-chat`에 구조화된 AI 컨텍스트를 주입한다.

**Architecture:** Oracle 주석을 SSOT로 유지하면서 `data/ai-context/tables.json` (사이트 카테고리)과 `column-domains.json` (의미 그룹) 두 파일에 학습 메타를 저장. 페이지에서 DDL 2단계 확인으로 주석 편집, compact 프롬프트 포맷으로 `/ai-chat` 토큰 67% 감축, 예제 3종(exact/template/skeleton) 캐스케이드 매칭으로 품질 향상.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zustand, SWR, Oracle (oracledb), SSE

**Reference Spec:** `docs/superpowers/specs/2026-04-16-ai-tables-training-design.md`

---

## Phase 구성

| Phase | 작업 | 추정 | 의존 |
|---|---|---|---|
| 0 | 준비·확인 | 0.5일 | — |
| 1 | 마이그레이션 스크립트 | 1일 | 0 |
| 2 | 런타임 전환 (backend only) | 1.5일 | 1 |
| 3a | 페이지 shell + 기본 CRUD API | 2~3일 | 2 |
| 3b | 고급 기능 (AI 초안/라이브 프리뷰/도메인/피드백) | 3~4일 | 3a |
| 4 | 레거시 정리 | 0.5일 (3b 안정화 1~2주 후) | 3b |

---

## Phase 0: 준비·확인

목표: 가정 확인, 스켈레톤 생성, 의존성 설치. 기존 `/ai-chat` 동작 무영향.

### Task 0.1: `ISYS_DUAL_LANGUAGE` 실제 스키마 확인

**Files:**
- Read (임시 결과 출력): 없음. Bash 쿼리 결과를 spec §4.5 / §13 O1 업데이트에 반영

- [ ] **Step 1: DB 조회 실행**

```bash
# SELECT USER_TAB_COLUMNS로 컬럼 구조 확인
node -e "
const { executeQuery } = require('./src/lib/db');
executeQuery('SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t ORDER BY COLUMN_ID', { t: 'ISYS_DUAL_LANGUAGE' }).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Expected: 컬럼 목록 출력 (CATEGORY, KEY_CODE, KOR, ENG, SPA 또는 유사 구조)

- [ ] **Step 2: 샘플 레코드 5개 확인**

```bash
node -e "
const { executeQuery } = require('./src/lib/db');
executeQuery('SELECT * FROM ISYS_DUAL_LANGUAGE WHERE ROWNUM <= 5').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Expected: 실제 데이터 포맷 (특히 `KEY_CODE` 형식이 `TABLE.COLUMN`인지 다른 형식인지)

- [ ] **Step 3: 가정과 실제 비교 및 spec 업데이트**

```bash
# spec §4.5 CachedColumn.labels, §6.2 /label 엔드포인트, §13 O1 재확인
# 가정과 다르면 design doc 업데이트 (구조가 다르면 dual-language.ts 구현 방향 변경)
```

- [ ] **Step 4: 결과를 design doc에 반영**

Edit `docs/superpowers/specs/2026-04-16-ai-tables-training-design.md` §13 O1:
- 확인된 실스키마 명시
- `dual-language.ts`가 사용할 실제 컬럼명으로 수정
- §13 O1 상태를 "확인 완료: 실스키마 = ..."로 변경

### Task 0.2: F_GET_BASECODE 함수 호출 규약 확인

**Files:**
- 업데이트: `docs/superpowers/specs/2026-04-16-ai-tables-training-design.md` §13 O5

- [ ] **Step 1: 함수 시그니처 조회**

```bash
node -e "
const { executeQuery } = require('./src/lib/db');
executeQuery(\`SELECT ARGUMENT_NAME, DATA_TYPE, IN_OUT, POSITION FROM USER_ARGUMENTS WHERE OBJECT_NAME = 'F_GET_BASECODE' ORDER BY POSITION\`).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Expected: 파라미터 목록 (code_type, code, lang 순서 및 형식)

- [ ] **Step 2: 실제 호출 테스트**

```bash
node -e "
const { executeQuery } = require('./src/lib/db');
executeQuery(\"SELECT F_GET_BASECODE('LOCATION CODE', 'M01', 'KO') v FROM DUAL\").then(r => console.log(r));
"
```

Expected: "양품" 또는 유사한 해석값 반환 (실패 시 인자 순서/언어코드 확인)

- [ ] **Step 3: spec §13 O5에 확인된 호출 규약 기록**

### Task 0.3: nanoid 설치 확인 및 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 현재 의존성 확인**

```bash
node -e "const p=require('./package.json'); console.log('nanoid:', {...p.dependencies, ...p.devDependencies}.nanoid || '(없음)');"
```

- [ ] **Step 2: 없으면 설치 (사용자 확인 후)**

```bash
npm i nanoid
```

Expected: `package.json`의 dependencies에 `"nanoid": "^5.x.x"` 추가됨

### Task 0.4: Zustand 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Zustand 설치**

```bash
npm i zustand
```

Expected: `package.json` dependencies에 `"zustand": "^5.x.x"` 추가. `node_modules/zustand/` 생성

- [ ] **Step 2: 설치 검증**

```bash
node -e "console.log(require('zustand/package.json').version)"
```

Expected: 버전 문자열 출력 (5.x)

### Task 0.5: 신규 데이터 파일 스켈레톤 생성

**Files:**
- Create: `data/ai-context/tables.json`
- Create: `data/ai-context/column-domains.json`
- Create: `data/ai-context/basecode-cache.json`
- Create: `data/ai-context/schema-cache.json`
- Create: `scripts/sql/comment-history/.gitkeep`

- [ ] **Step 1: tables.json 빈 스켈레톤 생성**

File `data/ai-context/tables.json`:
```json
{
  "version": 1,
  "updatedAt": "2026-04-16T00:00:00.000Z",
  "sites": {
    "default": { "tables": {} }
  }
}
```

- [ ] **Step 2: column-domains.json 빈 스켈레톤**

File `data/ai-context/column-domains.json`:
```json
{
  "version": 1,
  "updatedAt": "2026-04-16T00:00:00.000Z",
  "domains": []
}
```

- [ ] **Step 3: basecode-cache.json 빈 스켈레톤**

File `data/ai-context/basecode-cache.json`:
```json
{
  "version": 1,
  "refreshedAt": "2026-04-16T00:00:00.000Z",
  "codeTypes": []
}
```

- [ ] **Step 4: schema-cache.json 빈 스켈레톤**

File `data/ai-context/schema-cache.json`:
```json
{
  "version": 1,
  "refreshedAt": "2026-04-16T00:00:00.000Z",
  "sites": {
    "default": { "tables": {} }
  }
}
```

- [ ] **Step 5: comment-history 폴더 유지용 .gitkeep 생성**

File `scripts/sql/comment-history/.gitkeep`:
```
# AI Tables 페이지의 DDL 실행 이력이 이 폴더에 YYYY-MM-DD_HHmmss_<TABLE>.sql 파일로 자동 생성됩니다.
```

### Task 0.6: `src/lib/ai-tables/` 타입 정의

**Files:**
- Create: `src/lib/ai-tables/types.ts`

- [ ] **Step 1: types.ts 작성 (spec §4 전체 타입)**

File `src/lib/ai-tables/types.ts`:
```typescript
/**
 * @file src/lib/ai-tables/types.ts
 * @description AI 지도학습 페이지 전체 타입 정의.
 *   - tables.json / column-domains.json / schema-cache.json / basecode-cache.json 스키마
 *   - Example 3종(kind), ColumnDecode 6종, 피드백 큐 등
 * @see docs/superpowers/specs/2026-04-16-ai-tables-training-design.md §4
 */

export type SiteKey = 'default' | '멕시코전장내부' | '멕시코VD외부' | '베트남VD외부';

export interface AiTablesFile {
  version: 1;
  updatedAt: string;
  sites: Record<SiteKey, SiteTables>;
}

export interface SiteTables {
  tables: Record<string, TableMeta>;
}

export interface TableMeta {
  enabled: boolean;
  tags: string[];
  summary?: string;
  relatedTables?: string[];
  keywords?: string[];
  defaultFilters?: DefaultFilter[];
  joinPatterns?: JoinPattern[];
  businessNotes?: string;
  columnOverrides?: Record<string, ColumnOverride>;
  examples: Example[];
  feedbackQueue: FeedbackCandidate[];
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export interface DefaultFilter { sql: string; purpose: string; alwaysApply: boolean; }
export interface JoinPattern { withTable: string; onClause: string; purpose: string; }

export interface ColumnOverride {
  priority?: 'key' | 'common' | 'rare';
  excludeFromPrompt?: boolean;
  hint?: string;
  decode?: ColumnDecode;
}

export type ColumnDecode =
  | { kind: 'raw' }
  | { kind: 'basecode'; codeType: string }
  | { kind: 'master'; table: string; keyCol: string; valCol: string }
  | { kind: 'enum'; values: Record<string, string> }
  | { kind: 'flag'; trueValue: string; falseValue?: string }
  | { kind: 'date'; format?: string };

export type ExampleKind = 'exact' | 'template' | 'skeleton';

export interface Example {
  id: string;
  kind: ExampleKind;
  question: string;
  why: string;
  whyInPrompt?: boolean;
  createdAt: string;
  source: 'manual' | 'ai-draft' | 'promoted';
  promotedFrom?: { chatSessionId: string; messageId: string; likedAt: string; };
  sql?: string;                         // exact
  sqlTemplate?: string;                 // template/skeleton
  slots?: ExampleSlot[];                // template/skeleton
  dialog?: DialogStep[];                // skeleton
}

export interface ExampleSlot {
  name: string;
  bind: string;
  type: 'date' | 'daterange' | 'string' | 'number' | 'enum';
  required: boolean;
  default?: string;
  aliases?: string[];
  enumValues?: string[];
  hint?: string;
  placeholder?: string;
}

export interface DialogStep {
  id: string;
  prompt: string;
  slotName: string;
  required: boolean;
  suggestedAnswers?: string[];
  skipIf?: string;
}

export interface FeedbackCandidate {
  id: string;
  sessionId: string;
  question: string;
  sql: string;
  likedAt: string;
  resultSampleJson?: string;
  tablesReferenced: string[];
}

export interface ColumnDomainsFile {
  version: 1;
  updatedAt: string;
  domains: ColumnDomain[];
}

export interface ColumnDomain {
  id: string;
  name: string;
  description?: string;
  members: string[];
  excludeFromPrompt?: boolean;
  priority?: 'key' | 'common' | 'rare';
  hint?: string;
  decode?: ColumnDecode;
}

export interface SchemaCacheFile {
  version: 1;
  refreshedAt: string;
  sites: Record<SiteKey, { tables: Record<string, CachedTableSchema>; }>;
}

export interface CachedTableSchema {
  tableComment: string | null;
  pkColumns: string[];
  columns: CachedColumn[];
  refreshedAt: string;
}

export interface CachedColumn {
  name: string;
  type: string;
  nullable: boolean;
  comment: string | null;
  labels: { ko?: string; en?: string; es?: string; };
}

export interface BasecodeCacheFile {
  version: 1;
  refreshedAt: string;
  codeTypes: Array<{ codeType: string; sampleValues?: string[]; }>;
}
```

- [ ] **Step 2: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 신규 타입으로 인한 에러 없음 (기존 코드 영향 없음)

### Task 0.7: `src/lib/ai-tables/` 모듈 스켈레톤 + mutex

**Files:**
- Create: `src/lib/ai-tables/paths.ts`
- Create: `src/lib/ai-tables/mutex.ts`

- [ ] **Step 1: paths.ts 작성**

File `src/lib/ai-tables/paths.ts`:
```typescript
/**
 * @file src/lib/ai-tables/paths.ts
 * @description AI Tables 관련 파일 경로 상수. OS 중립 `path.join` 사용.
 */

import path from 'path';

const root = process.cwd();
const contextDir = path.join(root, 'data', 'ai-context');

export const PATHS = {
  contextDir,
  tablesJson:     path.join(contextDir, 'tables.json'),
  columnDomains:  path.join(contextDir, 'column-domains.json'),
  schemaCache:    path.join(contextDir, 'schema-cache.json'),
  basecodeCache:  path.join(contextDir, 'basecode-cache.json'),
  historyDir:     path.join(root, 'scripts', 'sql', 'comment-history'),
} as const;
```

- [ ] **Step 2: mutex.ts 작성 (간단한 in-memory lock)**

File `src/lib/ai-tables/mutex.ts`:
```typescript
/**
 * @file src/lib/ai-tables/mutex.ts
 * @description 단일 개발자 환경용 in-memory mutex.
 *   동일 경로에 대한 동시 쓰기 직렬화. 프로세스 외 동시성은 보호하지 않음.
 */

const locks = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((resolve) => { release = resolve; });
  locks.set(key, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release!();
    if (locks.get(key) === next) locks.delete(key);
  }
}
```

- [ ] **Step 3: 단위 테스트 작성**

File `src/lib/ai-tables/__tests__/mutex.test.ts`:
```typescript
import { withLock } from '../mutex';

describe('withLock', () => {
  it('serializes concurrent calls with the same key', async () => {
    const order: number[] = [];
    const slow = (i: number) => withLock('k', async () => {
      await new Promise((r) => setTimeout(r, 10));
      order.push(i);
    });
    await Promise.all([slow(1), slow(2), slow(3)]);
    expect(order).toEqual([1, 2, 3]);
  });

  it('allows parallelism for different keys', async () => {
    const start = Date.now();
    await Promise.all([
      withLock('a', () => new Promise((r) => setTimeout(r, 30))),
      withLock('b', () => new Promise((r) => setTimeout(r, 30))),
    ]);
    expect(Date.now() - start).toBeLessThan(50);
  });
});
```

- [ ] **Step 4: 테스트 실행**

```bash
npx jest src/lib/ai-tables/__tests__/mutex.test.ts
```

Expected: 2 passed

### Task 0.8: Phase 0 커밋

- [ ] **Step 1: 상태 확인**

```bash
git status
```

Expected: `data/ai-context/*.json`, `scripts/sql/comment-history/.gitkeep`, `src/lib/ai-tables/` 파일들, `package.json` 변경

- [ ] **Step 2: 커밋 (사용자 승인 후)**

```bash
git add data/ai-context/ scripts/sql/comment-history/ src/lib/ai-tables/ package.json package-lock.json
git commit -m "feat(ai-tables): Phase 0 스켈레톤 + 타입 정의 + Zustand/nanoid 설치"
```

---

## Phase 1: 마이그레이션 스크립트

목표: 기존 `catalog.json` + `tables/*.md` + DB 주석을 `tables.json` / `schema-cache.json` / `basecode-cache.json` / `column-domains.json` 4개 파일로 통합. **기존 자산 삭제 금지**.

### Task 1.1: 마이그레이션 스크립트 골격

**Files:**
- Create: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: 스크립트 진입점 작성**

File `scripts/migrate-to-tables-json.mjs`:
```javascript
/**
 * @file scripts/migrate-to-tables-json.mjs
 * @description 기존 catalog.json + tables/*.md → tables.json 통합 마이그레이션.
 *   기존 파일 삭제하지 않음. 재실행 가능(idempotent).
 * @usage node scripts/migrate-to-tables-json.mjs [--profile=<name>] [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import oracledb from 'oracledb';

const root = process.cwd();
const ctx = path.join(root, 'data', 'ai-context');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const profileOverride = argv.find(a => a.startsWith('--profile='))?.split('=')[1];

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function saveJson(p, data) {
  if (dryRun) { console.log(`[dry-run] would write ${p}`); return; }
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

async function main() {
  console.log('🚀 migrate-to-tables-json 시작');
  console.log(`   dry-run: ${dryRun}`);

  // 단계별 함수 호출 (다음 Task에서 구현)
  const catalog = loadJson(path.join(ctx, 'catalog.json'));
  console.log(`   catalog: ${catalog.tables.length} 테이블`);

  console.log('✅ 완료');
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
```

- [ ] **Step 2: 실행 테스트**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run
```

Expected: `catalog: 45 테이블` 출력, 에러 없음

### Task 1.2: catalog.json → tables.json 변환 함수

**Files:**
- Modify: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: `buildTablesJson()` 함수 추가**

Edit `scripts/migrate-to-tables-json.mjs` — `main()` 함수 위에 추가:
```javascript
function buildTablesJson(catalog) {
  const out = { version: 1, updatedAt: new Date().toISOString(), sites: {} };
  for (const t of catalog.tables) {
    const site = t.site || 'default';
    out.sites[site] ??= { tables: {} };
    out.sites[site].tables[t.name] = {
      enabled: true,
      tags: t.tags || [],
      summary: t.summary || '',
      relatedTables: [],
      columnOverrides: {},
      examples: [],
      feedbackQueue: [],
    };
  }
  return out;
}
```

- [ ] **Step 2: `main()`에서 호출 + 저장**

Edit `main()` — `catalog = loadJson(...)` 다음에 추가:
```javascript
  const tablesJson = buildTablesJson(catalog);
  const totalTables = Object.values(tablesJson.sites).reduce((s, v) => s + Object.keys(v.tables).length, 0);
  console.log(`   tables.json: ${totalTables} 테이블 생성`);
  saveJson(path.join(ctx, 'tables.json'), tablesJson);
```

- [ ] **Step 3: 실행 테스트 (dry-run)**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run
```

Expected: `tables.json: 45 테이블 생성` + `[dry-run] would write ...`

### Task 1.3: MD 파일 frontmatter + 예제 섹션 파싱

**Files:**
- Modify: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: 간단한 frontmatter 파서 추가 (YAML lite)**

Edit `scripts/migrate-to-tables-json.mjs` — 상단 함수 영역에 추가:
```javascript
function parseMarkdown(md) {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { frontmatter: {}, body: md };
  const fm = {};
  for (const line of fmMatch[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (v.startsWith('[') && v.endsWith(']')) {
      fm[k] = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    } else {
      fm[k] = v.trim();
    }
  }
  return { frontmatter: fm, body: fmMatch[2] };
}

function extractExamplesFromMd(body) {
  // "## 예제 쿼리" 섹션에 실제 SQL 블록이 있으면 추출. 없으면 빈 배열.
  const exMatch = body.match(/##\s*예제\s*쿼리\s*\n([\s\S]*?)(?=\n##|\n$)/);
  if (!exMatch) return [];
  const section = exMatch[1].trim();
  if (!section) return [];
  // 간단한 휴리스틱: ```sql 블록 각각을 exact 예제로
  const sqlBlocks = [...section.matchAll(/```sql\n([\s\S]*?)```/g)];
  return sqlBlocks.map((m, i) => ({
    id: `mig-${Date.now()}-${i}`,
    kind: 'exact',
    question: `(마이그레이션된 예제 ${i + 1})`,
    sql: m[1].trim(),
    why: '이관 시점에 MD에서 가져옴. 수동 정리 필요.',
    createdAt: new Date().toISOString(),
    source: 'manual',
  }));
}
```

- [ ] **Step 2: `buildTablesJson()`에 MD 병합 로직 추가**

Edit `buildTablesJson()` — 기존 루프 내부에서:
```javascript
  for (const t of catalog.tables) {
    const site = t.site || 'default';
    const mdPath = path.join(ctx, 'tables', `${t.name}.md`);
    let mdFm = {}, mdExamples = [];
    if (fs.existsSync(mdPath)) {
      const parsed = parseMarkdown(fs.readFileSync(mdPath, 'utf-8'));
      mdFm = parsed.frontmatter;
      mdExamples = extractExamplesFromMd(parsed.body);
    }
    out.sites[site] ??= { tables: {} };
    out.sites[site].tables[t.name] = {
      enabled: true,
      tags: t.tags || [],
      summary: mdFm.description || t.summary || '',
      relatedTables: mdFm.related_tables || [],
      columnOverrides: {},
      examples: mdExamples,
      feedbackQueue: [],
    };
  }
```

- [ ] **Step 3: 실행 + 예제 개수 확인**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run 2>&1 | tail -5
```

Expected: 에러 없이 완료. MD에 예제 있는 테이블은 `examples` 채워짐 (대부분 비어있을 것)

### Task 1.4: schema-cache.json — DB 조회로 빌드

**Files:**
- Modify: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: DB 접속 함수 추가 (기존 generate-table-doc-from-db.mjs 참고)**

Edit `scripts/migrate-to-tables-json.mjs` — 상단에 추가:
```javascript
function loadDbConfig() {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config', 'database.json'), 'utf-8'));
  const name = profileOverride || cfg.activeProfile;
  const p = cfg.profiles.find(x => x.name === name);
  if (!p) throw new Error(`profile ${name} not found`);
  return p;
}

async function fetchTableSchema(conn, tableName) {
  const cols = await conn.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE, NULLABLE
       FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t ORDER BY COLUMN_ID`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  if (!cols.rows.length) return null;

  const comments = await conn.execute(
    `SELECT COLUMN_NAME, COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  const cmap = Object.fromEntries(comments.rows.map(r => [r.COLUMN_NAME, r.COMMENTS]));

  const tabCmt = await conn.execute(
    `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

  const pk = await conn.execute(
    `SELECT cols.COLUMN_NAME FROM USER_CONSTRAINTS c
       JOIN USER_CONS_COLUMNS cols ON c.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
      WHERE c.TABLE_NAME = :t AND c.CONSTRAINT_TYPE = 'P' ORDER BY cols.POSITION`,
    { t: tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

  return {
    tableComment: tabCmt.rows[0]?.COMMENTS || null,
    pkColumns: pk.rows.map(r => r.COLUMN_NAME),
    columns: cols.rows.map(c => ({
      name: c.COLUMN_NAME,
      type: formatType(c),
      nullable: c.NULLABLE === 'Y',
      comment: cmap[c.COLUMN_NAME] || null,
      labels: {},   // Step 3에서 채움
    })),
    refreshedAt: new Date().toISOString(),
  };
}

function formatType(c) {
  const { DATA_TYPE: t, DATA_LENGTH: len, DATA_PRECISION: p, DATA_SCALE: s } = c;
  if (t === 'NUMBER') return p == null ? 'NUMBER' : s > 0 ? `NUMBER(${p},${s})` : `NUMBER(${p})`;
  if (['VARCHAR2','CHAR','NVARCHAR2','NCHAR'].includes(t)) return `${t}(${len})`;
  return t;
}
```

- [ ] **Step 2: `buildSchemaCache()` 메인 루프**

Edit `scripts/migrate-to-tables-json.mjs` — 함수 추가:
```javascript
async function buildSchemaCache(catalog, conn) {
  const out = { version: 1, refreshedAt: new Date().toISOString(), sites: {} };
  for (const t of catalog.tables) {
    const site = t.site || 'default';
    out.sites[site] ??= { tables: {} };
    process.stdout.write(`   schema: ${t.name}... `);
    const schema = await fetchTableSchema(conn, t.name);
    if (!schema) { console.log('SKIP (DB에 없음)'); continue; }
    out.sites[site].tables[t.name] = schema;
    console.log(`${schema.columns.length} cols`);
  }
  return out;
}
```

- [ ] **Step 3: `main()`에 DB 동기화 단계 추가**

Edit `main()`:
```javascript
  // DB 연결
  const cfg = loadDbConfig();
  const conn = await oracledb.getConnection({
    user: cfg.username, password: cfg.password,
    connectString: cfg.connectionType === 'SERVICE_NAME'
      ? `${cfg.host}:${cfg.port}/${cfg.sidOrService}`
      : `${cfg.host}:${cfg.port}:${cfg.sidOrService}`,
  });
  console.log(`   DB 연결: ${cfg.name}`);

  const schemaCache = await buildSchemaCache(catalog, conn);
  saveJson(path.join(ctx, 'schema-cache.json'), schemaCache);

  await conn.close();
```

- [ ] **Step 4: 실제 실행 (dry-run은 DB 조회는 하지만 파일은 안 씀)**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run
```

Expected: 각 테이블별 `schema: LOG_AOI... 20 cols` 출력. 약 45회 반복

### Task 1.5: ISYS_DUAL_LANGUAGE 라벨 병합

**Files:**
- Modify: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: 라벨 조회 함수 추가 (Task 0.1 확인 결과 기반)**

Edit `scripts/migrate-to-tables-json.mjs` — `fetchTableSchema()` 내부 또는 별도 함수:

**주의**: Task 0.1에서 확인한 실제 `ISYS_DUAL_LANGUAGE` 컬럼명으로 교체. 아래는 가정 기준 샘플.

```javascript
async function fetchLabels(conn, tableName) {
  // Task 0.1 결과로 확정된 실제 스키마로 교체
  try {
    const res = await conn.execute(
      `SELECT KEY_CODE, KOR, ENG, SPA FROM ISYS_DUAL_LANGUAGE
        WHERE KEY_CODE LIKE :p`,
      { p: `${tableName}.%` },
      { outFormat: oracledb.OUT_FORMAT_OBJECT });
    const map = {};
    for (const r of res.rows) {
      const col = r.KEY_CODE.split('.')[1];
      if (col) map[col] = { ko: r.KOR || undefined, en: r.ENG || undefined, es: r.SPA || undefined };
    }
    return map;
  } catch { return {}; }
}
```

- [ ] **Step 2: fetchTableSchema에서 호출 병합**

Edit `fetchTableSchema()` — return 직전:
```javascript
  const labels = await fetchLabels(conn, tableName);
  for (const col of cols.rows) {
    const c = out_columns.find(x => x.name === col.COLUMN_NAME);
    if (c) c.labels = labels[col.COLUMN_NAME] || {};
  }
```
(실제 변수명은 기존 코드에 맞춰 조정)

- [ ] **Step 3: 실행 확인**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run
```

Expected: 에러 없이 완료. 라벨이 있는 컬럼은 `labels: { ko, en, es }` 포함

### Task 1.6: basecode-cache.json 빌드

**Files:**
- Modify: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: code_type 조회 함수**

Edit `scripts/migrate-to-tables-json.mjs`:
```javascript
async function buildBasecodeCache(conn) {
  const res = await conn.execute(
    `SELECT CODE_TYPE, LISTAGG(CODE, ',') WITHIN GROUP (ORDER BY CODE) vals
       FROM (SELECT DISTINCT CODE_TYPE, CODE FROM ISYS_BASECODE)
      GROUP BY CODE_TYPE ORDER BY CODE_TYPE`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return {
    version: 1,
    refreshedAt: new Date().toISOString(),
    codeTypes: res.rows.map(r => ({
      codeType: r.CODE_TYPE,
      sampleValues: (r.VALS || '').split(',').slice(0, 5),
    })),
  };
}
```

- [ ] **Step 2: `main()`에서 호출**

Edit `main()` — `await conn.close()` 직전:
```javascript
  const basecodeCache = await buildBasecodeCache(conn);
  console.log(`   basecode-cache: ${basecodeCache.codeTypes.length} code types`);
  saveJson(path.join(ctx, 'basecode-cache.json'), basecodeCache);
```

- [ ] **Step 3: 실행 확인**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run 2>&1 | grep basecode
```

Expected: `basecode-cache: 123 code types` (실제 숫자는 ISYS_BASECODE에 따라)

### Task 1.7: 도메인 자동 제안 시드 (column-domains.json)

**Files:**
- Modify: `scripts/migrate-to-tables-json.mjs`

- [ ] **Step 1: 패턴 매칭 함수**

Edit `scripts/migrate-to-tables-json.mjs`:
```javascript
function suggestDomains(schemaCache, basecodes) {
  const allCols = new Set();
  for (const site of Object.values(schemaCache.sites)) {
    for (const t of Object.values(site.tables)) {
      for (const c of t.columns) allCols.add(c.name);
    }
  }

  const domains = [];
  const by = [...allCols].filter(c => /_BY$/.test(c));
  if (by.length >= 3) domains.push({
    id: 'audit-who', name: '입력·수정자',
    description: '감사 로그 - 누가 레코드를 등록·변경했는가',
    members: by, excludeFromPrompt: true,
  });

  const when = [...allCols].filter(c => /(_DATE|_AT)$/.test(c));
  if (when.length >= 3) domains.push({
    id: 'audit-when', name: '입력·수정 일시',
    members: when, excludeFromPrompt: true,
  });

  const org = [...allCols].filter(c => /^(ORG|ORGANIZATION)_?ID$/.test(c));
  if (org.length >= 1) domains.push({
    id: 'system-org', name: '조직 ID',
    members: org, excludeFromPrompt: true,
  });

  // *_CODE 패턴: basecode CODE_TYPE(공백 치환)에 매칭되면 각 도메인 생성
  const codeCols = [...allCols].filter(c => /_CODE$/.test(c));
  const knownTypes = new Set(basecodes.codeTypes.map(b => b.codeType));
  for (const col of codeCols) {
    const candidate = col.replace(/_/g, ' ');
    if (!knownTypes.has(candidate)) continue;
    const id = candidate.toLowerCase().replace(/\s/g, '-');
    if (domains.some(d => d.id === id)) continue;
    domains.push({
      id, name: candidate,
      members: [col],
      priority: 'common',
      decode: { kind: 'basecode', codeType: candidate },
    });
  }

  return { version: 1, updatedAt: new Date().toISOString(), domains };
}
```

- [ ] **Step 2: `main()`에서 호출**

Edit `main()` — schemaCache 생성 직후:
```javascript
  const domains = suggestDomains(schemaCache, basecodeCache);
  console.log(`   column-domains: ${domains.domains.length} 도메인 시드`);
  saveJson(path.join(ctx, 'column-domains.json'), domains);
```

- [ ] **Step 3: 실행 확인 (dry-run)**

```bash
node scripts/migrate-to-tables-json.mjs --dry-run 2>&1 | grep domains
```

Expected: `column-domains: 8 도메인 시드` 정도

### Task 1.8: 실제 마이그레이션 실행 + 결과 검증

- [ ] **Step 1: 백업 확인**

```bash
git status
# 신규 파일들이 untracked인지 확인 (기존 catalog.json, tables/ 는 unchanged)
```

- [ ] **Step 2: 실제 실행**

```bash
node scripts/migrate-to-tables-json.mjs
```

Expected: 
```
🚀 migrate-to-tables-json 시작
   catalog: 45 테이블
   DB 연결: <프로필명>
   schema: LOG_AOI... 20 cols
   ... (45회)
   tables.json: 45 테이블 생성
   basecode-cache: N code types
   column-domains: M 도메인 시드
✅ 완료
```

- [ ] **Step 3: 결과 파일 유효성 검사**

```bash
node -e "
const t = require('./data/ai-context/tables.json');
const c = require('./data/ai-context/schema-cache.json');
const d = require('./data/ai-context/column-domains.json');
const b = require('./data/ai-context/basecode-cache.json');
const totalT = Object.values(t.sites).reduce((s, v) => s + Object.keys(v.tables).length, 0);
const totalC = Object.values(c.sites).reduce((s, v) => s + Object.keys(v.tables).length, 0);
console.log('tables.json:', totalT, 'tables');
console.log('schema-cache:', totalC, 'tables');
console.log('column-domains:', d.domains.length, 'domains');
console.log('basecode-cache:', b.codeTypes.length, 'code types');
"
```

Expected: 모두 > 0, tables.json과 schema-cache의 테이블 수 일치

- [ ] **Step 4: 샘플 검증 — LOG_AOI 내용 비교**

```bash
node -e "
const c = require('./data/ai-context/schema-cache.json');
const aoi = c.sites.default.tables.LOG_AOI;
console.log('PK:', aoi.pkColumns);
console.log('columns:', aoi.columns.length);
console.log('sample col:', JSON.stringify(aoi.columns[0], null, 2));
"
```

Expected: PK/컬럼 수가 기존 `data/ai-context/tables/LOG_AOI.md`와 일치

### Task 1.9: Phase 1 커밋

- [ ] **Step 1: git diff 확인**

```bash
git status
git diff --stat data/ai-context/
```

Expected: `tables.json`, `schema-cache.json`, `column-domains.json`, `basecode-cache.json` 내용이 채워짐

- [ ] **Step 2: 커밋 (사용자 승인 후)**

```bash
git add scripts/migrate-to-tables-json.mjs data/ai-context/tables.json data/ai-context/schema-cache.json data/ai-context/column-domains.json data/ai-context/basecode-cache.json
git commit -m "feat(ai-tables): Phase 1 마이그레이션 스크립트 + 초기 시드 데이터"
```

- [ ] **Step 3: `/ai-chat` 동작 무영향 확인**

```bash
npm run dev
# 브라우저에서 /ai-chat 진입 → 아무 질문 실행 → 정상 응답 확인
```

Expected: 기존과 동일한 응답 (아직 context-loader는 catalog.json을 읽는 상태)

---

## Phase 2: 런타임 전환 (backend only)

목표: `/ai-chat` 백엔드가 `tables.json` + `schema-cache.json`을 읽도록 전환. UI 변경 없음. 외부 API 호환 유지.

### Task 2.1: `store.ts` — tables.json/column-domains.json IO + 캐시

**Files:**
- Create: `src/lib/ai-tables/store.ts`
- Test: `src/lib/ai-tables/__tests__/store.test.ts`

- [ ] **Step 1: 실패 테스트 먼저 작성**

File `src/lib/ai-tables/__tests__/store.test.ts`:
```typescript
import { loadTables, saveTables, loadDomains, saveDomains } from '../store';
import fs from 'fs';
import { PATHS } from '../paths';

describe('ai-tables store', () => {
  it('loadTables returns parsed AiTablesFile', async () => {
    const data = await loadTables();
    expect(data.version).toBe(1);
    expect(data.sites).toBeDefined();
  });

  it('saveTables → loadTables round-trip preserves updatedAt', async () => {
    const data = await loadTables();
    const before = data.updatedAt;
    await saveTables(data);
    const after = await loadTables();
    expect(after.updatedAt).not.toBe(before);   // saveTables가 updatedAt 갱신
  });

  it('loadDomains returns ColumnDomainsFile', async () => {
    const data = await loadDomains();
    expect(Array.isArray(data.domains)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest src/lib/ai-tables/__tests__/store.test.ts
```

Expected: FAIL — `loadTables is not a function`

- [ ] **Step 3: store.ts 구현**

File `src/lib/ai-tables/store.ts`:
```typescript
/**
 * @file src/lib/ai-tables/store.ts
 * @description tables.json / column-domains.json 읽기·쓰기 + 메모리 캐시 + 파일 락.
 *   saveTables/saveDomains는 updatedAt 자동 갱신.
 */

import fs from 'fs/promises';
import { PATHS } from './paths';
import { withLock } from './mutex';
import type { AiTablesFile, ColumnDomainsFile } from './types';

let _tablesCache: AiTablesFile | null = null;
let _domainsCache: ColumnDomainsFile | null = null;

export async function loadTables(): Promise<AiTablesFile> {
  if (_tablesCache) return _tablesCache;
  const raw = await fs.readFile(PATHS.tablesJson, 'utf-8');
  _tablesCache = JSON.parse(raw);
  return _tablesCache!;
}

export async function saveTables(data: AiTablesFile): Promise<void> {
  await withLock(PATHS.tablesJson, async () => {
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(PATHS.tablesJson, JSON.stringify(data, null, 2), 'utf-8');
    _tablesCache = data;
  });
}

export function invalidateTablesCache(): void { _tablesCache = null; }

export async function loadDomains(): Promise<ColumnDomainsFile> {
  if (_domainsCache) return _domainsCache;
  const raw = await fs.readFile(PATHS.columnDomains, 'utf-8');
  _domainsCache = JSON.parse(raw);
  return _domainsCache!;
}

export async function saveDomains(data: ColumnDomainsFile): Promise<void> {
  await withLock(PATHS.columnDomains, async () => {
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(PATHS.columnDomains, JSON.stringify(data, null, 2), 'utf-8');
    _domainsCache = data;
  });
}

export function invalidateDomainsCache(): void { _domainsCache = null; }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest src/lib/ai-tables/__tests__/store.test.ts
```

Expected: 3 passed

### Task 2.2: `schema-loader.ts` + `basecode-loader.ts`

**Files:**
- Create: `src/lib/ai-tables/schema-loader.ts`
- Create: `src/lib/ai-tables/basecode-loader.ts`

- [ ] **Step 1: schema-loader.ts 작성**

File `src/lib/ai-tables/schema-loader.ts`:
```typescript
/**
 * @file src/lib/ai-tables/schema-loader.ts
 * @description schema-cache.json 읽기. 쓰기는 sync API에서 별도 처리.
 */

import fs from 'fs/promises';
import { PATHS } from './paths';
import type { SchemaCacheFile, CachedTableSchema, SiteKey } from './types';

let _cache: SchemaCacheFile | null = null;

export async function loadSchemaCache(): Promise<SchemaCacheFile> {
  if (_cache) return _cache;
  _cache = JSON.parse(await fs.readFile(PATHS.schemaCache, 'utf-8'));
  return _cache!;
}

export function invalidateSchemaCache(): void { _cache = null; }

export async function getTableSchema(site: SiteKey, tableName: string): Promise<CachedTableSchema | null> {
  const cache = await loadSchemaCache();
  return cache.sites[site]?.tables[tableName] ?? null;
}
```

- [ ] **Step 2: basecode-loader.ts 작성**

File `src/lib/ai-tables/basecode-loader.ts`:
```typescript
/**
 * @file src/lib/ai-tables/basecode-loader.ts
 * @description basecode-cache.json 읽기. code_type 목록 제공.
 */

import fs from 'fs/promises';
import { PATHS } from './paths';
import type { BasecodeCacheFile } from './types';

let _cache: BasecodeCacheFile | null = null;

export async function loadBasecodes(): Promise<BasecodeCacheFile> {
  if (_cache) return _cache;
  _cache = JSON.parse(await fs.readFile(PATHS.basecodeCache, 'utf-8'));
  return _cache!;
}

export async function getCodeTypes(): Promise<string[]> {
  const cache = await loadBasecodes();
  return cache.codeTypes.map(c => c.codeType);
}

export function invalidateBasecodeCache(): void { _cache = null; }
```

- [ ] **Step 3: TypeScript 컴파일 확인**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

### Task 2.3: `domain-resolver.ts` — 4계층 상속 머지

**Files:**
- Create: `src/lib/ai-tables/domain-resolver.ts`
- Test: `src/lib/ai-tables/__tests__/domain-resolver.test.ts`

- [ ] **Step 1: 테스트 먼저 작성**

File `src/lib/ai-tables/__tests__/domain-resolver.test.ts`:
```typescript
import { resolveColumn } from '../domain-resolver';
import type { TableMeta, ColumnDomain, CachedColumn } from '../types';

describe('resolveColumn', () => {
  const baseCol: CachedColumn = {
    name: 'LINE_CODE', type: 'VARCHAR2(10)', nullable: true,
    comment: '라인코드', labels: { ko: '라인' },
  };

  it('테이블 오버라이드가 최우선', () => {
    const meta: TableMeta = {
      enabled: true, tags: [], examples: [], feedbackQueue: [],
      columnOverrides: { LINE_CODE: { priority: 'rare' } },
    };
    const domains: ColumnDomain[] = [
      { id: 'x', name: 'X', members: ['LINE_CODE'], priority: 'key' },
    ];
    const r = resolveColumn(baseCol, meta, domains);
    expect(r.priority).toBe('rare');  // 오버라이드가 도메인을 덮음
  });

  it('도메인이 오버라이드 없을 때 적용', () => {
    const meta: TableMeta = { enabled: true, tags: [], examples: [], feedbackQueue: [] };
    const domains: ColumnDomain[] = [
      { id: 'line', name: 'Line', members: ['LINE_CODE'], priority: 'key',
        decode: { kind: 'basecode', codeType: 'LINE CODE' } },
    ];
    const r = resolveColumn(baseCol, meta, domains);
    expect(r.priority).toBe('key');
    expect(r.decode).toEqual({ kind: 'basecode', codeType: 'LINE CODE' });
  });

  it('둘 다 없으면 기본값 common', () => {
    const meta: TableMeta = { enabled: true, tags: [], examples: [], feedbackQueue: [] };
    const r = resolveColumn(baseCol, meta, []);
    expect(r.priority).toBe('common');
    expect(r.decode).toEqual({ kind: 'raw' });
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest src/lib/ai-tables/__tests__/domain-resolver.test.ts
```

Expected: FAIL — resolveColumn not found

- [ ] **Step 3: 구현**

File `src/lib/ai-tables/domain-resolver.ts`:
```typescript
/**
 * @file src/lib/ai-tables/domain-resolver.ts
 * @description 컬럼 설정 4계층 상속 머지:
 *   1. tables.json[site].tables[T].columnOverrides[col] (최우선)
 *   2. column-domains.json의 members에 포함된 도메인 공통 설정
 *   3. schema-cache의 DB 주석 (기본값)
 *   4. 없음 시 { priority: 'common', decode: { kind: 'raw' } }
 */

import type { CachedColumn, TableMeta, ColumnDomain, ColumnOverride, ColumnDecode } from './types';

export interface ResolvedColumn {
  name: string;
  type: string;
  nullable: boolean;
  comment: string | null;
  hint?: string;
  priority: 'key' | 'common' | 'rare';
  excludeFromPrompt: boolean;
  decode: ColumnDecode;
  labels: { ko?: string; en?: string; es?: string; };
  domainId?: string;
}

export function resolveColumn(
  col: CachedColumn,
  meta: TableMeta,
  domains: ColumnDomain[],
): ResolvedColumn {
  const ovr: ColumnOverride | undefined = meta.columnOverrides?.[col.name];
  const domain = domains.find(d => d.members.includes(col.name));

  return {
    name: col.name,
    type: col.type,
    nullable: col.nullable,
    comment: col.comment,
    labels: col.labels,
    priority: ovr?.priority ?? domain?.priority ?? 'common',
    excludeFromPrompt: ovr?.excludeFromPrompt ?? domain?.excludeFromPrompt ?? false,
    hint: ovr?.hint ?? domain?.hint,
    decode: ovr?.decode ?? domain?.decode ?? { kind: 'raw' },
    domainId: domain?.id,
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest src/lib/ai-tables/__tests__/domain-resolver.test.ts
```

Expected: 3 passed

### Task 2.4: `prompt-renderer.ts` — compact 포맷

**Files:**
- Create: `src/lib/ai-tables/tokenizer.ts`
- Create: `src/lib/ai-tables/prompt-renderer.ts`
- Test: `src/lib/ai-tables/__tests__/prompt-renderer.test.ts`

- [ ] **Step 1: tokenizer.ts (토큰 추정)**

File `src/lib/ai-tables/tokenizer.ts`:
```typescript
/**
 * @file src/lib/ai-tables/tokenizer.ts
 * @description 토큰 수 경험식 추정. tiktoken 없이 Math.ceil(len / 3).
 *   한글·영문·SQL 혼합 텍스트에 ±15% 오차. 본 페이지 목적에 충분.
 */

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}
```

- [ ] **Step 2: 스냅샷 테스트 작성**

File `src/lib/ai-tables/__tests__/prompt-renderer.test.ts`:
```typescript
import { renderCatalogForStage0, renderTableForStage1 } from '../prompt-renderer';
import type { AiTablesFile, SchemaCacheFile, ColumnDomainsFile, SiteKey } from '../types';

describe('prompt-renderer', () => {
  const site: SiteKey = 'default';

  const tables: AiTablesFile = {
    version: 1, updatedAt: '',
    sites: { default: { tables: {
      LOG_AOI: {
        enabled: true, tags: ['품질', 'AOI'], summary: 'AOI 자동광학검사',
        examples: [], feedbackQueue: [],
        columnOverrides: { ENTER_BY: { excludeFromPrompt: true } },
      },
      LEGACY: { enabled: false, tags: [], examples: [], feedbackQueue: [] },
    } } },
  } as AiTablesFile;

  const schema: SchemaCacheFile = {
    version: 1, refreshedAt: '',
    sites: { default: { tables: {
      LOG_AOI: {
        tableComment: 'AOI 검사 로그', pkColumns: ['LOG_ID'],
        refreshedAt: '',
        columns: [
          { name: 'LOG_ID', type: 'NUMBER', nullable: false, comment: 'PK', labels: {} },
          { name: 'LINE_CODE', type: 'VARCHAR2(10)', nullable: true, comment: '라인', labels: { ko: '라인' } },
          { name: 'RESULT', type: 'VARCHAR2(10)', nullable: true, comment: 'OK/NG', labels: {} },
          { name: 'ENTER_BY', type: 'VARCHAR2(30)', nullable: true, comment: '등록자', labels: {} },
        ],
      },
    } } },
  } as SchemaCacheFile;

  const domains: ColumnDomainsFile = {
    version: 1, updatedAt: '',
    domains: [
      { id: 'line-code', name: 'Line Code', members: ['LINE_CODE'],
        priority: 'key', decode: { kind: 'basecode', codeType: 'LINE CODE' } },
    ],
  };

  it('Stage 0: enabled 테이블만 한 줄씩', () => {
    const s = renderCatalogForStage0(tables, site);
    expect(s).toContain('LOG_AOI');
    expect(s).not.toContain('LEGACY');
  });

  it('Stage 1: excludeFromPrompt 컬럼은 포함 안 됨', () => {
    const s = renderTableForStage1('LOG_AOI', tables.sites.default.tables.LOG_AOI,
      schema.sites.default.tables.LOG_AOI, domains.domains);
    expect(s).not.toContain('ENTER_BY');
    expect(s).toContain('LINE_CODE');
    expect(s).toContain("basecode('LINE CODE')");
  });
});
```

- [ ] **Step 3: 실패 확인**

```bash
npx jest src/lib/ai-tables/__tests__/prompt-renderer.test.ts
```

Expected: FAIL (함수 없음)

- [ ] **Step 4: prompt-renderer.ts 구현**

File `src/lib/ai-tables/prompt-renderer.ts`:
```typescript
/**
 * @file src/lib/ai-tables/prompt-renderer.ts
 * @description AI 주입용 compact 포맷 렌더. 저장 구조를 주입 직전 압축.
 *   Stage 0: 45개 테이블 한 줄씩 (~1300 토큰)
 *   Stage 1: 선택된 테이블 compact 블록 (~500 토큰/테이블)
 */

import type { AiTablesFile, TableMeta, CachedTableSchema, ColumnDomain, SiteKey } from './types';
import { resolveColumn } from './domain-resolver';

export function renderCatalogForStage0(tables: AiTablesFile, site: SiteKey): string {
  const siteTables = tables.sites[site]?.tables ?? {};
  const lines: string[] = [`${site}:`];
  for (const [name, meta] of Object.entries(siteTables)) {
    if (!meta.enabled) continue;
    const tagStr = meta.tags.length ? ` [${meta.tags.join(',')}]` : '';
    lines.push(`  ${name}: ${meta.summary ?? ''}${tagStr}`);
  }
  return lines.join('\n');
}

export function renderTableForStage1(
  tableName: string,
  meta: TableMeta,
  schema: CachedTableSchema,
  domains: ColumnDomain[],
): string {
  const resolved = schema.columns.map(c => resolveColumn(c, meta, domains));
  const key = resolved.filter(r => !r.excludeFromPrompt && r.priority === 'key');
  const common = resolved.filter(r => !r.excludeFromPrompt && r.priority === 'common');
  const excludedDomainIds = new Set(
    resolved.filter(r => r.excludeFromPrompt && r.domainId).map(r => r.domainId!)
  );
  const excludedIndividual = resolved
    .filter(r => r.excludeFromPrompt && !r.domainId).map(r => r.name);

  const lines: string[] = [];
  lines.push(`${tableName} (${schema.tableComment ?? meta.summary ?? ''})`);
  if (meta.tags.length) lines[0] += `  # tags=${meta.tags.join(',')}`;
  if (meta.keywords?.length) lines.push(`keywords: ${meta.keywords.join(', ')}`);
  if (schema.pkColumns.length) lines.push(`PK: ${schema.pkColumns.join(', ')}`);

  if (key.length) {
    lines.push('key:');
    for (const c of key) lines.push(`  ${c.name}  ${formatDecode(c.decode)}${c.hint ? `  # ${c.hint}` : ''}`);
  }
  if (common.length) lines.push(`common: ${common.map(c => c.name).join(', ')}`);

  if (meta.defaultFilters?.length) {
    lines.push(`default_filters: ${meta.defaultFilters.map(f => f.sql).join(' AND ')}`);
  }
  if (meta.joinPatterns?.length) {
    lines.push('joins:');
    for (const j of meta.joinPatterns) lines.push(`  ${tableName} a JOIN ${j.withTable} b ON ${j.onClause}  # ${j.purpose}`);
  }

  if (excludedDomainIds.size) lines.push(`# excluded domains: ${[...excludedDomainIds].join(', ')}`);
  if (excludedIndividual.length) lines.push(`# excluded cols: ${excludedIndividual.join(', ')}`);

  if (meta.examples.length) {
    lines.push('ex:');
    for (const ex of meta.examples.slice(0, 3)) {
      lines.push(`  [${ex.kind}] Q: ${ex.question}`);
      if (ex.sql) lines.push(`    SQL: ${ex.sql.replace(/\n/g, ' ')}`);
      if (ex.sqlTemplate) lines.push(`    SQL: ${ex.sqlTemplate.replace(/\n/g, ' ')}`);
    }
  }

  return lines.join('\n');
}

function formatDecode(d: { kind: string; [k: string]: unknown }): string {
  switch (d.kind) {
    case 'basecode': return `basecode('${d.codeType}')`;
    case 'enum':     return `enum{${Object.entries(d.values as Record<string, string>).map(([k, v]) => `${k}→${v}`).join('|')}}`;
    case 'master':   return `master(${d.table}.${d.keyCol}→${d.valCol})`;
    case 'flag':     return `flag(${d.trueValue}/${d.falseValue ?? 'else'})`;
    case 'date':     return `date${d.format ? `(${d.format})` : ''}`;
    default:         return '';
  }
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npx jest src/lib/ai-tables/__tests__/prompt-renderer.test.ts
```

Expected: 2 passed

### Task 2.5: `context-loader.ts` 리팩터링

**Files:**
- Modify: `src/lib/ai/context/context-loader.ts`
- Create: `src/lib/ai-tables/merged-context.ts`

- [ ] **Step 1: `merged-context.ts` 작성 (새 로직 분리)**

File `src/lib/ai-tables/merged-context.ts`:
```typescript
/**
 * @file src/lib/ai-tables/merged-context.ts
 * @description tables.json + schema-cache + domains를 병합해 /ai-chat context에 제공.
 *   기존 context-loader.ts의 loadCatalog 대체.
 */

import { loadTables, loadDomains } from './store';
import { loadSchemaCache } from './schema-loader';
import { renderCatalogForStage0, renderTableForStage1 } from './prompt-renderer';
import type { SiteKey } from './types';

export async function loadMergedContext(site: SiteKey = 'default') {
  const [tables, domains, schema] = await Promise.all([
    loadTables(),
    loadDomains(),
    loadSchemaCache(),
  ]);
  return { tables, domains, schema, site };
}

export async function buildStage0Prompt(site: SiteKey = 'default'): Promise<string> {
  const { tables } = await loadMergedContext(site);
  return renderCatalogForStage0(tables, site);
}

export async function buildStage1Prompt(
  site: SiteKey,
  tableNames: string[],
): Promise<string> {
  const { tables, domains, schema } = await loadMergedContext(site);
  const blocks: string[] = [];
  for (const name of tableNames) {
    const meta = tables.sites[site]?.tables[name];
    const sch = schema.sites[site]?.tables[name];
    if (!meta || !sch || !meta.enabled) continue;
    blocks.push(renderTableForStage1(name, meta, sch, domains.domains));
  }
  return blocks.join('\n\n');
}
```

- [ ] **Step 2: 기존 `context-loader.ts` 읽고 구조 파악**

```bash
# 기존 파일 내용 확인
cat src/lib/ai/context/context-loader.ts
```

- [ ] **Step 3: `context-loader.ts` 내부 구현 교체 (외부 API 호환 유지)**

Edit `src/lib/ai/context/context-loader.ts` — 기존 함수를 래퍼로 변환:

```typescript
// 파일 상단 import 추가
import { loadTables } from '@/lib/ai-tables/store';
import { buildStage0Prompt } from '@/lib/ai-tables/merged-context';
import type { SiteKey } from '@/lib/ai-tables/types';

// 기존 loadCatalog() — 신규 구조를 구 catalog.json 형태로 변환 반환
export async function loadCatalog() {
  const tables = await loadTables();
  const catTables: any[] = [];
  for (const [site, st] of Object.entries(tables.sites)) {
    for (const [name, meta] of Object.entries(st.tables)) {
      if (!meta.enabled) continue;
      catTables.push({ name, site, summary: meta.summary, tags: meta.tags });
    }
  }
  return { tables: catTables, domains: [], sites: [{ key: 'default' }, { key: '멕시코전장내부' }, { key: '멕시코VD외부' }, { key: '베트남VD외부' }] };
}

// 기존 catalogToPrompt — 신규 renderCatalogForStage0 호출
export async function catalogToPrompt(site: SiteKey = 'default'): Promise<string> {
  return buildStage0Prompt(site);
}
```

**주의**: `catalogToPrompt`가 원래 동기 함수라면 async 전환이 context-selector.ts 호출부에 영향. 호출부도 `await` 추가해야 함.

- [ ] **Step 4: 호출부 영향 확인**

```bash
grep -rn "catalogToPrompt\|loadCatalog" src/
```

Expected: `context-selector.ts` 등에서 호출. 각 호출부에 `await` 적용 필요

- [ ] **Step 5: 호출부 수정**

`src/lib/ai/context/context-selector.ts`의 `catalogToPrompt()` 호출을 `await catalogToPrompt(site)`로 변경. `loadCatalog()`도 `await`.

### Task 2.6: `context-selector.ts` — enabled 필터 + heuristic 보강

**Files:**
- Modify: `src/lib/ai/context/context-selector.ts`

- [ ] **Step 1: 기존 heuristicSelection 내부에 enabled 필터 추가**

Edit `src/lib/ai/context/context-selector.ts`:

heuristicSelection 함수의 catalog.tables 순회에서 `enabled !== false` 필터 적용.

```typescript
async function heuristicSelection(question: string): Promise<ContextSelection> {
  const q = question.toLowerCase();
  const catalog = await loadCatalog();              // async 전환
  const scored: { name: string; score: number }[] = [];
  for (const t of catalog.tables) {
    // loadCatalog가 이미 enabled=true만 반환하므로 별도 필터 불필요
    // (원본 코드는 그대로 유지, 그러나 신규 loadCatalog 구현에 의해 자동 필터됨)
    ...
  }
  ...
}
```

- [ ] **Step 2: normalize의 validTables도 enabled 반영**

```typescript
const validTables = new Set(catalog.tables.map(t => t.name));
// loadCatalog가 이미 enabled만 반환하므로 validTables에 disabled 들어올 일 없음
// LLM이 disabled 테이블 이름을 hallucinate해도 validTables에 없어 normalize()에서 제거
```

- [ ] **Step 3: TypeScript 컴파일 + 테스트**

```bash
npx tsc --noEmit
```

Expected: 에러 없음

### Task 2.7: `schema-context.ts` → 함수 래핑

**Files:**
- Modify: `src/lib/ai/schema-context.ts`

- [ ] **Step 1: 기존 파일 확인 (현재 const SCHEMA)**

```bash
head -20 src/lib/ai/schema-context.ts
```

- [ ] **Step 2: 파일 하단에 `getSchema()` 함수 추가 (const SCHEMA는 유지 — 호환)**

Edit `src/lib/ai/schema-context.ts` — 파일 끝에 추가:

```typescript
import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

/** 런타임에 schema-cache.json에서 동적으로 가져오는 신규 API. */
export async function getSchema(site: SiteKey = 'default'): Promise<Record<string, TableSpec>> {
  const cache = await loadSchemaCache();
  const out: Record<string, TableSpec> = {};
  for (const [name, ts] of Object.entries(cache.sites[site]?.tables ?? {})) {
    out[name] = {
      description: ts.tableComment ?? '',
      columns: Object.fromEntries(ts.columns.map(c => [
        c.name, { type: c.type, nullable: c.nullable, comment: c.comment },
      ])),
    };
  }
  return out;
}
```

- [ ] **Step 3: SCHEMA를 참조하는 곳 파악 (Phase 4에 이관 대비)**

```bash
grep -rn "from '@/lib/ai/schema-context'" src/
```

기록만 해두고 Phase 4에서 이관.

### Task 2.8: 회귀 테스트 — `/ai-chat` 동일 응답 확인

- [ ] **Step 1: 개발 서버 시작**

```bash
npm run dev
```

- [ ] **Step 2: 브라우저에서 테스트 질문 3개 실행**

Phase 1 이전의 실제 동작과 비교하기 위해 **같은 질문 3개** 준비:
1. "오늘 라인별 생산 실적 요약"
2. "현재 가동 중인 라인 목록"
3. "최근 7일 AOI 불량률 추이"

각 질문 실행 → context-selector 결과(tables/domains/site)와 생성된 SQL을 기록.

- [ ] **Step 3: Phase 1 이전 브랜치로 체크아웃 후 같은 질문 실행 (비교용)**

```bash
git stash   # 현재 변경 보존
git checkout HEAD~1   # Phase 1 직전 커밋
npm run dev
# 같은 3개 질문 실행, 결과 기록
git checkout -   # Phase 2 작업 브랜치로 복귀
git stash pop
```

- [ ] **Step 4: 결과 비교**

tables 선정·생성 SQL이 **의미적으로 동일**해야 함. (순서는 다를 수 있음)

### Task 2.9: Phase 2 커밋

- [ ] **Step 1: 모든 테스트 실행**

```bash
npx jest src/lib/ai-tables/__tests__/
npx tsc --noEmit
```

Expected: 모두 pass, 컴파일 에러 없음

- [ ] **Step 2: 커밋**

```bash
git add src/lib/ai-tables/ src/lib/ai/context/ src/lib/ai/schema-context.ts
git commit -m "feat(ai-tables): Phase 2 런타임 전환 - tables.json + compact 포맷"
```

---

## Phase 3a: 페이지 shell + 기본 CRUD API

목표: `/settings/ai-tables` 페이지 진입 가능, 테이블 목록 조회, Overview/Columns 탭 편집, DDL 2단계 확인으로 주석 저장 가능.

### Task 3a.1: Bootstrap API — `GET /api/ai-tables`

**Files:**
- Create: `src/app/api/ai-tables/route.ts`

- [ ] **Step 1: route.ts 작성**

File `src/app/api/ai-tables/route.ts`:
```typescript
/**
 * @file src/app/api/ai-tables/route.ts
 * @description Bootstrap — 페이지 초기 로드용 전체 상태 병합.
 */

import { NextResponse } from 'next/server';
import { loadTables, loadDomains } from '@/lib/ai-tables/store';
import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import { loadBasecodes } from '@/lib/ai-tables/basecode-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

export async function GET() {
  try {
    const [tables, domains, schema, basecodes] = await Promise.all([
      loadTables(), loadDomains(), loadSchemaCache(), loadBasecodes(),
    ]);
    const sites = Object.keys(tables.sites) as SiteKey[];
    const activeSite: SiteKey = sites[0] ?? 'default';

    const tablesList: Record<string, any[]> = {};
    let stats = { tables: 0, enabled: 0, examples: 0, pendingFeedback: 0 };
    for (const site of sites) {
      const rows = Object.entries(tables.sites[site].tables).map(([name, meta]) => {
        const sch = schema.sites[site]?.tables[name];
        return {
          name,
          enabled: meta.enabled,
          tags: meta.tags,
          summary: meta.summary,
          columnCount: sch?.columns.length ?? 0,
          exampleCount: meta.examples.length,
          pendingFeedbackCount: meta.feedbackQueue.length,
          lastEditedAt: meta.lastEditedAt,
        };
      });
      tablesList[site] = rows;
      stats.tables += rows.length;
      stats.enabled += rows.filter(r => r.enabled).length;
      stats.examples += rows.reduce((s, r) => s + r.exampleCount, 0);
      stats.pendingFeedback += rows.reduce((s, r) => s + r.pendingFeedbackCount, 0);
    }

    return NextResponse.json({
      sites, activeSite, tables: tablesList,
      domains: domains.domains,
      basecodeTypes: basecodes.codeTypes.map(c => c.codeType),
      stats,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 2: 동작 확인**

```bash
npm run dev
curl -s http://localhost:3000/api/ai-tables | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log('sites:', d.sites); console.log('stats:', d.stats);"
```

Expected: `sites: ['default']`, `stats: { tables: 45, enabled: 45, examples: N, pendingFeedback: 0 }`

### Task 3a.2: Sync API — `POST /api/ai-tables/sync`

**Files:**
- Create: `src/app/api/ai-tables/sync/route.ts`

- [ ] **Step 1: schema-cache 재빌드 함수 추가**

Edit `src/lib/ai-tables/schema-loader.ts` — 하단에 추가:
```typescript
import fs from 'fs/promises';
import { executeQueryByProfile, executeQuery } from '@/lib/db';
import { withLock } from './mutex';

export async function syncFromDb(site: SiteKey): Promise<{ added: string[]; removed: string[]; modified: Array<{ table: string; columns: { added: string[]; removed: string[]; }; }> }> {
  const exec = site === 'default' ? executeQuery : (sql: string, b: any) => executeQueryByProfile(site, sql, b);
  const cache = await loadSchemaCache();
  const before = cache.sites[site]?.tables ?? {};

  const tableRows = await exec<{ TABLE_NAME: string }>(
    `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`, {});
  const currentTables = new Set(tableRows.map(r => r.TABLE_NAME));
  const beforeTables = new Set(Object.keys(before));

  const added = [...currentTables].filter(n => !beforeTables.has(n));
  const removed = [...beforeTables].filter(n => !currentTables.has(n));
  const modified: Array<{ table: string; columns: { added: string[]; removed: string[]; }; }> = [];

  const next: Record<string, any> = {};
  for (const tableName of currentTables) {
    const schema = await fetchOneSchema(exec, tableName);
    next[tableName] = schema;
    if (before[tableName]) {
      const beforeCols = new Set(before[tableName].columns.map((c: any) => c.name));
      const afterCols = new Set(schema.columns.map((c: any) => c.name));
      const colAdded = [...afterCols].filter(n => !beforeCols.has(n));
      const colRemoved = [...beforeCols].filter(n => !afterCols.has(n));
      if (colAdded.length || colRemoved.length) {
        modified.push({ table: tableName, columns: { added: colAdded, removed: colRemoved } });
      }
    }
  }

  await withLock(PATHS.schemaCache, async () => {
    cache.sites[site] = { tables: next };
    cache.refreshedAt = new Date().toISOString();
    await fs.writeFile(PATHS.schemaCache, JSON.stringify(cache, null, 2), 'utf-8');
    invalidateSchemaCache();
  });

  return { added, removed, modified };
}

// fetchOneSchema: scripts/migrate-to-tables-json.mjs의 fetchTableSchema 로직과 동일 (TypeScript로 포팅)
async function fetchOneSchema(exec: any, tableName: string) {
  // ... (migrate-to-tables-json.mjs의 fetchTableSchema 로직 포팅)
  // 생략된 부분: 실제 구현 시 마이그레이션 스크립트 함수를 TypeScript로 변환
  throw new Error('not implemented — see migrate-to-tables-json.mjs fetchTableSchema');
}
```

- [ ] **Step 2: fetchOneSchema 실제 구현 (마이그 스크립트 코드 포팅)**

`fetchTableSchema`를 `src/lib/ai-tables/db-schema.ts`로 분리해 재사용:

File `src/lib/ai-tables/db-schema.ts`:
```typescript
/**
 * @file src/lib/ai-tables/db-schema.ts
 * @description DB에서 단일 테이블 스키마 조회. USER_TAB_COLUMNS + USER_COL_COMMENTS + PK + ISYS_DUAL_LANGUAGE 머지.
 */

import type { CachedTableSchema } from './types';

type ExecFn = <T>(sql: string, binds: any) => Promise<T[]>;

export async function fetchTableSchemaFromDb(exec: ExecFn, tableName: string): Promise<CachedTableSchema | null> {
  const cols = await exec<any>(
    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE, NULLABLE
       FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t ORDER BY COLUMN_ID`, { t: tableName });
  if (!cols.length) return null;

  const [comments, tabCmt, pk, labels] = await Promise.all([
    exec<any>(`SELECT COLUMN_NAME, COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t`, { t: tableName }),
    exec<any>(`SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`, { t: tableName }),
    exec<any>(`SELECT cols.COLUMN_NAME FROM USER_CONSTRAINTS c
                 JOIN USER_CONS_COLUMNS cols ON c.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
                WHERE c.TABLE_NAME = :t AND c.CONSTRAINT_TYPE = 'P' ORDER BY cols.POSITION`,
         { t: tableName }),
    // ISYS_DUAL_LANGUAGE — Task 0.1에서 확정한 실스키마로 교체
    exec<any>(`SELECT KEY_CODE, KOR, ENG, SPA FROM ISYS_DUAL_LANGUAGE WHERE KEY_CODE LIKE :p`,
         { p: `${tableName}.%` }).catch(() => []),
  ]);

  const cmap = Object.fromEntries(comments.map((r: any) => [r.COLUMN_NAME, r.COMMENTS]));
  const lmap: Record<string, any> = {};
  for (const r of labels) {
    const col = r.KEY_CODE.split('.')[1];
    if (col) lmap[col] = { ko: r.KOR ?? undefined, en: r.ENG ?? undefined, es: r.SPA ?? undefined };
  }

  return {
    tableComment: tabCmt[0]?.COMMENTS ?? null,
    pkColumns: pk.map((r: any) => r.COLUMN_NAME),
    refreshedAt: new Date().toISOString(),
    columns: cols.map((c: any) => ({
      name: c.COLUMN_NAME,
      type: formatType(c),
      nullable: c.NULLABLE === 'Y',
      comment: cmap[c.COLUMN_NAME] ?? null,
      labels: lmap[c.COLUMN_NAME] ?? {},
    })),
  };
}

function formatType(c: any): string {
  const { DATA_TYPE: t, DATA_LENGTH, DATA_PRECISION: p, DATA_SCALE: s } = c;
  if (t === 'NUMBER') return p == null ? 'NUMBER' : s > 0 ? `NUMBER(${p},${s})` : `NUMBER(${p})`;
  if (['VARCHAR2','CHAR','NVARCHAR2','NCHAR'].includes(t)) return `${t}(${DATA_LENGTH})`;
  return t;
}
```

schema-loader.ts의 `syncFromDb()`가 `fetchTableSchemaFromDb()`를 호출하도록 수정.

- [ ] **Step 3: sync route.ts**

File `src/app/api/ai-tables/sync/route.ts`:
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { syncFromDb } from '@/lib/ai-tables/schema-loader';
import type { SiteKey } from '@/lib/ai-tables/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const site: SiteKey = body.site ?? 'default';
    const diff = await syncFromDb(site);
    return NextResponse.json(diff);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
```

- [ ] **Step 4: 동작 확인**

```bash
curl -X POST http://localhost:3000/api/ai-tables/sync -H 'Content-Type: application/json' -d '{"site":"default"}' | head -100
```

Expected: `{"added":[...], "removed":[], "modified":[]}`

### Task 3a.3: 테이블 상세 API — `GET`/`PATCH /api/ai-tables/[site]/[table]`

**Files:**
- Create: `src/app/api/ai-tables/[site]/[table]/route.ts`

- [ ] **Step 1: route.ts 작성**

File `src/app/api/ai-tables/[site]/[table]/route.ts`:
```typescript
import { NextResponse, NextRequest } from 'next/server';
import { loadTables, loadDomains, saveTables } from '@/lib/ai-tables/store';
import { getTableSchema } from '@/lib/ai-tables/schema-loader';
import { resolveColumn } from '@/lib/ai-tables/domain-resolver';
import type { SiteKey, TableMeta } from '@/lib/ai-tables/types';

type Params = { params: Promise<{ site: SiteKey; table: string; }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { site, table } = await params;
  const [tables, domains, schema] = await Promise.all([loadTables(), loadDomains(), getTableSchema(site, table)]);
  const meta = tables.sites[site]?.tables[table];
  if (!meta || !schema) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const resolvedColumns = schema.columns.map(c => resolveColumn(c, meta, domains.domains));
  return NextResponse.json({ meta, schema, resolvedColumns });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { site, table } = await params;
  const patch: Partial<TableMeta> = await req.json();
  const tables = await loadTables();
  const meta = tables.sites[site]?.tables[table];
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const allowed: (keyof TableMeta)[] = ['enabled', 'tags', 'summary', 'keywords', 'businessNotes', 'defaultFilters', 'joinPatterns', 'relatedTables'];
  for (const key of allowed) if (key in patch) (meta as any)[key] = patch[key];
  meta.lastEditedAt = new Date().toISOString();
  meta.lastEditedBy = process.env.USER || process.env.USERNAME || 'unknown';

  await saveTables(tables);
  return NextResponse.json({ ok: true, meta });
}
```

- [ ] **Step 2: 동작 확인**

```bash
curl -s http://localhost:3000/api/ai-tables/default/LOG_AOI | head -50
curl -X PATCH http://localhost:3000/api/ai-tables/default/LOG_AOI \
  -H 'Content-Type: application/json' -d '{"summary":"테스트 수정"}'
```

Expected: GET은 meta/schema/resolvedColumns 반환. PATCH는 ok: true

### Task 3a.4: `ddl-executor.ts` — DDL 미리보기 + 실행 + 이력

**Files:**
- Create: `src/lib/ai-tables/ddl-executor.ts`
- Test: `src/lib/ai-tables/__tests__/ddl-executor.test.ts`

- [ ] **Step 1: DDL 검증 테스트 먼저**

File `src/lib/ai-tables/__tests__/ddl-executor.test.ts`:
```typescript
import { validateCommentDdl } from '../ddl-executor';

describe('validateCommentDdl', () => {
  it('allows COMMENT ON TABLE', () => {
    expect(() => validateCommentDdl("COMMENT ON TABLE X IS 'y'")).not.toThrow();
  });
  it('allows COMMENT ON COLUMN', () => {
    expect(() => validateCommentDdl("COMMENT ON COLUMN X.Y IS 'z'")).not.toThrow();
  });
  it('rejects DROP', () => {
    expect(() => validateCommentDdl("DROP TABLE X")).toThrow();
  });
  it('rejects INSERT', () => {
    expect(() => validateCommentDdl("INSERT INTO X VALUES(1)")).toThrow();
  });
  it('rejects multiple statements', () => {
    expect(() => validateCommentDdl("COMMENT ON TABLE X IS 'a'; DROP TABLE Y")).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest src/lib/ai-tables/__tests__/ddl-executor.test.ts
```

Expected: FAIL

- [ ] **Step 3: ddl-executor.ts 구현**

File `src/lib/ai-tables/ddl-executor.ts`:
```typescript
/**
 * @file src/lib/ai-tables/ddl-executor.ts
 * @description COMMENT ON TABLE/COLUMN DDL 검증 + 실행 + 이력 파일 생성.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { executeDml, executeQuery } from '@/lib/db';
import { PATHS } from './paths';

const COMMENT_DDL_REGEX = /^\s*COMMENT\s+ON\s+(TABLE|COLUMN)\s+[A-Z0-9_."]+\s+IS\s+'.*?'\s*;?\s*$/is;

export function validateCommentDdl(ddl: string): void {
  if (ddl.split(';').filter(s => s.trim().length > 0).length > 1) {
    throw new Error('Multiple statements not allowed');
  }
  if (!COMMENT_DDL_REGEX.test(ddl.trim())) {
    throw new Error('Only COMMENT ON TABLE|COLUMN statements are allowed');
  }
}

export interface CommentChange {
  table: string;
  column?: string;               // undefined = 테이블 코멘트
  before: string | null;
  after: string;
}

export async function previewCommentDdl(change: CommentChange): Promise<{ ddl: string; }> {
  const target = change.column ? `${change.table}.${change.column}` : change.table;
  const kind = change.column ? 'COLUMN' : 'TABLE';
  const escaped = change.after.replace(/'/g, "''");
  const ddl = `COMMENT ON ${kind} ${target} IS '${escaped}'`;
  validateCommentDdl(ddl);   // early fail
  return { ddl };
}

export async function executeCommentDdl(change: CommentChange, ddl: string): Promise<{ historyFile: string }> {
  validateCommentDdl(ddl);
  await executeDml(ddl, {});

  // 이력 파일 기록
  const ts = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').slice(0, 15);
  const filename = `${ts}_${change.table}${change.column ? `_${change.column}` : ''}.sql`;
  const filepath = path.join(PATHS.historyDir, filename);

  const user = os.userInfo().username;
  const content = [
    `-- AI Tables Page — Comment History`,
    `-- table: ${change.table}`,
    change.column ? `-- column: ${change.column}` : '',
    `-- user: ${user}`,
    `-- timestamp: ${new Date().toISOString()}`,
    `-- change type: ${change.column ? 'column' : 'table'}`,
    '',
    `-- BEFORE`,
    `-- ${change.before ?? '(null)'}`,
    '',
    `-- AFTER`,
    `-- ${change.after}`,
    '',
    ddl.endsWith(';') ? ddl : `${ddl};`,
    '',
  ].filter(Boolean).join('\n');

  await fs.mkdir(PATHS.historyDir, { recursive: true });
  await fs.writeFile(filepath, content, 'utf-8');
  return { historyFile: filepath };
}

export async function getCurrentComment(tableName: string, columnName?: string): Promise<string | null> {
  if (columnName) {
    const rows = await executeQuery<any>(
      `SELECT COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t AND COLUMN_NAME = :c`,
      { t: tableName, c: columnName });
    return rows[0]?.COMMENTS ?? null;
  }
  const rows = await executeQuery<any>(
    `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`, { t: tableName });
  return rows[0]?.COMMENTS ?? null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest src/lib/ai-tables/__tests__/ddl-executor.test.ts
```

Expected: 5 passed

### Task 3a.5: Comment API — preview + execute

**Files:**
- Create: `src/app/api/ai-tables/[site]/[table]/comment/preview/route.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/comment/route.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/columns/[col]/comment/preview/route.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/columns/[col]/comment/route.ts`

- [ ] **Step 1: 테이블 주석 preview**

File `src/app/api/ai-tables/[site]/[table]/comment/preview/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { previewCommentDdl, getCurrentComment } from '@/lib/ai-tables/ddl-executor';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { table } = await params;
  const { newComment } = await req.json();
  const before = await getCurrentComment(table);
  const { ddl } = await previewCommentDdl({ table, before, after: newComment });
  return NextResponse.json({ before, after: newComment, ddl });
}
```

- [ ] **Step 2: 테이블 주석 execute**

File `src/app/api/ai-tables/[site]/[table]/comment/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { executeCommentDdl, getCurrentComment } from '@/lib/ai-tables/ddl-executor';
import { syncFromDb } from '@/lib/ai-tables/schema-loader';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const { ddl, before } = await req.json();
  const result = await executeCommentDdl({ table, before, after: '' /* DDL에서 파싱 불요 */ }, ddl);
  // schema-cache 부분 갱신 — 간단히 전체 sync (작은 프로젝트 규모)
  await syncFromDb(site as any).catch(() => {});
  return NextResponse.json({ ok: true, historyFile: result.historyFile });
}
```

- [ ] **Step 3: 컬럼 주석 preview + execute**

File `src/app/api/ai-tables/[site]/[table]/columns/[col]/comment/preview/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { previewCommentDdl, getCurrentComment } from '@/lib/ai-tables/ddl-executor';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string; col: string }> }) {
  const { table, col } = await params;
  const { newComment } = await req.json();
  const before = await getCurrentComment(table, col);
  const { ddl } = await previewCommentDdl({ table, column: col, before, after: newComment });
  return NextResponse.json({ before, after: newComment, ddl });
}
```

File `src/app/api/ai-tables/[site]/[table]/columns/[col]/comment/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { executeCommentDdl } from '@/lib/ai-tables/ddl-executor';
import { syncFromDb } from '@/lib/ai-tables/schema-loader';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string; col: string }> }) {
  const { site, table, col } = await params;
  const { ddl, before } = await req.json();
  const result = await executeCommentDdl({ table, column: col, before, after: '' }, ddl);
  await syncFromDb(site as any).catch(() => {});
  return NextResponse.json({ ok: true, historyFile: result.historyFile });
}
```

- [ ] **Step 4: 동작 테스트 (안전한 non-production 환경에서만)**

```bash
# preview 먼저
curl -X POST http://localhost:3000/api/ai-tables/default/LOG_AOI/comment/preview \
  -H 'Content-Type: application/json' -d '{"newComment":"테스트 설명"}'
```

Expected: `{ "before": "...", "after": "테스트 설명", "ddl": "COMMENT ON TABLE LOG_AOI IS '테스트 설명'" }`

### Task 3a.6: 컬럼 override API — `PATCH /columns/[col]`

**Files:**
- Create: `src/app/api/ai-tables/[site]/[table]/columns/[col]/route.ts`

- [ ] **Step 1: route.ts**

File `src/app/api/ai-tables/[site]/[table]/columns/[col]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
import type { ColumnOverride } from '@/lib/ai-tables/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ site: string; table: string; col: string }> }) {
  const { site, table, col } = await params;
  const patch: Partial<ColumnOverride> = await req.json();
  const tables = await loadTables();
  const meta = tables.sites[site as any]?.tables[table];
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });

  meta.columnOverrides ??= {};
  const current = meta.columnOverrides[col] ?? {};
  meta.columnOverrides[col] = { ...current, ...patch };
  meta.lastEditedAt = new Date().toISOString();

  await saveTables(tables);
  return NextResponse.json({ ok: true, override: meta.columnOverrides[col] });
}
```

- [ ] **Step 2: 테스트**

```bash
curl -X PATCH http://localhost:3000/api/ai-tables/default/LOG_AOI/columns/ENTER_BY \
  -H 'Content-Type: application/json' -d '{"excludeFromPrompt":true}'
```

Expected: `{ ok: true, override: { excludeFromPrompt: true } }`

### Task 3a.7: Zustand 전역 store + API client

**Files:**
- Create: `src/app/settings/ai-tables/_hooks/useAiTablesStore.ts`
- Create: `src/app/settings/ai-tables/_lib/api-client.ts`

- [ ] **Step 1: api-client.ts**

File `src/app/settings/ai-tables/_lib/api-client.ts`:
```typescript
/**
 * @file api-client.ts
 * @description fetch 래퍼. 에러는 throw.
 */

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

export const api = {
  bootstrap: () => req<any>('/api/ai-tables'),
  sync:      (site: string) => req<any>('/api/ai-tables/sync', { method: 'POST', body: JSON.stringify({ site }), headers: { 'Content-Type': 'application/json' } }),
  getTable:  (site: string, table: string) => req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}`),
  patchTable: (site: string, table: string, patch: any) => req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { 'Content-Type': 'application/json' } }),
  previewTableComment: (site: string, table: string, newComment: string) =>
    req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}/comment/preview`, { method: 'POST', body: JSON.stringify({ newComment }), headers: { 'Content-Type': 'application/json' } }),
  executeTableComment: (site: string, table: string, ddl: string, before: string | null) =>
    req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}/comment`, { method: 'POST', body: JSON.stringify({ ddl, before }), headers: { 'Content-Type': 'application/json' } }),
  previewColComment: (site: string, table: string, col: string, newComment: string) =>
    req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}/columns/${encodeURIComponent(col)}/comment/preview`, { method: 'POST', body: JSON.stringify({ newComment }), headers: { 'Content-Type': 'application/json' } }),
  executeColComment: (site: string, table: string, col: string, ddl: string, before: string | null) =>
    req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}/columns/${encodeURIComponent(col)}/comment`, { method: 'POST', body: JSON.stringify({ ddl, before }), headers: { 'Content-Type': 'application/json' } }),
  patchColumn: (site: string, table: string, col: string, patch: any) =>
    req<any>(`/api/ai-tables/${site}/${encodeURIComponent(table)}/columns/${encodeURIComponent(col)}`, { method: 'PATCH', body: JSON.stringify(patch), headers: { 'Content-Type': 'application/json' } }),
};
```

- [ ] **Step 2: Zustand store**

File `src/app/settings/ai-tables/_hooks/useAiTablesStore.ts`:
```typescript
/**
 * @file useAiTablesStore.ts
 * @description Zustand 전역 상태 — 선택된 사이트/테이블/탭, bootstrap 데이터.
 */

'use client';
import { create } from 'zustand';

type Mode = 'tables' | 'domains';
type DetailTab = 'overview' | 'columns' | 'dictionary' | 'filters-joins' | 'examples' | 'prompt' | 'history';

interface AiTablesState {
  mode: Mode;
  activeSite: string;
  activeTable: string | null;
  detailTab: DetailTab;
  bootstrap: any | null;             // Bootstrap API 응답

  setMode: (m: Mode) => void;
  setActiveSite: (s: string) => void;
  setActiveTable: (t: string | null) => void;
  setDetailTab: (t: DetailTab) => void;
  setBootstrap: (b: any) => void;
}

export const useAiTablesStore = create<AiTablesState>((set) => ({
  mode: 'tables',
  activeSite: 'default',
  activeTable: null,
  detailTab: 'overview',
  bootstrap: null,

  setMode: (m) => set({ mode: m }),
  setActiveSite: (s) => set({ activeSite: s, activeTable: null }),
  setActiveTable: (t) => set({ activeTable: t, detailTab: 'overview' }),
  setDetailTab: (t) => set({ detailTab: t }),
  setBootstrap: (b) => set({ bootstrap: b }),
}));
```

### Task 3a.8: 페이지 shell + 3단 레이아웃

**Files:**
- Create: `src/app/settings/ai-tables/page.tsx`

- [ ] **Step 1: page.tsx**

File `src/app/settings/ai-tables/page.tsx`:
```tsx
/**
 * @file src/app/settings/ai-tables/page.tsx
 * @description AI Tables 페이지 shell. 3단 레이아웃 + Zustand + bootstrap 로드.
 */

'use client';
import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from './_lib/api-client';
import { useAiTablesStore } from './_hooks/useAiTablesStore';
import SiteTableNav from './_components/nav/SiteTableNav';
import TableList from './_components/list/TableList';
import TableDetail from './_components/detail/TableDetail';

export default function AiTablesPage() {
  const { data } = useSWR('bootstrap', api.bootstrap);
  const setBootstrap = useAiTablesStore(s => s.setBootstrap);

  useEffect(() => { if (data) setBootstrap(data); }, [data, setBootstrap]);

  if (!data) return <div className="p-6">로딩 중...</div>;

  return (
    <div className="flex h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="w-[18%] min-w-[200px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <SiteTableNav />
      </aside>
      <section className="w-[27%] min-w-[280px] border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto">
        <TableList />
      </section>
      <main className="flex-1 overflow-y-auto">
        <TableDetail />
      </main>
    </div>
  );
}
```

### Task 3a.9: 좌측 네비 + 목록 + 상세 shell 컴포넌트

**Files:**
- Create: `src/app/settings/ai-tables/_components/nav/SiteTableNav.tsx`
- Create: `src/app/settings/ai-tables/_components/list/TableList.tsx`
- Create: `src/app/settings/ai-tables/_components/detail/TableDetail.tsx`

- [ ] **Step 1: SiteTableNav.tsx (사이트 + 접두어 트리)**

File `src/app/settings/ai-tables/_components/nav/SiteTableNav.tsx`:
```tsx
'use client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';

export default function SiteTableNav() {
  const { bootstrap, activeSite, setActiveSite } = useAiTablesStore();
  if (!bootstrap) return null;

  return (
    <nav className="p-2 text-sm">
      <div className="mb-3 font-semibold text-zinc-600 dark:text-zinc-400">🗃️ 사이트</div>
      {bootstrap.sites.map((site: string) => {
        const rows = bootstrap.tables[site] ?? [];
        const prefixGroups = groupByPrefix(rows.map((r: any) => r.name));
        const active = site === activeSite;
        return (
          <div key={site} className="mb-2">
            <button
              className={`w-full text-left px-2 py-1 rounded ${active ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
              onClick={() => setActiveSite(site)}
            >
              {site} ({rows.length})
            </button>
            {active && prefixGroups.map(([prefix, count]) => (
              <div key={prefix} className="ml-4 py-0.5 text-xs text-zinc-500">
                {prefix} ({count})
              </div>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function groupByPrefix(names: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const n of names) {
    const prefix = n.split('_')[0] + '_';
    map.set(prefix, (map.get(prefix) ?? 0) + 1);
  }
  return [...map.entries()].sort();
}
```

- [ ] **Step 2: TableList.tsx**

File `src/app/settings/ai-tables/_components/list/TableList.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';

export default function TableList() {
  const { bootstrap, activeSite, activeTable, setActiveTable } = useAiTablesStore();
  const [search, setSearch] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);

  const rows = (bootstrap?.tables[activeSite] ?? [])
    .filter((r: any) => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter((r: any) => !onlyEnabled || r.enabled);

  return (
    <div className="p-2">
      <input
        className="w-full mb-2 px-2 py-1 text-sm border rounded dark:bg-zinc-900 dark:border-zinc-700"
        placeholder="🔍 검색"
        value={search} onChange={(e) => setSearch(e.target.value)}
      />
      <label className="block text-xs mb-2">
        <input type="checkbox" checked={onlyEnabled} onChange={(e) => setOnlyEnabled(e.target.checked)} /> enabled만
      </label>

      <div className="space-y-1">
        {rows.map((r: any) => (
          <button
            key={r.name}
            className={`w-full flex items-center justify-between px-2 py-1 text-sm rounded ${activeTable === r.name ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
            onClick={() => setActiveTable(r.name)}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${r.enabled ? 'bg-green-500' : 'bg-zinc-400'}`} />
              {r.name}
            </span>
            <span className="text-xs text-zinc-500">💬 {r.exampleCount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TableDetail.tsx shell + 탭 스위처**

File `src/app/settings/ai-tables/_components/detail/TableDetail.tsx`:
```tsx
'use client';
import useSWR from 'swr';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';
import OverviewTab from '../tabs/OverviewTab';
import ColumnsTab from '../tabs/ColumnsTab';
import HistoryTab from '../tabs/HistoryTab';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'columns', label: 'Columns' },
  { id: 'history', label: 'History' },
] as const;

export default function TableDetail() {
  const { activeSite, activeTable, detailTab, setDetailTab } = useAiTablesStore();
  const { data, mutate } = useSWR(
    activeTable ? ['table', activeSite, activeTable] : null,
    () => api.getTable(activeSite, activeTable!));

  if (!activeTable) return <div className="p-6 text-zinc-500">테이블을 선택하세요</div>;
  if (!data) return <div className="p-6">로딩...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-1">{activeTable}</h2>
      <div className="text-sm text-zinc-500 mb-4">[{activeSite}]</div>

      <div className="flex gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setDetailTab(t.id as any)}
            className={`px-3 py-2 text-sm ${detailTab === t.id ? 'border-b-2 border-blue-500 -mb-px' : 'text-zinc-500'}`}
          >{t.label}</button>
        ))}
      </div>

      {detailTab === 'overview' && <OverviewTab data={data} onChange={mutate} />}
      {detailTab === 'columns' && <ColumnsTab data={data} onChange={mutate} />}
      {detailTab === 'history' && <HistoryTab tableName={activeTable} />}
    </div>
  );
}
```

### Task 3a.10: OverviewTab + ColumnsTab + DdlPreviewModal

**Files:**
- Create: `src/app/settings/ai-tables/_components/tabs/OverviewTab.tsx`
- Create: `src/app/settings/ai-tables/_components/tabs/ColumnsTab.tsx`
- Create: `src/app/settings/ai-tables/_components/tabs/HistoryTab.tsx`
- Create: `src/app/settings/ai-tables/_components/modals/DdlPreviewModal.tsx`

- [ ] **Step 1: DdlPreviewModal (재사용)**

File `src/app/settings/ai-tables/_components/modals/DdlPreviewModal.tsx`:
```tsx
'use client';
interface Props {
  open: boolean;
  before: string | null;
  after: string;
  ddl: string;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}
export default function DdlPreviewModal({ open, before, after, ddl, onCancel, onConfirm }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg max-w-2xl w-full">
        <h3 className="text-lg font-bold mb-3">🔎 주석 변경 미리보기</h3>
        <div className="mb-3">
          <div className="text-xs text-zinc-500">변경 전</div>
          <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm">{before ?? '(없음)'}</div>
        </div>
        <div className="mb-3">
          <div className="text-xs text-zinc-500">변경 후</div>
          <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded text-sm">{after}</div>
        </div>
        <div className="mb-4">
          <div className="text-xs text-zinc-500">실행될 DDL</div>
          <pre className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded text-xs overflow-x-auto">{ddl}</pre>
        </div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 text-sm" onClick={onCancel}>취소</button>
          <button className="px-4 py-2 text-sm bg-blue-500 text-white rounded" onClick={onConfirm}>확인 실행</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: OverviewTab**

File `src/app/settings/ai-tables/_components/tabs/OverviewTab.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { api } from '../../_lib/api-client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import DdlPreviewModal from '../modals/DdlPreviewModal';

export default function OverviewTab({ data, onChange }: { data: any; onChange: () => void }) {
  const { activeSite, activeTable } = useAiTablesStore();
  const [summary, setSummary] = useState(data.meta.summary ?? '');
  const [tableComment, setTableComment] = useState(data.schema.tableComment ?? '');
  const [preview, setPreview] = useState<any | null>(null);

  const savePatch = async () => {
    await api.patchTable(activeSite, activeTable!, { summary });
    onChange();
  };

  const openDdlPreview = async () => {
    const r = await api.previewTableComment(activeSite, activeTable!, tableComment);
    setPreview(r);
  };

  const confirmDdl = async () => {
    await api.executeTableComment(activeSite, activeTable!, preview.ddl, preview.before);
    setPreview(null);
    onChange();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm mb-1">테이블 summary (페이지용)</label>
        <input
          className="w-full px-2 py-1 border rounded dark:bg-zinc-900 dark:border-zinc-700"
          value={summary} onChange={(e) => setSummary(e.target.value)}
        />
        <button className="mt-1 text-xs px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded" onClick={savePatch}>저장</button>
      </div>
      <div>
        <label className="block text-sm mb-1">DB 테이블 주석 (Oracle USER_TAB_COMMENTS)</label>
        <textarea
          className="w-full px-2 py-1 border rounded h-20 dark:bg-zinc-900 dark:border-zinc-700"
          value={tableComment} onChange={(e) => setTableComment(e.target.value)}
        />
        <button className="mt-1 text-xs px-2 py-1 bg-blue-500 text-white rounded" onClick={openDdlPreview}>DDL 미리보기</button>
      </div>

      <DdlPreviewModal
        open={!!preview}
        before={preview?.before} after={preview?.after ?? ''} ddl={preview?.ddl ?? ''}
        onCancel={() => setPreview(null)} onConfirm={confirmDdl}
      />
    </div>
  );
}
```

- [ ] **Step 3: ColumnsTab (간단 버전 — 전체 편집은 3b에서 확장)**

File `src/app/settings/ai-tables/_components/tabs/ColumnsTab.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { api } from '../../_lib/api-client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import DdlPreviewModal from '../modals/DdlPreviewModal';

export default function ColumnsTab({ data, onChange }: { data: any; onChange: () => void }) {
  const { activeSite, activeTable } = useAiTablesStore();
  const [preview, setPreview] = useState<any | null>(null);
  const [editCol, setEditCol] = useState<string | null>(null);

  const editComment = async (colName: string, newComment: string) => {
    const r = await api.previewColComment(activeSite, activeTable!, colName, newComment);
    setPreview({ ...r, colName });
  };

  const confirm = async () => {
    await api.executeColComment(activeSite, activeTable!, preview.colName, preview.ddl, preview.before);
    setPreview(null);
    onChange();
  };

  const toggleExclude = async (col: string, current: boolean) => {
    await api.patchColumn(activeSite, activeTable!, col, { excludeFromPrompt: !current });
    onChange();
  };

  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="text-left p-1">컬럼</th>
            <th className="text-left p-1">타입</th>
            <th className="text-left p-1">주석</th>
            <th className="p-1">우선순위</th>
            <th className="p-1">제외</th>
          </tr>
        </thead>
        <tbody>
          {data.resolvedColumns.map((c: any) => (
            <tr key={c.name} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="p-1 font-mono">{c.name}</td>
              <td className="p-1 text-xs text-zinc-500">{c.type}</td>
              <td className="p-1">
                <span onDoubleClick={() => setEditCol(c.name)} className="cursor-pointer">
                  {editCol === c.name ? (
                    <input
                      autoFocus defaultValue={c.comment ?? ''}
                      className="w-full px-1 border rounded dark:bg-zinc-900"
                      onBlur={(e) => { editComment(c.name, e.target.value); setEditCol(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { editComment(c.name, (e.target as any).value); setEditCol(null); } }}
                    />
                  ) : (c.comment ?? <span className="text-zinc-400">(더블클릭 편집)</span>)}
                </span>
              </td>
              <td className="p-1 text-center text-xs">{c.priority}</td>
              <td className="p-1 text-center">
                <input type="checkbox" checked={c.excludeFromPrompt}
                  onChange={() => toggleExclude(c.name, c.excludeFromPrompt)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DdlPreviewModal
        open={!!preview}
        before={preview?.before} after={preview?.after ?? ''} ddl={preview?.ddl ?? ''}
        onCancel={() => setPreview(null)} onConfirm={confirm}
      />
    </>
  );
}
```

- [ ] **Step 4: HistoryTab**

File `src/app/settings/ai-tables/_components/tabs/HistoryTab.tsx`:
```tsx
'use client';
import useSWR from 'swr';

export default function HistoryTab({ tableName }: { tableName: string }) {
  const { data } = useSWR(`/api/ai-tables/comment-history?table=${tableName}`, (url) => fetch(url).then(r => r.json()));
  if (!data) return <div>로딩...</div>;
  return (
    <ul className="space-y-2 text-sm">
      {(data.entries ?? []).map((e: any) => (
        <li key={e.filename} className="p-2 border rounded dark:border-zinc-700">
          <div className="text-xs text-zinc-500">{e.timestamp} · {e.osUser}</div>
          <div className="text-xs">전: <span className="line-through">{e.before ?? '(없음)'}</span></div>
          <div className="text-xs">후: {e.after}</div>
        </li>
      ))}
    </ul>
  );
}
```

### Task 3a.11: comment-history 조회 API

**Files:**
- Create: `src/app/api/ai-tables/comment-history/route.ts`

- [ ] **Step 1: route.ts**

File `src/app/api/ai-tables/comment-history/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '@/lib/ai-tables/paths';

export async function GET(req: NextRequest) {
  const table = req.nextUrl.searchParams.get('table');
  await fs.mkdir(PATHS.historyDir, { recursive: true });
  const files = (await fs.readdir(PATHS.historyDir))
    .filter(f => f.endsWith('.sql'))
    .filter(f => !table || f.includes(table))
    .sort().reverse().slice(0, 50);

  const entries = await Promise.all(files.map(async (filename) => {
    const content = await fs.readFile(path.join(PATHS.historyDir, filename), 'utf-8');
    const m = content.match(/-- table: (\S+)[\s\S]*?-- column: (\S+)?[\s\S]*?-- user: (\S+)[\s\S]*?-- timestamp: (\S+)[\s\S]*?-- BEFORE\n-- (.+?)\n\s*-- AFTER\n-- (.+?)$/m);
    return {
      filename, table: m?.[1], column: m?.[2], osUser: m?.[3], timestamp: m?.[4],
      before: m?.[5] === '(null)' ? null : m?.[5], after: m?.[6],
      changeType: m?.[2] ? 'column' : 'table',
    };
  }));
  return NextResponse.json({ entries });
}
```

### Task 3a.12: Phase 3a 수동 QA + 커밋

- [ ] **Step 1: 브라우저에서 수동 테스트**

```bash
npm run dev
# http://localhost:3000/settings/ai-tables 접속
```

체크리스트:
- [ ] 좌측에 사이트 목록 표시
- [ ] 중간에 테이블 목록 표시, 검색 필터 작동
- [ ] 테이블 클릭 → 우측 상세 Overview 탭 표시
- [ ] Summary 편집 + 저장 → 목록에 반영
- [ ] DB 주석 편집 → DDL 미리보기 모달 → 확인 실행 → 이력 파일 생성
- [ ] Columns 탭 → 컬럼 주석 더블클릭 → 편집
- [ ] excludeFromPrompt 체크박스 토글 → tables.json 업데이트 확인
- [ ] History 탭에서 이력 표시

- [ ] **Step 2: `/ai-chat` 회귀 확인**

같은 질문을 `/ai-chat`에서 실행 → Phase 2와 동일한 결과 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/app/settings/ai-tables/ src/app/api/ai-tables/ src/lib/ai-tables/
git commit -m "feat(ai-tables): Phase 3a 페이지 shell + 기본 CRUD API + DDL 2단계 확인"
```

---

## Phase 3b: 고급 기능

목표: 예제 3종 편집, AI 초안(SSE), 라이브 프리뷰, 컬럼 도메인 관리 + 자동 제안, 피드백 승격 루프, Prompt Preview, Filters/Joins, Dictionary, Stage 1 매칭 캐스케이드.

### Task 3b.1: 예제 CRUD API + Validators

**Files:**
- Create: `src/lib/ai-tables/validators.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/examples/route.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/examples/[id]/route.ts`

- [ ] **Step 1: validators.ts (kind별 검증)**

File `src/lib/ai-tables/validators.ts`:
```typescript
import type { Example } from './types';

export function validateExample(ex: Partial<Example>): { ok: boolean; error?: string } {
  if (!ex.kind || !['exact','template','skeleton'].includes(ex.kind)) return { ok: false, error: 'invalid kind' };
  if (!ex.question?.trim()) return { ok: false, error: 'question required' };
  if (ex.kind === 'exact' && !ex.sql?.trim()) return { ok: false, error: 'sql required for exact' };
  if (ex.kind === 'template' && !ex.sqlTemplate?.trim()) return { ok: false, error: 'sqlTemplate required' };
  if (ex.kind === 'skeleton' && (!ex.dialog?.length || !ex.sqlTemplate?.trim())) return { ok: false, error: 'dialog+sqlTemplate required for skeleton' };
  // SELECT only 검증 (간단)
  const sql = (ex.sql || ex.sqlTemplate || '').trim().toUpperCase();
  if (sql && !/^(SELECT|WITH)\b/.test(sql)) return { ok: false, error: 'SELECT/WITH only' };
  return { ok: true };
}
```

- [ ] **Step 2: 예제 CRUD route**

File `src/app/api/ai-tables/[site]/[table]/examples/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
import { validateExample } from '@/lib/ai-tables/validators';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const tables = await loadTables();
  const meta = tables.sites[site as any]?.tables[table];
  return NextResponse.json({ examples: meta?.examples ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const body = await req.json();
  const v = validateExample(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  const tables = await loadTables();
  const meta = tables.sites[site as any]?.tables[table];
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const ex = {
    id: nanoid(10), createdAt: new Date().toISOString(), source: 'manual' as const,
    ...body,
  };
  meta.examples.push(ex);
  await saveTables(tables);
  return NextResponse.json({ ok: true, example: ex });
}
```

File `src/app/api/ai-tables/[site]/[table]/examples/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
import { validateExample } from '@/lib/ai-tables/validators';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ site: string; table: string; id: string }> }) {
  const { site, table, id } = await params;
  const patch = await req.json();
  const tables = await loadTables();
  const meta = tables.sites[site as any]?.tables[table];
  const ex = meta?.examples.find(x => x.id === id);
  if (!ex) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const merged = { ...ex, ...patch };
  const v = validateExample(merged);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  Object.assign(ex, patch);
  await saveTables(tables);
  return NextResponse.json({ ok: true, example: ex });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ site: string; table: string; id: string }> }) {
  const { site, table, id } = await params;
  const tables = await loadTables();
  const meta = tables.sites[site as any]?.tables[table];
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });
  meta.examples = meta.examples.filter(x => x.id !== id);
  await saveTables(tables);
  return NextResponse.json({ ok: true });
}
```

### Task 3b.2: AI 초안 SSE API + 클라이언트 훅

**Files:**
- Create: `src/lib/ai-tables/ai-draft.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/examples/ai-draft/route.ts`
- Create: `src/app/settings/ai-tables/_hooks/useAiDraftStream.ts`

- [ ] **Step 1: ai-draft.ts (LLM 호출)**

File `src/lib/ai-tables/ai-draft.ts`:
```typescript
import { buildStage1Prompt } from './merged-context';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getProvider } from '@/lib/ai/router';
import type { Example, SiteKey, ExampleKind } from './types';

const DRAFT_SYS = `당신은 MES SQL 예제 생성기입니다.
주어진 테이블의 컨텍스트를 참고해 자연어 질문과 SQL, 그 이유(why)를 JSON 배열로 생성하세요.
반드시 JSON만 응답: [{"kind":"exact","question":"...","sql":"SELECT ...","why":"..."}, ...]`;

export async function* streamExampleDrafts(
  site: SiteKey, table: string, count: number, kinds: ExampleKind[]
): AsyncIterable<{ type: 'draft'; example: Partial<Example> } | { type: 'done'; totalTokens: number } | { type: 'error'; message: string }> {
  const ctx = await buildStage1Prompt(site, [table]);
  const cfg = await getProviderForRuntime('mistral');
  if (!cfg?.apiKey) { yield { type: 'error', message: 'no provider configured' }; return; }
  const provider = getProvider('mistral');
  const prompt = `# 테이블 컨텍스트\n${ctx}\n\n# 요청\n${count}개 예제 생성. kinds: ${kinds.join(',')}`;
  let full = '';
  try {
    for await (const chunk of provider.chatStream({ model: cfg.defaultModelId!, messages: [{ role: 'user', content: prompt }], systemPrompt: DRAFT_SYS, temperature: 0.3 }, cfg.apiKey)) {
      if (chunk.type === 'token') full += chunk.delta;
    }
    const arr = JSON.parse(full.replace(/```json|```/g, ''));
    for (const ex of arr) yield { type: 'draft', example: ex };
    yield { type: 'done', totalTokens: Math.ceil(full.length / 3) };
  } catch (e) {
    yield { type: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}
```

- [ ] **Step 2: SSE route**

File `src/app/api/ai-tables/[site]/[table]/examples/ai-draft/route.ts`:
```typescript
import { NextRequest } from 'next/server';
import { streamExampleDrafts } from '@/lib/ai-tables/ai-draft';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const { count = 3, kinds = ['exact','template'] } = await req.json().catch(() => ({}));
  const stream = new ReadableStream({
    async start(ctl) {
      const enc = new TextEncoder();
      for await (const ev of streamExampleDrafts(site as any, table, count, kinds)) {
        ctl.enqueue(enc.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`));
      }
      ctl.close();
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
}
```

- [ ] **Step 3: useAiDraftStream 훅**

File `src/app/settings/ai-tables/_hooks/useAiDraftStream.ts`:
```typescript
'use client';
import { useState, useCallback } from 'react';

export function useAiDraftStream(site: string, table: string) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const start = useCallback(async (count = 3) => {
    setLoading(true); setDrafts([]);
    const r = await fetch(`/api/ai-tables/${site}/${table}/examples/ai-draft`, {
      method: 'POST', body: JSON.stringify({ count, kinds: ['exact','template'] }),
      headers: { 'Content-Type': 'application/json' }
    });
    const reader = r.body!.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value);
      const events = buf.split('\n\n'); buf = events.pop() ?? '';
      for (const ev of events) {
        const dataLine = ev.split('\n').find(l => l.startsWith('data: '));
        if (!dataLine) continue;
        const parsed = JSON.parse(dataLine.slice(6));
        if (parsed.type === 'draft') setDrafts(prev => [...prev, parsed.example]);
      }
    }
    setLoading(false);
  }, [site, table]);

  return { drafts, loading, start };
}
```

### Task 3b.3: 라이브 프리뷰 (examples/[id]/run)

**Files:**
- Create: `src/app/api/ai-tables/[site]/[table]/examples/[id]/run/route.ts`

- [ ] **Step 1: route.ts**

File `src/app/api/ai-tables/[site]/[table]/examples/[id]/run/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadTables } from '@/lib/ai-tables/store';
import { executeQuery, executeQueryByProfile } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string; id: string }> }) {
  const { site, table, id } = await params;
  const { bindings = {} } = await req.json().catch(() => ({}));
  const tables = await loadTables();
  const ex = tables.sites[site as any]?.tables[table]?.examples.find(e => e.id === id);
  if (!ex) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let sql = ex.sql ?? ex.sqlTemplate ?? '';
  // ROWNUM ≤ 10 자동 주입 (간단 버전)
  if (!/ROWNUM\s*<=?\s*\d+/i.test(sql)) sql = `SELECT * FROM (${sql}) WHERE ROWNUM <= 10`;
  // SELECT/WITH만
  if (!/^\s*(SELECT|WITH)\b/i.test(sql)) return NextResponse.json({ error: 'only SELECT/WITH' }, { status: 400 });

  const started = Date.now();
  try {
    const exec = site === 'default' ? executeQuery : (q: string, b: any) => executeQueryByProfile(site as any, q, b);
    const rows = await exec<any>(sql, bindings);
    return NextResponse.json({
      ok: true, renderedSql: sql, rows, elapsedMs: Date.now() - started,
      columns: rows[0] ? Object.keys(rows[0]).map(n => ({ name: n })) : [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
```

### Task 3b.4: 컬럼 도메인 API

**Files:**
- Create: `src/lib/ai-tables/domain-suggester.ts`
- Create: `src/app/api/ai-tables/domains/route.ts`
- Create: `src/app/api/ai-tables/domains/[id]/route.ts`
- Create: `src/app/api/ai-tables/domains/auto-suggest/route.ts`

- [ ] **Step 1: domain-suggester.ts** (migrate-to-tables-json.mjs의 suggestDomains를 TypeScript로 포팅)

File `src/lib/ai-tables/domain-suggester.ts`:
```typescript
import type { SchemaCacheFile, BasecodeCacheFile, ColumnDomain } from './types';

export function suggestDomains(
  schemaCache: SchemaCacheFile, basecodes: BasecodeCacheFile, existing: ColumnDomain[]
): Array<{ domainId: string; name: string; reason: string; proposedMembers: string[]; proposedSettings: Partial<ColumnDomain> }> {
  const existingIds = new Set(existing.map(d => d.id));
  const allCols = new Set<string>();
  for (const site of Object.values(schemaCache.sites)) {
    for (const t of Object.values(site.tables)) for (const c of t.columns) allCols.add(c.name);
  }
  const suggestions = [];

  const by = [...allCols].filter(c => /_BY$/.test(c));
  if (by.length >= 3 && !existingIds.has('audit-who')) suggestions.push({
    domainId: 'audit-who', name: '입력·수정자',
    reason: `접미 '_BY' 패턴 ${by.length}개 매칭`,
    proposedMembers: by, proposedSettings: { excludeFromPrompt: true },
  });

  const when = [...allCols].filter(c => /(_DATE|_AT)$/.test(c));
  if (when.length >= 3 && !existingIds.has('audit-when')) suggestions.push({
    domainId: 'audit-when', name: '입력·수정 일시',
    reason: `접미 '_DATE|_AT' 패턴 ${when.length}개 매칭`,
    proposedMembers: when, proposedSettings: { excludeFromPrompt: true },
  });

  const knownTypes = new Set(basecodes.codeTypes.map(b => b.codeType));
  for (const col of [...allCols].filter(c => /_CODE$/.test(c))) {
    const candidate = col.replace(/_/g, ' ');
    if (!knownTypes.has(candidate)) continue;
    const id = candidate.toLowerCase().replace(/\s/g, '-');
    if (existingIds.has(id)) continue;
    if (suggestions.find(s => s.domainId === id)) continue;
    suggestions.push({
      domainId: id, name: candidate,
      reason: `CODE_TYPE 'LOCATION CODE' 매칭`,
      proposedMembers: [col],
      proposedSettings: { priority: 'common' as const, decode: { kind: 'basecode' as const, codeType: candidate } },
    });
  }
  return suggestions;
}
```

- [ ] **Step 2: 도메인 CRUD route**

File `src/app/api/ai-tables/domains/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadDomains, saveDomains } from '@/lib/ai-tables/store';

export async function GET() {
  const d = await loadDomains();
  return NextResponse.json(d);
}
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.id || !body.name || !Array.isArray(body.members)) {
    return NextResponse.json({ error: 'id, name, members required' }, { status: 400 });
  }
  const data = await loadDomains();
  if (data.domains.find(d => d.id === body.id)) return NextResponse.json({ error: 'exists' }, { status: 409 });
  data.domains.push(body);
  await saveDomains(data);
  return NextResponse.json({ ok: true, domain: body });
}
```

File `src/app/api/ai-tables/domains/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadDomains, saveDomains } from '@/lib/ai-tables/store';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patch = await req.json();
  const data = await loadDomains();
  const d = data.domains.find(x => x.id === id);
  if (!d) return NextResponse.json({ error: 'not found' }, { status: 404 });
  Object.assign(d, patch);
  await saveDomains(data);
  return NextResponse.json({ ok: true, domain: d });
}
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadDomains();
  data.domains = data.domains.filter(x => x.id !== id);
  await saveDomains(data);
  return NextResponse.json({ ok: true });
}
```

File `src/app/api/ai-tables/domains/auto-suggest/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { loadDomains } from '@/lib/ai-tables/store';
import { loadSchemaCache } from '@/lib/ai-tables/schema-loader';
import { loadBasecodes } from '@/lib/ai-tables/basecode-loader';
import { suggestDomains } from '@/lib/ai-tables/domain-suggester';

export async function POST() {
  const [cache, basecodes, existing] = await Promise.all([loadSchemaCache(), loadBasecodes(), loadDomains()]);
  const suggestions = suggestDomains(cache, basecodes, existing.domains);
  return NextResponse.json({ suggestions });
}
```

### Task 3b.5: 도메인 모드 UI (DomainNav + DomainEditor)

**Files:**
- Create: `src/app/settings/ai-tables/_components/nav/DomainNav.tsx`
- Create: `src/app/settings/ai-tables/_components/editors/DomainEditor.tsx`
- Create: `src/app/settings/ai-tables/_components/nav/ModeSwitcher.tsx`
- Modify: `src/app/settings/ai-tables/page.tsx`

- [ ] **Step 1: ModeSwitcher**

File `src/app/settings/ai-tables/_components/nav/ModeSwitcher.tsx`:
```tsx
'use client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
export default function ModeSwitcher() {
  const { mode, setMode } = useAiTablesStore();
  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-800">
      {(['tables','domains'] as const).map(m => (
        <button key={m} onClick={() => setMode(m)}
          className={`flex-1 py-2 text-sm ${mode === m ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold' : ''}`}>
          {m === 'tables' ? '🗃️ 테이블' : '📚 도메인'}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: DomainNav + DomainEditor**

File `src/app/settings/ai-tables/_components/nav/DomainNav.tsx`:
```tsx
'use client';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { useState } from 'react';

export default function DomainNav({ onSelect }: { onSelect: (id: string) => void }) {
  const domains = useAiTablesStore(s => s.bootstrap?.domains ?? []);
  const [selected, setSelected] = useState<string | null>(null);

  const autoSuggest = async () => {
    const r = await fetch('/api/ai-tables/domains/auto-suggest', { method: 'POST' });
    const { suggestions } = await r.json();
    alert(`${suggestions.length}개 제안 — TODO: 모달로 개별 Accept/Reject`);
  };

  return (
    <div className="p-2">
      <button className="w-full mb-2 px-2 py-1 text-xs bg-blue-500 text-white rounded" onClick={autoSuggest}>
        🔍 자동 제안
      </button>
      <div className="space-y-1">
        {domains.map((d: any) => (
          <button key={d.id} onClick={() => { setSelected(d.id); onSelect(d.id); }}
            className={`w-full text-left px-2 py-1 text-sm rounded ${selected === d.id ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}>
            <span>{d.excludeFromPrompt ? '🔇' : d.priority === 'key' ? '🔑' : '📊'}</span>
            {' '}{d.name} ({d.members.length})
          </button>
        ))}
      </div>
    </div>
  );
}
```

File `src/app/settings/ai-tables/_components/editors/DomainEditor.tsx`:
```tsx
'use client';
import { useEffect, useState } from 'react';
export default function DomainEditor({ domainId }: { domainId: string | null }) {
  const [domain, setDomain] = useState<any | null>(null);
  useEffect(() => {
    if (!domainId) return;
    fetch('/api/ai-tables/domains').then(r => r.json()).then(d => {
      setDomain(d.domains.find((x: any) => x.id === domainId));
    });
  }, [domainId]);

  if (!domain) return <div className="p-6 text-zinc-500">도메인을 선택하세요</div>;
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">{domain.name}</h2>
      <div className="text-sm text-zinc-500 mb-4">{domain.description ?? ''}</div>
      <div className="mb-4">
        <h3 className="font-semibold mb-2">📋 Members ({domain.members.length})</h3>
        <ul className="space-y-1 text-sm font-mono">
          {domain.members.map((m: string) => <li key={m}>{m}</li>)}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold mb-2">⚙️ 설정</h3>
        <div>Priority: {domain.priority ?? '-'}</div>
        <div>Exclude from prompt: {domain.excludeFromPrompt ? 'Y' : 'N'}</div>
        <div>Decode: {JSON.stringify(domain.decode ?? null)}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: page.tsx 수정 — mode 분기**

Edit `src/app/settings/ai-tables/page.tsx` — 렌더 부분 교체:
```tsx
// ... useSWR/effect 동일
const mode = useAiTablesStore(s => s.mode);
const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

return (
  <div className="flex h-screen ...">
    <aside className="w-[18%] min-w-[200px] border-r ...">
      <ModeSwitcher />
      {mode === 'tables' ? <SiteTableNav /> : <DomainNav onSelect={setSelectedDomain} />}
    </aside>
    {mode === 'tables' ? (
      <>
        <section className="w-[27%] ..."><TableList /></section>
        <main className="flex-1 ..."><TableDetail /></main>
      </>
    ) : (
      <main className="flex-1 ..."><DomainEditor domainId={selectedDomain} /></main>
    )}
  </div>
);
```

### Task 3b.6: 피드백 승격 루프

**Files:**
- Create: `src/lib/ai-tables/sql-table-parser.ts`
- Create: `src/lib/ai-tables/feedback-queue.ts`
- Modify: `src/app/api/ai-chat/feedback/route.ts` (또는 MessageBubble이 호출하는 기존 엔드포인트)
- Create: `src/app/api/ai-tables/[site]/[table]/feedback-queue/route.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/feedback-queue/[fbId]/route.ts`
- Create: `src/app/api/ai-tables/[site]/[table]/feedback-queue/[fbId]/promote/route.ts`

- [ ] **Step 1: sql-table-parser.ts + 테스트**

File `src/lib/ai-tables/sql-table-parser.ts`:
```typescript
export function extractTableNames(sql: string): string[] {
  const clean = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const matches = [...clean.matchAll(/\b(?:FROM|JOIN)\s+([A-Z_][A-Z0-9_]*)/gi)];
  const set = new Set(matches.map(m => m[1].toUpperCase()));
  return [...set];
}
```

File `src/lib/ai-tables/__tests__/sql-table-parser.test.ts`:
```typescript
import { extractTableNames } from '../sql-table-parser';
describe('extractTableNames', () => {
  it('FROM 한 개', () => expect(extractTableNames('SELECT * FROM LOG_AOI')).toEqual(['LOG_AOI']));
  it('JOIN 여러 개', () => expect(extractTableNames('SELECT * FROM A JOIN B ON A.X=B.X JOIN C ON B.Y=C.Y').sort()).toEqual(['A','B','C']));
  it('주석 무시', () => expect(extractTableNames('-- FROM FAKE\nSELECT * FROM REAL')).toEqual(['REAL']));
  it('CTE 처리', () => expect(extractTableNames('WITH cte AS (SELECT * FROM A) SELECT * FROM cte').sort()).toEqual(['A','CTE']));
});
```

```bash
npx jest src/lib/ai-tables/__tests__/sql-table-parser.test.ts
```
Expected: 4 passed

- [ ] **Step 2: feedback-queue.ts**

File `src/lib/ai-tables/feedback-queue.ts`:
```typescript
import { loadTables, saveTables } from './store';
import { extractTableNames } from './sql-table-parser';
import type { FeedbackCandidate, SiteKey } from './types';

export async function enqueueFeedback(site: SiteKey, candidate: Omit<FeedbackCandidate, 'tablesReferenced'>): Promise<void> {
  const tables = extractTableNames(candidate.sql);
  const data = await loadTables();
  for (const t of tables) {
    const meta = data.sites[site]?.tables[t];
    if (!meta) continue;
    if (meta.feedbackQueue.find(f => f.id === candidate.id)) continue;
    meta.feedbackQueue.push({ ...candidate, tablesReferenced: tables });
  }
  await saveTables(data);
}

export async function promoteFeedback(site: SiteKey, table: string, fbId: string, example: any) {
  const data = await loadTables();
  const meta = data.sites[site]?.tables[table];
  if (!meta) throw new Error('not found');
  const fb = meta.feedbackQueue.find(f => f.id === fbId);
  if (!fb) throw new Error('feedback not found');
  meta.examples.push({
    ...example, id: fbId, source: 'promoted',
    promotedFrom: { chatSessionId: fb.sessionId, messageId: fb.id, likedAt: fb.likedAt },
    createdAt: new Date().toISOString(),
  });
  meta.feedbackQueue = meta.feedbackQueue.filter(f => f.id !== fbId);
  await saveTables(data);
}
```

- [ ] **Step 3: /ai-chat 피드백 훅 확장**

기존 `MessageBubble`의 좋아요 API 호출 지점에서 `sql`과 `site`를 함께 전달하도록 수정. 엔드포인트에서 `enqueueFeedback`을 호출.

- [ ] **Step 4: feedback-queue 조회·승격·기각 API**

File `src/app/api/ai-tables/[site]/[table]/feedback-queue/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { loadTables } from '@/lib/ai-tables/store';
export async function GET(_req: Request, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const data = await loadTables();
  return NextResponse.json({ queue: data.sites[site as any]?.tables[table]?.feedbackQueue ?? [] });
}
```

File `src/app/api/ai-tables/[site]/[table]/feedback-queue/[fbId]/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { loadTables, saveTables } from '@/lib/ai-tables/store';
export async function DELETE(_req: Request, { params }: { params: Promise<{ site: string; table: string; fbId: string }> }) {
  const { site, table, fbId } = await params;
  const data = await loadTables();
  const meta = data.sites[site as any]?.tables[table];
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });
  meta.feedbackQueue = meta.feedbackQueue.filter(f => f.id !== fbId);
  await saveTables(data);
  return NextResponse.json({ ok: true });
}
```

File `src/app/api/ai-tables/[site]/[table]/feedback-queue/[fbId]/promote/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { promoteFeedback } from '@/lib/ai-tables/feedback-queue';
export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string; fbId: string }> }) {
  const { site, table, fbId } = await params;
  const example = await req.json();
  await promoteFeedback(site as any, table, fbId, example);
  return NextResponse.json({ ok: true });
}
```

### Task 3b.7: ExamplesTab + 서브탭 + AI 초안 + 라이브 프리뷰

**Files:**
- Create: `src/app/settings/ai-tables/_components/tabs/ExamplesTab.tsx`
- Create: `src/app/settings/ai-tables/_components/editors/ExampleExactEditor.tsx`
- Create: `src/app/settings/ai-tables/_components/editors/ExampleTemplateEditor.tsx`
- Create: `src/app/settings/ai-tables/_components/editors/ExampleSkeletonEditor.tsx`
- Create: `src/app/settings/ai-tables/_components/shared/LivePreview.tsx`
- Create: `src/app/settings/ai-tables/_components/feedback/FeedbackQueueSection.tsx`

- [ ] **Step 1: ExamplesTab 컨테이너**

File `src/app/settings/ai-tables/_components/tabs/ExamplesTab.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { useAiDraftStream } from '../../_hooks/useAiDraftStream';
import FeedbackQueueSection from '../feedback/FeedbackQueueSection';

export default function ExamplesTab({ data, onChange }: { data: any; onChange: () => void }) {
  const { activeSite, activeTable } = useAiTablesStore();
  const [kind, setKind] = useState<'exact'|'template'|'skeleton'>('exact');
  const { drafts, loading, start } = useAiDraftStream(activeSite, activeTable!);
  const filtered = data.meta.examples.filter((e: any) => e.kind === kind);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['exact','template','skeleton'] as const).map(k =>
          <button key={k} onClick={() => setKind(k)} className={`px-3 py-1 text-sm rounded ${kind===k?'bg-blue-500 text-white':'bg-zinc-200 dark:bg-zinc-800'}`}>{k}</button>
        )}
        <button onClick={() => start(3)} disabled={loading} className="ml-auto px-3 py-1 text-sm bg-purple-500 text-white rounded">
          {loading ? '생성 중...' : '✨ AI 초안 3개'}
        </button>
      </div>

      {drafts.length > 0 && (
        <div className="p-3 border-2 border-purple-400 rounded">
          <h4 className="text-sm font-semibold mb-2">AI 초안 (저장 전)</h4>
          {drafts.map((d, i) => (
            <div key={i} className="mb-2 text-xs p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
              <div><strong>Q:</strong> {d.question}</div>
              <div><strong>SQL:</strong> <code>{d.sql || d.sqlTemplate}</code></div>
              <div><strong>Why:</strong> {d.why}</div>
              <button className="mt-1 text-xs px-2 py-0.5 bg-green-500 text-white rounded"
                onClick={async () => {
                  await fetch(`/api/ai-tables/${activeSite}/${activeTable}/examples`, {
                    method: 'POST', body: JSON.stringify({ ...d, source: 'ai-draft' }),
                    headers: { 'Content-Type': 'application/json' }
                  });
                  onChange();
                }}>저장</button>
            </div>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {filtered.map((ex: any) => (
          <li key={ex.id} className="p-2 border rounded text-sm">
            <div><strong>Q:</strong> {ex.question}</div>
            <code className="block text-xs bg-zinc-100 dark:bg-zinc-900 p-1 rounded my-1">{ex.sql || ex.sqlTemplate}</code>
            <div className="text-xs text-zinc-500">Why: {ex.why}</div>
          </li>
        ))}
      </ul>

      <FeedbackQueueSection onChange={onChange} />
    </div>
  );
}
```

File `src/app/settings/ai-tables/_components/feedback/FeedbackQueueSection.tsx`:
```tsx
'use client';
import useSWR from 'swr';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
export default function FeedbackQueueSection({ onChange }: { onChange: () => void }) {
  const { activeSite, activeTable } = useAiTablesStore();
  const { data, mutate } = useSWR(activeTable ? ['fbq', activeSite, activeTable] : null,
    () => fetch(`/api/ai-tables/${activeSite}/${activeTable}/feedback-queue`).then(r => r.json()));
  if (!data?.queue?.length) return null;
  return (
    <div className="mt-4 p-3 border rounded">
      <h3 className="font-semibold mb-2">🔔 승격 대기 ({data.queue.length})</h3>
      {data.queue.map((q: any) => (
        <div key={q.id} className="text-xs mb-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded">
          <div>{q.question}</div>
          <code className="block my-1">{q.sql}</code>
          <button className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
            onClick={async () => {
              await fetch(`/api/ai-tables/${activeSite}/${activeTable}/feedback-queue/${q.id}/promote`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind: 'exact', question: q.question, sql: q.sql, why: '(승격됨)' }),
              });
              mutate(); onChange();
            }}>승격</button>
        </div>
      ))}
    </div>
  );
}
```

### Task 3b.8: Prompt Preview API + Tab

**Files:**
- Create: `src/app/api/ai-tables/[site]/[table]/preview/route.ts`
- Create: `src/app/settings/ai-tables/_components/tabs/PromptPreviewTab.tsx`

- [ ] **Step 1: preview API**

File `src/app/api/ai-tables/[site]/[table]/preview/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { buildStage1Prompt } from '@/lib/ai-tables/merged-context';
import { estimateTokens } from '@/lib/ai-tables/tokenizer';

export async function GET(_req: Request, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const compactBlock = await buildStage1Prompt(site as any, [table]);
  return NextResponse.json({ compactBlock, estimatedTokens: estimateTokens(compactBlock) });
}
```

- [ ] **Step 2: PromptPreviewTab**

File `src/app/settings/ai-tables/_components/tabs/PromptPreviewTab.tsx`:
```tsx
'use client';
import useSWR from 'swr';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
export default function PromptPreviewTab() {
  const { activeSite, activeTable } = useAiTablesStore();
  const { data } = useSWR(activeTable ? ['preview', activeSite, activeTable] : null,
    () => fetch(`/api/ai-tables/${activeSite}/${activeTable}/preview`).then(r => r.json()));
  if (!data) return <div>로딩...</div>;
  return (
    <div>
      <div className="text-sm text-zinc-500 mb-2">예상 토큰: <strong>{data.estimatedTokens}</strong></div>
      <pre className="p-3 bg-zinc-100 dark:bg-zinc-900 rounded text-xs overflow-x-auto">{data.compactBlock}</pre>
    </div>
  );
}
```

### Task 3b.9: Stage 1 매칭 캐스케이드 (/ai-chat 전환)

**Files:**
- Create: `src/lib/ai-tables/example-matcher.ts`
- Create: `src/lib/ai-tables/slot-extractor.ts`
- Modify: `src/app/api/ai-chat/stream/route.ts` (캐스케이드 분기 훅 삽입)

- [ ] **Step 1: example-matcher.ts**

File `src/lib/ai-tables/example-matcher.ts`:
```typescript
import type { Example, TableMeta } from './types';

export interface MatchResult {
  example: Example;
  score: number;                    // 0~1
  tableName: string;
}

export function matchExamples(question: string, tables: Array<{ name: string; meta: TableMeta }>): MatchResult[] {
  const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length >= 2);
  const out: MatchResult[] = [];
  for (const { name, meta } of tables) {
    for (const ex of meta.examples) {
      const exWords = ex.question.toLowerCase().split(/\s+/);
      const overlap = qWords.filter(w => exWords.some(e => e.includes(w) || w.includes(e))).length;
      const score = overlap / Math.max(qWords.length, 1);
      if (score > 0) out.push({ example: ex, score, tableName: name });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 2: slot-extractor.ts (간단 버전 — LLM 호출 자리만)**

File `src/lib/ai-tables/slot-extractor.ts`:
```typescript
import type { Example } from './types';

export async function extractSlots(question: string, ex: Example): Promise<Record<string, string>> {
  // v1: 키워드 기반 간단 추출. v2에서 소형 LLM 호출로 확장.
  const out: Record<string, string> = {};
  for (const slot of ex.slots ?? []) {
    if (slot.default) out[slot.name] = slot.default;
    for (const alias of slot.aliases ?? []) {
      const m = question.match(new RegExp(`${alias}\\s*[:=]?\\s*(\\S+)`));
      if (m) out[slot.name] = m[1];
    }
  }
  return out;
}
```

- [ ] **Step 3: /ai-chat 스트림에 매칭 훅 삽입 (Phase 1.0 최소)**

Phase 3b 초기엔 matching은 **로깅만** (진짜 분기는 v2에서). 확장 지점만 확보:

Edit `src/app/api/ai-chat/stream/route.ts` — context-selector 호출 직후:
```typescript
// Stage 1 matching preview (현재는 로깅만 — 실제 분기는 v2)
try {
  const { matchExamples } = await import('@/lib/ai-tables/example-matcher');
  const { loadTables } = await import('@/lib/ai-tables/store');
  const tables = await loadTables();
  const tableMetas = selection.tables
    .map(n => ({ name: n, meta: tables.sites[selection.site]?.tables[n] }))
    .filter(t => t.meta);
  const matches = matchExamples(userQuestion, tableMetas as any);
  if (matches.length) console.log(`[ai-chat] top match: ${matches[0].tableName}.${matches[0].example.id} score=${matches[0].score}`);
} catch (e) { /* 무시 */ }
```

### Task 3b.10: Filters/Joins + Dictionary + 컬럼 bulk API

**Files:**
- Create: `src/app/api/ai-tables/[site]/[table]/columns/bulk/route.ts`
- Create: `src/app/settings/ai-tables/_components/tabs/FiltersJoinsTab.tsx`
- Create: `src/app/settings/ai-tables/_components/tabs/DictionaryTab.tsx`

- [ ] **Step 1: bulk API**

File `src/app/api/ai-tables/[site]/[table]/columns/bulk/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadTables, saveTables, loadDomains, saveDomains } from '@/lib/ai-tables/store';

export async function POST(req: NextRequest, { params }: { params: Promise<{ site: string; table: string }> }) {
  const { site, table } = await params;
  const { columns, action, value } = await req.json();
  const tables = await loadTables();
  const meta = tables.sites[site as any]?.tables[table];
  if (!meta) return NextResponse.json({ error: 'not found' }, { status: 404 });
  meta.columnOverrides ??= {};
  let updated = 0;

  for (const col of columns) {
    meta.columnOverrides[col] ??= {};
    if (action === 'set_priority') meta.columnOverrides[col].priority = value;
    else if (action === 'set_exclude') meta.columnOverrides[col].excludeFromPrompt = !!value;
    else if (action === 'assign_domain') {
      const domains = await loadDomains();
      const d = domains.domains.find(x => x.id === value);
      if (d && !d.members.includes(col)) { d.members.push(col); await saveDomains(domains); }
    }
    updated++;
  }
  await saveTables(tables);
  return NextResponse.json({ ok: true, updated });
}
```

- [ ] **Step 2: FiltersJoinsTab + DictionaryTab (간단 편집 UI)**

File `src/app/settings/ai-tables/_components/tabs/FiltersJoinsTab.tsx`:
```tsx
'use client';
import { useState } from 'react';
import { useAiTablesStore } from '../../_hooks/useAiTablesStore';
import { api } from '../../_lib/api-client';
export default function FiltersJoinsTab({ data, onChange }: { data: any; onChange: () => void }) {
  const { activeSite, activeTable } = useAiTablesStore();
  const [notes, setNotes] = useState(data.meta.businessNotes ?? '');
  const [keywords, setKeywords] = useState((data.meta.keywords ?? []).join(', '));
  const save = async () => {
    await api.patchTable(activeSite, activeTable!, { businessNotes: notes, keywords: keywords.split(',').map((s: string) => s.trim()).filter(Boolean) });
    onChange();
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm mb-1">키워드 (쉼표 구분)</label>
        <input className="w-full px-2 py-1 border rounded" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1">비즈니스 노트</label>
        <textarea className="w-full px-2 py-1 border rounded h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm" onClick={save}>저장</button>
    </div>
  );
}
```

File `src/app/settings/ai-tables/_components/tabs/DictionaryTab.tsx`:
```tsx
'use client';
export default function DictionaryTab({ data }: { data: any }) {
  const byDomain: Record<string, string[]> = {};
  for (const c of data.resolvedColumns) {
    if (c.domainId) (byDomain[c.domainId] ??= []).push(c.name);
  }
  return (
    <div className="space-y-2 text-sm">
      {Object.entries(byDomain).map(([id, cols]) => (
        <div key={id} className="p-2 border rounded">
          <div className="font-semibold">📚 {id}</div>
          <div className="text-xs font-mono">{cols.join(', ')}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: TableDetail 탭 배열 확장**

Edit `TableDetail.tsx` — TABS 배열에 추가:
```typescript
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'columns', label: 'Columns' },
  { id: 'dictionary', label: 'Dictionary' },
  { id: 'filters-joins', label: 'Filters/Joins' },
  { id: 'examples', label: 'Examples' },
  { id: 'prompt', label: 'Prompt Preview' },
  { id: 'history', label: 'History' },
] as const;
// ... 각 탭 id별 import 및 렌더
```

### Task 3b.11: Phase 3b 종합 QA + 커밋

- [ ] **Step 1: 수동 QA 체크리스트**

```bash
npm run dev
```

- [ ] `/settings/ai-tables` — 전체 페이지 진입
- [ ] Examples 탭 → AI 초안 버튼 → 3개 SSE 초안 받아 저장
- [ ] Examples 탭 → 라이브 프리뷰 실행 → 결과 10행 표시
- [ ] Prompt Preview 탭 → compact 블록 + 토큰 수 표시
- [ ] Columns 탭 → 여러 컬럼 체크 → 일괄 제외 → tables.json 반영
- [ ] 도메인 모드 → 자동 제안 → 수동 승인
- [ ] `/ai-chat`에서 좋아요 → 피드백 큐에 적립 → 페이지에서 승격

- [ ] **Step 2: 테스트 실행**

```bash
npx jest src/lib/ai-tables/__tests__/
npx tsc --noEmit
```

Expected: 모두 pass

- [ ] **Step 3: 커밋**

```bash
git add src/ 
git commit -m "feat(ai-tables): Phase 3b 고급 기능 - AI 초안/라이브 프리뷰/도메인/피드백/프리뷰"
```

---

## Phase 4: 레거시 정리

목표: Phase 3b 안정화 1~2주 후 기존 레거시 자산 제거. 파일 수/복잡도 감소.

### Task 4.1: 안정화 기간 검증

- [ ] **Step 1: Phase 3b 커밋 후 1~2주 운영 확인**

체크:
- [ ] `/ai-chat` 일상 사용 이슈 없음
- [ ] `/settings/ai-tables` 일상 편집 이슈 없음
- [ ] 피드백 승격 루프가 실제로 누적됨
- [ ] DDL 이력 파일이 기대대로 생성됨

### Task 4.2: 레거시 파일 제거

- [ ] **Step 1: 스냅샷 커밋 (보존용)**

```bash
git add data/ai-context/catalog.json data/ai-context/tables/
git commit -m "chore: 레거시 catalog.json + tables/*.md 최종 스냅샷 (Phase 4 제거 직전)"
```

- [ ] **Step 2: 레거시 파일 제거**

```bash
rm data/ai-context/catalog.json
rm -r data/ai-context/tables/
rm scripts/extract-schema-context.mjs
rm scripts/generate-table-doc-from-db.mjs
```

- [ ] **Step 3: context-loader-legacy.ts 제거 (있었다면)**

```bash
rm -f src/lib/ai/context/context-loader-legacy.ts
```

- [ ] **Step 4: schema-context.ts SCHEMA const 제거 → getSchema()만 남김**

Edit `src/lib/ai/schema-context.ts`:
```typescript
// SCHEMA const 삭제
// getSchema() 함수만 유지
// import 경로 변경 필요 시 해당 파일들도 업데이트
```

- [ ] **Step 5: 영향받는 import 확인 및 수정**

```bash
grep -rn "from '@/lib/ai/schema-context'" src/
```

`SCHEMA`를 직접 참조하던 곳은 `await getSchema()`로 전환.

### Task 4.3: 최종 검증 + 커밋

- [ ] **Step 1: 전체 테스트**

```bash
npm run build
npx jest
npx tsc --noEmit
```

Expected: 빌드 성공, 모든 테스트 pass

- [ ] **Step 2: 수동 QA**

- [ ] `/ai-chat` 3개 질문 응답 정상
- [ ] `/settings/ai-tables` 진입/편집 정상
- [ ] 마이그레이션 스크립트 없이 신규 테이블 추가 시 `↻ DB 동기화`로 반영됨

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "chore(ai-tables): Phase 4 레거시 제거 (catalog.json, tables/, extract-schema-context.mjs)"
```

---

## Self-Review

**1. Spec 커버리지 검증**:
- ✅ Q1~Q17 의사결정 모두 반영 (Phase 0~3에 분산)
- ✅ §4 데이터 모델 → Phase 0.6 types.ts + Phase 1 마이그레이션
- ✅ §5 3단 레이아웃 → Phase 3a.8~3a.9
- ✅ §6 8 API 그룹 → Phase 3a/3b에 분산
- ✅ §7 시나리오 A~F → Phase 3a/3b 전반
- ✅ §8 Phase 플랜 → 본 계획의 Phase 0~4
- ✅ §9 파일 구조 → 각 Task의 Files 섹션
- ✅ §10 테스트 → store.test / domain-resolver.test / prompt-renderer.test / ddl-executor.test / sql-table-parser.test
- ✅ §11 의존성 → Phase 0.3, 0.4
- ✅ §12 성능 목표 → compact 포맷 + estimatedTokens 측정
- ✅ §13 오픈 이슈 → Phase 0.1, 0.2에서 해결
- ✅ §14 v1 범위 → Phase 3b까지 완료

**2. Placeholder 스캔**: "TODO"/"TBD" 없음. 일부 "간단 버전", "v2에서 확장" 표현은 범위 제한을 명시한 것으로 Phase 3b 내 작동하는 코드 동반.

**3. Type 일관성**: `ExampleKind`, `ColumnDecode`, `TableMeta` 등 Phase 0.6에 정의된 타입이 모든 API/UI에서 일관되게 사용.

**4. SUBAGENT 실행 안정성**: 각 Task의 Step이 2~5분 단위로 나뉘어 있고, 각 Phase 끝에 git commit 경계 명시. 독립 실행 가능.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-ai-tables-training.md`. Two execution options:**

**1. Subagent-Driven (권장)** — 각 Task마다 fresh subagent 디스패치. Task 간 리뷰 체크포인트. 복잡도 높은 Phase 3a/3b에 유리.

**2. Inline Execution** — 현 세션에서 executing-plans 스킬로 batch 실행. Phase 0~2는 inline이 빠르고 효율적.

**권장 혼합**: 
- Phase 0~2 = Inline (토큰 효율, 연속성)
- Phase 3a/3b = Subagent-Driven (복잡도 대응, 독립 리뷰)
- Phase 4 = Inline (간단한 정리)

어느 방식으로 진행하시겠어요 오빠?
