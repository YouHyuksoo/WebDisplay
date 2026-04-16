# AI 챗 컨텍스트 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI 챗이 사용자 질문에 맞는 테이블/도메인만 선별 로드하여 토큰을 절약하면서도 정확한 SQL을 생성하고, 멀티 사이트 쿼리를 지원하는 컨텍스트 시스템 구축

**Architecture:** catalog.json(~2K토큰) 항상 주입 → Stage 0 LLM 호출로 관련 테이블/도메인 선별 → 해당 마크다운만 로드하여 Stage 1 SQL 생성에 주입. site 필드로 멀티 사이트 `executeQueryByProfile` 분기.

**Tech Stack:** Next.js 15 (App Router), TypeScript, gray-matter (frontmatter 파싱), Oracle DB (oracledb)

---

## Task 1: 컨텍스트 파일 구조 생성 + catalog.json 스캐폴딩

**Files:**
- Create: `scripts/generate-ai-catalog.mjs`
- Create: `data/ai-context/catalog.json`
- Create: `data/ai-context/tables/` (디렉토리)
- Create: `data/ai-context/domains/` (디렉토리)
- Create: `data/ai-context/sites/site-profiles.md`

- [ ] **Step 1: generate-ai-catalog.mjs 스크립트 작성**

기존 `schema-context.ts`의 SCHEMA 객체를 import하여 테이블별 .md 파일 + catalog.json을 자동 생성하는 Node.js 스크립트.

```javascript
/**
 * @file scripts/generate-ai-catalog.mjs
 * @description schema-context.ts의 SCHEMA 데이터를 읽어 data/ai-context/ 하위에
 *   테이블별 .md + catalog.json을 생성한다.
 */
import fs from 'fs';
import path from 'path';

const SCHEMA_FILE = path.join(process.cwd(), 'src', 'lib', 'ai', 'schema-context.ts');
const OUT_DIR = path.join(process.cwd(), 'data', 'ai-context');
const TABLES_DIR = path.join(OUT_DIR, 'tables');
const DOMAINS_DIR = path.join(OUT_DIR, 'domains');
const SITES_DIR = path.join(OUT_DIR, 'sites');

// schema-context.ts에서 SCHEMA 객체를 정규식으로 파싱
function parseSchemaTs() {
  const src = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  const tableNames = [];
  const regex = /^\s+'([A-Z_][A-Z0-9_]+)':\s*\{/gm;
  let m;
  while ((m = regex.exec(src)) !== null) {
    tableNames.push(m[1]);
  }

  const tables = {};
  for (const name of tableNames) {
    // description 추출
    const descRe = new RegExp(`'${name}':\\s*\\{\\s*description:\\s*'([^']*)'`);
    const descMatch = src.match(descRe);
    const description = descMatch?.[1] || '';

    // columns 추출 (간략)
    const colRe = new RegExp(
      `'${name}':[\\s\\S]*?columns:\\s*\\{([\\s\\S]*?)\\}\\s*,?\\s*(?:sampleQueries|enums|\\})`
    );
    const colMatch = src.match(colRe);
    const colBlock = colMatch?.[1] || '';

    const columns = [];
    const colLineRe = /'([A-Z_][A-Z0-9_]*)'\s*:\s*\{\s*type:\s*'([^']+)',\s*nullable:\s*(true|false),\s*comment:\s*(?:'([^']*)'|null)/g;
    let cm;
    while ((cm = colLineRe.exec(colBlock)) !== null) {
      columns.push({
        name: cm[1],
        type: cm[2],
        nullable: cm[3] === 'true',
        comment: cm[4] || null,
      });
    }

    tables[name] = { description, columns };
  }
  return tables;
}

function generateTableMd(tableName, spec) {
  const colRows = spec.columns
    .map((c) => `| ${c.name} | ${c.type} | ${c.comment || ''} |`)
    .join('\n');

  return `---
name: ${tableName}
site: default
description: ${spec.description || `${tableName} 테이블`}
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
${colRows}

## 자주 쓰는 JOIN


## 예제 쿼리

`;
}

function generateCatalog(tables) {
  const tableEntries = Object.entries(tables).map(([name, spec]) => ({
    name,
    site: 'default',
    summary: spec.description || `${name} 테이블`,
    tags: inferTags(name),
  }));

  return {
    tables: tableEntries,
    domains: [],
    sites: [
      { key: 'default', description: '현재 activeProfile (config/database.json)', note: '사용자가 사이트를 명시하지 않으면 항상 이것 사용' },
      { key: '멕시코VD외부', description: '멕시코 VD 사이트 (SMMEXPDB)', note: "사용자가 '멕시코VD', 'VD사이트' 등을 명시할 때" },
      { key: '베트남VD외부', description: '베트남 VD 사이트 (SMVNPDB)', note: "사용자가 '베트남', '베트남VD' 등을 명시할 때" },
    ],
  };
}

function inferTags(tableName) {
  const tags = [];
  if (tableName.startsWith('LOG_')) tags.push('로그', '검사');
  if (tableName.startsWith('IP_PRODUCT')) tags.push('생산');
  if (tableName.startsWith('IM_ITEM')) tags.push('자재');
  if (tableName.startsWith('ISYS_')) tags.push('시스템');
  if (tableName.startsWith('ICOM_')) tags.push('설비');
  if (tableName.startsWith('IMCN_')) tags.push('기계');
  if (tableName.includes('SOLDER')) tags.push('납땜');
  if (tableName.includes('MSL')) tags.push('MSL');
  if (tableName.includes('BAKING')) tags.push('베이킹');
  if (tableName.includes('SMT')) tags.push('SMT');
  if (tableName.includes('QC') || tableName.includes('WORK_QC')) tags.push('품질');
  return tags.length > 0 ? tags : ['기타'];
}

// --- main ---
const tables = parseSchemaTs();
console.log(`Parsed ${Object.keys(tables).length} tables from schema-context.ts`);

[TABLES_DIR, DOMAINS_DIR, SITES_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

// 테이블 .md 생성
for (const [name, spec] of Object.entries(tables)) {
  const md = generateTableMd(name, spec);
  fs.writeFileSync(path.join(TABLES_DIR, `${name}.md`), md, 'utf-8');
}

// catalog.json 생성
const catalog = generateCatalog(tables);
fs.writeFileSync(path.join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');

console.log(`Generated ${Object.keys(tables).length} table .md files`);
console.log(`Generated catalog.json with ${catalog.tables.length} table entries`);
```

- [ ] **Step 2: site-profiles.md 작성**

```markdown
---
name: site-profiles
description: DB 사이트별 접속 프로필 정보
---

## DB 사이트 프로필

| site 키 | DB 프로필명 | 서비스명 | 용도 |
|---|---|---|---|
| default | (activeProfile) | config/database.json 참조 | 현재 접속 사이트. 명시 없으면 항상 이것 |
| 멕시코전장내부 | 멕시코전장내부 | SVEHICLEPDB | 멕시코전장 내부망 |
| 멕시코전장외부 | 멕시코전장외부 | SVEHICLEPDB | 멕시코전장 외부망 |
| 멕시코VD외부 | 멕시코VD외부 | SMMEXPDB | 멕시코VD |
| 베트남VD내부 | 베트남VD내부 | SMVNPDB | 베트남VD 내부망 |
| 베트남VD외부 | 베트남VD외부 | SMVNPDB | 베트남VD 외부망 |

## site 판별 규칙
- 사용자가 사이트를 명시하지 않으면 반드시 "default" 반환
- "베트남", "SMVNPDB" → "베트남VD외부"
- "멕시코VD", "SMMEXPDB" → "멕시코VD외부"
- "전장", "SVEHICLEPDB" → "default" (현재 접속 사이트)
```

- [ ] **Step 3: 스크립트 실행하여 초기 파일 생성**

Run: `node scripts/generate-ai-catalog.mjs`
Expected: `data/ai-context/tables/` 에 36개 .md 파일 + `data/ai-context/catalog.json` 생성

- [ ] **Step 4: 생성된 파일 검증**

Run: `ls data/ai-context/tables/ | wc -l && cat data/ai-context/catalog.json | head -20`
Expected: 36개 파일, catalog.json에 tables 배열 확인

- [ ] **Step 5: 커밋**

```bash
git add scripts/generate-ai-catalog.mjs data/ai-context/
git commit -m "feat(ai): 컨텍스트 파일 구조 생성 — catalog.json + 테이블 .md 초기 스캐폴딩"
```

---

## Task 2: 핵심 테이블 .md 설명 보강

**Files:**
- Modify: `data/ai-context/tables/IP_PRODUCT_WORKSTAGE_IO.md`
- Modify: `data/ai-context/tables/IP_PRODUCT_LINE_TARGET.md`
- Modify: `data/ai-context/tables/IP_PRODUCT_RUN_CARD.md`
- Modify: `data/ai-context/tables/IP_PRODUCT_WORK_QC.md`
- Modify: `data/ai-context/tables/LOG_AOI.md`
- Modify: `data/ai-context/tables/LOG_ICT.md`
- Modify: `data/ai-context/tables/LOG_EOL.md`
- Modify: `data/ai-context/tables/LOG_SPI.md`
- Modify: `data/ai-context/tables/IB_SMT_CHECKHIST.md`
- Modify: `data/ai-context/tables/ISYS_BASECODE.md`
- Modify: `data/ai-context/catalog.json` (summary/tags 보강)

- [ ] **Step 1: 기존 API 코드에서 쿼리 패턴 수집**

프로젝트의 `src/app/api/mxvc/` 하위 API들에서 사용하는 실제 SQL 쿼리를 참고하여
각 핵심 테이블의 description, related_tables, JOIN 패턴, 예제 쿼리를 채운다.

각 .md 파일의 frontmatter `description`과 `related_tables`를 보강하고,
`## 자주 쓰는 JOIN`, `## 예제 쿼리` 섹션을 실제 패턴으로 채운다.

예시 — `IP_PRODUCT_WORKSTAGE_IO.md`:
```markdown
---
name: IP_PRODUCT_WORKSTAGE_IO
site: default
description: 공정별 입출고 실적. 투입(W310), 포장(W220), 검사 등 각 공정 통과 시 1행 기록.
related_tables: [IP_PRODUCT_LINE_TARGET, IP_PRODUCT_RUN_CARD, IP_PRODUCT_MODEL_MASTER]
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| LINE_CODE | VARCHAR2(10) | 라인코드 (F_GET_LINE_NAME(LINE_CODE,1)로 변환) |
| WORKSTAGE_CODE | VARCHAR2(10) | 공정코드: W310=투입, W220=포장, W110=SMD, W210=PBA |
| IO_QTY | NUMBER | 입출고 수량 |
| ACTUAL_DATE | VARCHAR2(10) | 작업일자 (F_GET_WORK_ACTUAL_DATE로 비교) |
| SHIFT_CODE | VARCHAR2(1) | 시프트: A=주간, B=야간 |
| IO_DATE | DATE | 입출고 시각 (KST 저장, 로컬 = IO_DATE-2/24) |
| MODEL_NAME | VARCHAR2(50) | 모델명 |
| RUN_NO | VARCHAR2(30) | RUN 번호 |

## 자주 쓰는 JOIN
- 목표 대비 실적: `JOIN IP_PRODUCT_LINE_TARGET t ON t.LINE_CODE = io.LINE_CODE AND t.PLAN_DATE = io.ACTUAL_DATE AND NVL(t.SHIFT_CODE,'X') = NVL(io.SHIFT_CODE,'X')`
- 모델 정보: `JOIN IP_PRODUCT_MODEL_MASTER m ON m.MODEL_NAME = io.MODEL_NAME`

## 예제 쿼리
-- 라인별 시프트별 오늘 포장 실적
SELECT F_GET_LINE_NAME(LINE_CODE,1) AS LINE_NAME, SHIFT_CODE, SUM(IO_QTY) AS QTY
  FROM IP_PRODUCT_WORKSTAGE_IO
 WHERE WORKSTAGE_CODE = 'W220'
   AND ACTUAL_DATE = F_GET_WORK_ACTUAL_DATE(SYSDATE, 'A')
   AND ORGANIZATION_ID = 1
 GROUP BY LINE_CODE, SHIFT_CODE
 ORDER BY LINE_NAME
```

- [ ] **Step 2: 나머지 핵심 테이블도 같은 패턴으로 보강**

프로젝트 API 코드를 참조하여 LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI,
IP_PRODUCT_WORK_QC, IP_PRODUCT_RUN_CARD, IP_PRODUCT_LINE_TARGET,
IB_SMT_CHECKHIST, ISYS_BASECODE의 description, JOIN, 예제 쿼리를 채운다.

- [ ] **Step 3: catalog.json의 summary와 tags 보강**

각 테이블의 보강된 description을 catalog.json의 summary에 반영.
tags도 업무 키워드 추가 (예: IP_PRODUCT_WORKSTAGE_IO → ["생산", "실적", "IO", "공정", "포장", "투입"]).

- [ ] **Step 4: 커밋**

```bash
git add data/ai-context/
git commit -m "feat(ai): 핵심 테이블 컨텍스트 문서 보강 — JOIN 패턴, 예제 쿼리, 태그"
```

---

## Task 3: 도메인 문서 작성

**Files:**
- Create: `data/ai-context/domains/traceability.md`
- Create: `data/ai-context/domains/fpy.md`
- Create: `data/ai-context/domains/process-history.md`
- Create: `data/ai-context/domains/production-kpi.md`
- Create: `data/ai-context/domains/spc.md`
- Create: `data/ai-context/domains/repair-status.md`
- Create: `data/ai-context/domains/inspect-result.md`
- Modify: `data/ai-context/catalog.json` (domains 배열 추가)

- [ ] **Step 1: 추적성(traceability) 도메인 문서 작성**

`src/app/api/mxvc/traceability/route.ts`의 JSDoc + 쿼리 패턴을 참고.

```markdown
---
name: traceability
description: 바코드(PID) 기반 제품 추적성 분석 — 공정 타임라인, 자재 이력
tables: [IP_PRODUCT_2D_BARCODE, IP_PRODUCT_RUN_CARD, IP_PRODUCT_MODEL_MASTER, IP_PRODUCT_WORK_QC, IP_PRODUCT_WORKSTAGE_IO, LOG_AOI, LOG_ICT, LOG_EOL, LOG_SPI, LOG_COATINGVISION, LOG_LCR, LOG_DOWNLOAD]
---

## 업무 설명
제품 바코드(PID)를 입력하면 해당 제품이 거쳐간 모든 공정 이벤트를 시간순으로 조회한다.
마스터 정보(모델명, RUN번호) + 각 LOG_* 테이블에서 검사 결과를 수집.

## 핵심 흐름
1. PID → IP_PRODUCT_2D_BARCODE에서 RUN_NO 조회
2. RUN_NO → IP_PRODUCT_RUN_CARD에서 모델 정보
3. MODEL_NAME → IP_PRODUCT_MODEL_MASTER에서 상세 정보
4. 각 LOG_ 테이블에서 PID/BARCODE 매칭 이벤트 수집
5. IP_PRODUCT_WORK_QC, IP_PRODUCT_WORKSTAGE_IO에서도 해당 PID 이벤트 수집
6. 전체를 timestamp 오름차순 정렬하여 타임라인 구성

## JOIN 패턴
-- 바코드 → 런카드 → 모델
SELECT b.PID, b.RUN_NO, r.MODEL_NAME, m.ITEM_CODE
  FROM IP_PRODUCT_2D_BARCODE b
  JOIN IP_PRODUCT_RUN_CARD r ON r.RUN_NO = b.RUN_NO
  JOIN IP_PRODUCT_MODEL_MASTER m ON m.MODEL_NAME = r.MODEL_NAME
 WHERE b.PID = :barcode

## 주의사항
- LOG_ 테이블마다 바코드 컬럼명이 다름 (PID, BARCODE, SERIAL_NO, PRODUCT_2D_BARCODE 등)
- LOG_ALARM, LOG_ERROR, LOG_MOUNTER, LOG_PROCESS는 추적성에서 제외
- LOG_REFLOW_01, LOG_REFLOW_02도 제외 (별도 시간범위 조회)
```

- [ ] **Step 2: 공정통과이력(process-history) 도메인 문서 작성**

`src/app/api/mxvc/process-history/route.ts` 참고.

```markdown
---
name: process-history
description: 공정통과이력 — PID별 각 공정(WORKSTAGE) 통과 여부 피벗 조회
tables: [IQ_MACHINE_INSPECT_RESULT]
---

## 업무 설명
날짜 범위와 PID로 조회하면, 각 PID가 어떤 공정(WORKSTAGE_CODE)을 통과했는지
피벗 형태로 보여준다. 검사기계(MACHINE_CODE), 검사결과(INSPECT_RESULT), 검사일시를 포함.

## 핵심 테이블
IQ_MACHINE_INSPECT_RESULT: 공정별 검사 결과 기록
- PID: 제품 바코드
- WORKSTAGE_CODE: 공정코드 (열 피벗의 키)
- MACHINE_CODE: 검사 기계
- INSPECT_RESULT: 검사결과 (P=합격, F=불합격)
- INSPECT_DATE: 검사일시 (VARCHAR2 'YYYY/MM/DD HH24:MI:SS')
- IS_LAST: 최종 검사 여부 (Y/N)

## 쿼리 패턴
-- 날짜 범위 + IS_LAST 필터
SELECT t.PID, F_GET_MODEL_NAME_BY_PID(t.PID) AS MODEL_NAME,
       t.WORKSTAGE_CODE, F_GET_WORKSTAGE_NAME(t.WORKSTAGE_CODE) AS WORKSTAGE_NAME,
       t.MACHINE_CODE, t.INSPECT_RESULT, t.INSPECT_DATE
  FROM IQ_MACHINE_INSPECT_RESULT t
 WHERE t.INSPECT_DATE BETWEEN :dateFrom AND :dateTo
   AND t.IS_LAST = :isLast

## 주의사항
- INSPECT_DATE는 VARCHAR2 타입 — 문자열 범위 비교 사용
- 서버 측에서 PID 기준 피벗 처리 (Oracle 동적 PIVOT 미사용)
```

- [ ] **Step 3: FPY, 생산KPI, SPC, 수리현황, 검사결과 도메인 문서 작성**

각각 해당 API 코드를 참고하여 같은 형식으로 작성:
- `fpy.md` — `src/app/api/mxvc/fpy/route.ts` 참고
- `production-kpi.md` — `src/app/api/mxvc/production-kpi/route.ts` 참고
- `spc.md` — `src/app/api/mxvc/spc/route.ts` 참고
- `repair-status.md` — `src/app/api/mxvc/repair-status/route.ts` 참고
- `inspect-result.md` — `src/app/api/mxvc/inspect-result/route.ts` 참고

- [ ] **Step 4: catalog.json에 domains 배열 추가**

```json
{
  "domains": [
    { "name": "traceability", "summary": "바코드(PID) 기반 제품 추적성 분석 — 공정 타임라인, 자재 이력", "tags": ["추적", "바코드", "이력", "PID", "타임라인"] },
    { "name": "process-history", "summary": "공정통과이력 — PID별 각 공정 통과 여부 피벗", "tags": ["공정", "이력", "검사", "PID", "피벗"] },
    { "name": "fpy", "summary": "First Pass Yield 1차 양품률 분석", "tags": ["FPY", "양품률", "품질", "수율"] },
    { "name": "production-kpi", "summary": "생산 KPI — 목표 대비 실적, 달성률", "tags": ["생산", "KPI", "목표", "실적", "달성률"] },
    { "name": "spc", "summary": "SPC 관리도 — 통계적 공정 관리", "tags": ["SPC", "관리도", "통계", "공정관리"] },
    { "name": "repair-status", "summary": "수리 현황 — 불량 유형별 수리 진행 상태", "tags": ["수리", "불량", "리페어"] },
    { "name": "inspect-result", "summary": "검사 결과 — AOI/ICT/EOL 등 공정별 검사 결과 조회", "tags": ["검사", "AOI", "ICT", "EOL", "결과"] }
  ]
}
```

- [ ] **Step 5: 커밋**

```bash
git add data/ai-context/domains/ data/ai-context/catalog.json
git commit -m "feat(ai): 도메인 컨텍스트 문서 7개 작성 — 추적성, FPY, 공정이력 등"
```

---

## Task 4: context-loader.ts — 마크다운 파일 로드 + frontmatter 파싱

**Files:**
- Create: `src/lib/ai/context/context-loader.ts`

- [ ] **Step 1: gray-matter 의존성 설치 여부 확인**

Run: `cd C:/Project/WebDisplay && npm ls gray-matter 2>&1 || echo "NOT_INSTALLED"`

gray-matter가 없으면 설치:
Run: `npm install gray-matter`

- [ ] **Step 2: context-loader.ts 작성**

```typescript
/**
 * @file src/lib/ai/context/context-loader.ts
 * @description data/ai-context/ 에서 catalog.json, 테이블/도메인 .md 파일을 로드한다.
 *   frontmatter는 gray-matter로 파싱하여 메타데이터와 본문을 분리.
 */
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTEXT_DIR = path.join(process.cwd(), 'data', 'ai-context');

export interface CatalogTable {
  name: string;
  site: string;
  summary: string;
  tags: string[];
}

export interface CatalogDomain {
  name: string;
  summary: string;
  tags: string[];
}

export interface CatalogSite {
  key: string;
  description: string;
  note: string;
}

export interface Catalog {
  tables: CatalogTable[];
  domains: CatalogDomain[];
  sites: CatalogSite[];
}

let catalogCache: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (catalogCache) return catalogCache;
  const raw = fs.readFileSync(path.join(CONTEXT_DIR, 'catalog.json'), 'utf-8');
  catalogCache = JSON.parse(raw) as Catalog;
  return catalogCache;
}

export function resetCatalogCache(): void {
  catalogCache = null;
}

export function catalogToPrompt(): string {
  const cat = loadCatalog();
  const tableLines = cat.tables
    .map((t) => `- ${t.name} [${t.site}]: ${t.summary} (${t.tags.join(', ')})`)
    .join('\n');
  const domainLines = cat.domains
    .map((d) => `- ${d.name}: ${d.summary} (${d.tags.join(', ')})`)
    .join('\n');
  const siteLines = cat.sites
    .map((s) => `- ${s.key}: ${s.description} — ${s.note}`)
    .join('\n');
  return `## 테이블 카탈로그\n${tableLines}\n\n## 도메인 카탈로그\n${domainLines}\n\n## 사이트\n${siteLines}`;
}

export interface LoadedDoc {
  meta: Record<string, unknown>;
  content: string;
}

export function loadTableDoc(tableName: string): LoadedDoc | null {
  const filePath = path.join(CONTEXT_DIR, 'tables', `${tableName}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { meta: data, content: content.trim() };
}

export function loadDomainDoc(domainName: string): LoadedDoc | null {
  const filePath = path.join(CONTEXT_DIR, 'domains', `${domainName}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { meta: data, content: content.trim() };
}

export function loadSelectedContext(
  tables: string[],
  domains: string[],
): string {
  const parts: string[] = [];

  for (const t of tables) {
    const doc = loadTableDoc(t);
    if (doc) parts.push(`## ${t}\n${doc.content}`);
  }

  for (const d of domains) {
    const doc = loadDomainDoc(d);
    if (doc) parts.push(`## 도메인: ${d}\n${doc.content}`);
  }

  return parts.join('\n\n');
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/ai/context/context-loader.ts
git commit -m "feat(ai): context-loader — catalog/테이블/도메인 .md 파일 로드 모듈"
```

---

## Task 5: context-selector.ts — Stage 0 LLM 호출로 컨텍스트 선별

**Files:**
- Create: `src/lib/ai/context/context-selector.ts`

- [ ] **Step 1: context-selector.ts 작성**

```typescript
/**
 * @file src/lib/ai/context/context-selector.ts
 * @description Stage 0 — 사용자 질문 + catalog.json을 LLM에 보내
 *   관련 테이블/도메인/사이트를 선별하는 경량 호출.
 */
import { catalogToPrompt, loadCatalog } from './context-loader';
import { getProviderForRuntime } from '@/lib/ai/provider-store';
import { getProvider } from '@/lib/ai/router';
import type { ProviderId } from '@/lib/ai/providers/types';

export interface ContextSelection {
  tables: string[];
  domains: string[];
  site: string;
}

const SELECTOR_SYSTEM_PROMPT = `당신은 MES 데이터베이스 컨텍스트 선별기입니다.
사용자 질문을 읽고, 아래 카탈로그에서 SQL 생성에 필요한 테이블과 도메인을 골라주세요.

## 규칙
1. 반드시 JSON으로만 응답하세요. 다른 텍스트 없이.
2. tables: 필요한 테이블 이름 배열 (카탈로그에 있는 이름만)
3. domains: 관련 도메인 이름 배열 (카탈로그에 있는 이름만)
4. site: DB 사이트 키
   - 사용자가 사이트를 명시하지 않으면 반드시 "default"
   - "베트남", "SMVNPDB" → "베트남VD외부"
   - "멕시코VD", "SMMEXPDB" → "멕시코VD외부"
   - "전장", "SVEHICLEPDB" → "default"
5. 테이블은 최소한으로 선택 (질문에 직접 관련된 것만, 최대 8개)
6. 확실하지 않으면 넓게 선택하되 site는 반드시 "default"

응답 형식:
{"tables":["TABLE_A","TABLE_B"],"domains":["domain_x"],"site":"default"}`;

export async function selectContext(
  userQuestion: string,
  providerId: ProviderId,
  modelId?: string,
): Promise<ContextSelection> {
  const catalog = loadCatalog();
  const catalogPrompt = catalogToPrompt();

  const providerCfg = await getProviderForRuntime(providerId);
  if (!providerCfg?.apiKey) {
    return { tables: [], domains: [], site: 'default' };
  }

  const provider = getProvider(providerId);
  const model = modelId || providerCfg.defaultModelId || provider.listModels()[0];

  const userMsg = `# 카탈로그\n${catalogPrompt}\n\n# 사용자 질문\n${userQuestion}`;

  let responseText = '';
  const stream = provider.chatStream(
    {
      model,
      messages: [{ role: 'user', content: userMsg }],
      systemPrompt: SELECTOR_SYSTEM_PROMPT,
      temperature: 0,
    },
    providerCfg.apiKey,
  );

  for await (const chunk of stream) {
    if (chunk.type === 'token' && chunk.delta) {
      responseText += chunk.delta;
    }
  }

  try {
    const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr) as ContextSelection;

    // 카탈로그에 없는 이름 필터링
    const validTables = new Set(catalog.tables.map((t) => t.name));
    const validDomains = new Set(catalog.domains.map((d) => d.name));
    const validSites = new Set(catalog.sites.map((s) => s.key));

    return {
      tables: (parsed.tables || []).filter((t) => validTables.has(t)),
      domains: (parsed.domains || []).filter((d) => validDomains.has(d)),
      site: validSites.has(parsed.site) ? parsed.site : 'default',
    };
  } catch {
    return { tables: [], domains: [], site: 'default' };
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/ai/context/context-selector.ts
git commit -m "feat(ai): context-selector — Stage 0 LLM 호출로 테이블/도메인/사이트 선별"
```

---

## Task 6: prompt-builder.ts 수정 — 선별된 컨텍스트만 주입

**Files:**
- Modify: `src/lib/ai/context/prompt-builder.ts`

- [ ] **Step 1: BuildPromptOpts에 선별 결과 필드 추가**

```typescript
// 기존 BuildPromptOpts 인터페이스에 추가
export interface BuildPromptOpts {
  stage: 'sql_generation' | 'analysis';
  personaPrompt?: string;
  selectedTables?: string[];
  currentContext: { today: string; serverShift: 'A' | 'B'; userTz: string };
  customSqlPrompt?: string;
  customAnalysisPrompt?: string;
  /** Stage 0에서 선별된 컨텍스트 문서 (있으면 schema-context.ts 대신 사용) */
  selectedContextDocs?: string;
  /** Stage 0에서 판별된 site */
  selectedSite?: string;
}
```

- [ ] **Step 2: buildSystemPrompt 함수에서 선별된 컨텍스트 사용**

기존 `buildSchemaSection(opts.selectedTables)` 호출 부분을 조건 분기:

```typescript
// 5. 스키마 (Stage 1만)
if (opts.stage === 'sql_generation') {
  if (opts.selectedContextDocs) {
    // Stage 0 선별 결과가 있으면 .md 기반 컨텍스트 사용
    sections.push('# 관련 테이블·도메인 상세\n' + opts.selectedContextDocs);
  } else {
    // 폴백: 기존 schema-context.ts 방식
    sections.push('# 사용 가능한 테이블\n' + buildSchemaSection(opts.selectedTables));
  }
}

// 6. site 정보 (Stage 1만, 선별된 경우)
if (opts.stage === 'sql_generation' && opts.selectedSite && opts.selectedSite !== 'default') {
  sections.push(`# DB 사이트\n현재 쿼리 대상: ${opts.selectedSite} (default가 아닌 별도 사이트)`);
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/lib/ai/context/prompt-builder.ts
git commit -m "feat(ai): prompt-builder — 선별된 .md 컨텍스트 주입 지원 (기존 폴백 유지)"
```

---

## Task 7: stream/route.ts 수정 — Stage 0 통합 + 멀티사이트 쿼리 실행

**Files:**
- Modify: `src/app/api/ai-chat/stream/route.ts`

- [ ] **Step 1: import 추가**

```typescript
import { selectContext } from '@/lib/ai/context/context-selector';
import { loadSelectedContext } from '@/lib/ai/context/context-loader';
import { executeQueryByProfile } from '@/lib/db';
```

- [ ] **Step 2: Stage 0 컨텍스트 선별 호출 추가**

기존 `// 3) SQL generation stage.` 앞에 Stage 0 삽입:

```typescript
        // 2.5) Stage 0: 컨텍스트 선별
        send('stage', { stage: 'context_selection' });
        const selection = await selectContext(prompt, providerId, model);
        const contextDocs = loadSelectedContext(selection.tables, selection.domains);
        send('context_selected', {
          tables: selection.tables,
          domains: selection.domains,
          site: selection.site,
        });
```

- [ ] **Step 3: buildSystemPrompt 호출에 선별 결과 전달**

```typescript
        // 3) SQL generation stage.
        const sqlSystemPrompt = await buildSystemPrompt({
          stage: 'sql_generation',
          currentContext: { today, serverShift: getServerShift(), userTz: 'ICT' },
          customSqlPrompt: providerCfg.sqlSystemPrompt || undefined,
          selectedContextDocs: contextDocs || undefined,
          selectedSite: selection.site,
        });
```

- [ ] **Step 4: SQL 실행 부분에 멀티사이트 분기 추가**

기존 `executeAiReadQuery(guard.rewritten)` 호출을 교체:

```typescript
        // 5) Execute SQL (site별 프로필 분기)
        const t0 = Date.now();
        let resultRows: Record<string, unknown>[] = [];
        let execError: string | null = null;

        try {
          if (selection.site === 'default') {
            resultRows = await executeAiReadQuery(guard.rewritten);
          } else {
            resultRows = await executeQueryByProfile(selection.site, guard.rewritten);
          }
        } catch (e) {
          execError = e instanceof Error ? e.message : String(e);
        }
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/ai-chat/stream/route.ts
git commit -m "feat(ai): stream route — Stage 0 컨텍스트 선별 + 멀티사이트 쿼리 실행"
```

---

## Task 8: 프론트엔드 — context_selection 스테이지 표시

**Files:**
- Modify: `src/app/ai-chat/_lib/sse-client.ts` (context_selected 이벤트 처리)
- Modify: `src/app/ai-chat/_components/MessageList.tsx` (선별 정보 표시, 선택적)

- [ ] **Step 1: sse-client.ts에 context_selected 이벤트 핸들링 추가**

기존 SSE 이벤트 핸들러에 `context_selected` 이벤트 추가.
이 이벤트는 UI에서 "어떤 테이블/도메인을 선택했는지" 경량 표시용.

```typescript
// SSE 이벤트 핸들러에 추가
case 'context_selected': {
  const { tables, domains, site } = data;
  onContextSelected?.({ tables, domains, site });
  break;
}
```

콜백 타입:
```typescript
onContextSelected?: (ctx: { tables: string[]; domains: string[]; site: string }) => void;
```

- [ ] **Step 2: 커밋**

```bash
git add src/app/ai-chat/_lib/sse-client.ts
git commit -m "feat(ai): SSE 클라이언트에 context_selected 이벤트 처리 추가"
```

---

## Task 9: 통합 테스트 + 검증

**Files:**
- 없음 (수동 테스트)

- [ ] **Step 1: 개발 서버 시작**

Run: `cd C:/Project/WebDisplay && npm run dev`

- [ ] **Step 2: AI 챗에서 단순 조회 테스트**

질문: "오늘 생산 실적 보여줘"
확인사항:
- 콘솔에서 Stage 0 선별 결과 확인 (IP_PRODUCT_WORKSTAGE_IO 등이 선택되어야 함)
- SQL 생성이 정상적으로 되는지
- site가 "default"인지

- [ ] **Step 3: 복합 분석 테스트**

질문: "이 바코드의 공정 이력을 보여줘: ABC123"
확인사항:
- traceability 도메인이 선택되어야 함
- 관련 LOG_ 테이블들이 선택되어야 함

- [ ] **Step 4: 멀티사이트 테스트 (가능한 경우)**

질문: "베트남 FPY 보여줘"
확인사항:
- site가 "베트남VD외부"로 선택되는지
- executeQueryByProfile로 분기되는지

- [ ] **Step 5: 사이트 미지정 기본값 테스트**

질문: "FPY 보여줘" (사이트 미지정)
확인사항:
- site가 반드시 "default"인지

- [ ] **Step 6: 최종 커밋**

모든 테스트 통과 후 미커밋 파일이 있으면 커밋:

```bash
git add -A
git commit -m "feat(ai): AI 챗 컨텍스트 시스템 완성 — Stage 0 선별 + 멀티사이트 지원"
```
