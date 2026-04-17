/**
 * @file scripts/migrate-to-tables-json.mjs
 * @description 기존 자산 → 신규 4개 파일 마이그레이션 (idempotent).
 *
 *   입력:
 *     data/ai-context/catalog.json     (45개 테이블 메타)
 *     data/ai-context/tables/*.md       (44개 상세 문서)
 *     Oracle DB                          (USER_TAB_COLUMNS + USER_COL_COMMENTS + PK + ISYS_BASECODE)
 *
 *   출력:
 *     data/ai-context/tables.json
 *     data/ai-context/schema-cache.json
 *     data/ai-context/basecode-cache.json
 *     data/ai-context/column-domains.json (자동 제안 시드)
 *
 *   기존 catalog.json + tables/*.md는 **건드리지 않음** (Phase 4에서 별도 제거).
 *
 *   사용법:
 *     node scripts/migrate-to-tables-json.mjs [--profile=<name>] [--dry-run]
 */

import oracledb from 'oracledb';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const ctx = path.join(root, 'data', 'ai-context');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const profileOverride = argv.find(a => a.startsWith('--profile='))?.split('=')[1];

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }
function saveJson(p, data) {
  if (dryRun) { console.log(`   [dry-run] would write ${path.relative(root, p)}`); return; }
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  DB 설정 + 연결                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

function loadDbConfig() {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'config', 'database.json'), 'utf-8'));
  const name = profileOverride || cfg.activeProfile;
  const p = cfg.profiles.find(x => x.name === name);
  if (!p) throw new Error(`profile ${name} not found in config/database.json`);
  return p;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Markdown 파싱 (frontmatter + 예제 섹션)                                     */
/* ────────────────────────────────────────────────────────────────────────── */

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
  const exMatch = body.match(/##\s*예제\s*쿼리\s*\n([\s\S]*?)(?=\n##|$)/);
  if (!exMatch) return [];
  const section = exMatch[1].trim();
  if (!section) return [];
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

/* ────────────────────────────────────────────────────────────────────────── */
/*  tables.json 빌드                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function buildTablesJson(catalog) {
  const out = { version: 1, updatedAt: new Date().toISOString(), sites: {} };
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
      relatedTables: Array.isArray(mdFm.related_tables) ? mdFm.related_tables : [],
      columnOverrides: {},
      examples: mdExamples,
      feedbackQueue: [],
    };
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  schema-cache.json 빌드 (DB 조회)                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function formatType(c) {
  const { DATA_TYPE: t, DATA_LENGTH: len, DATA_PRECISION: p, DATA_SCALE: s } = c;
  if (t === 'NUMBER') return p == null ? 'NUMBER' : s > 0 ? `NUMBER(${p},${s})` : `NUMBER(${p})`;
  if (['VARCHAR2','CHAR','NVARCHAR2','NCHAR'].includes(t)) return `${t}(${len})`;
  return t;
}

async function fetchTableSchema(conn, tableName) {
  const cols = await conn.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE, NULLABLE
       FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t ORDER BY COLUMN_ID`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  if (!cols.rows.length) return null;

  const [cmtRes, tabCmtRes, pkRes] = await Promise.all([
    conn.execute(
      `SELECT COLUMN_NAME, COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t`,
      { t: tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
    conn.execute(
      `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`,
      { t: tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
    conn.execute(
      `SELECT cols.COLUMN_NAME FROM USER_CONSTRAINTS c
         JOIN USER_CONS_COLUMNS cols ON c.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
        WHERE c.TABLE_NAME = :t AND c.CONSTRAINT_TYPE = 'P' ORDER BY cols.POSITION`,
      { t: tableName }, { outFormat: oracledb.OUT_FORMAT_OBJECT }),
  ]);

  const cmap = Object.fromEntries(cmtRes.rows.map(r => [r.COLUMN_NAME, r.COMMENTS]));

  // 주의: ISYS_DUAL_LANGUAGE 실스키마는 UI 번역 사전이라 컬럼 라벨 직결 매핑 불가.
  //       v1에서는 labels를 빈 객체로 두고, v2에서 ENGLISH_TEXT 매칭 규약 정립 후 채움.
  return {
    tableComment: tabCmtRes.rows[0]?.COMMENTS || null,
    pkColumns: pkRes.rows.map(r => r.COLUMN_NAME),
    refreshedAt: new Date().toISOString(),
    columns: cols.rows.map(c => ({
      name: c.COLUMN_NAME,
      type: formatType(c),
      nullable: c.NULLABLE === 'Y',
      comment: cmap[c.COLUMN_NAME] || null,
      labels: {},
    })),
  };
}

async function buildSchemaCache(catalog, conn) {
  const out = { version: 1, refreshedAt: new Date().toISOString(), sites: {} };
  let ok = 0, skip = 0;
  for (const t of catalog.tables) {
    const site = t.site || 'default';
    out.sites[site] ??= { tables: {} };
    const schema = await fetchTableSchema(conn, t.name);
    if (!schema) { skip++; continue; }
    out.sites[site].tables[t.name] = schema;
    ok++;
  }
  console.log(`   schema-cache: ${ok} 테이블 성공, ${skip} 스킵 (DB에 없음)`);
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  basecode-cache.json 빌드                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

async function buildBasecodeCache(conn) {
  const res = await conn.execute(
    `SELECT CODE_TYPE,
            LISTAGG(CODE_NAME, ',') WITHIN GROUP (ORDER BY CODE_NAME) AS VALS
       FROM (SELECT DISTINCT CODE_TYPE, CODE_NAME FROM ISYS_BASECODE)
      GROUP BY CODE_TYPE
      ORDER BY CODE_TYPE`,
    {}, { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  return {
    version: 1,
    refreshedAt: new Date().toISOString(),
    codeTypes: res.rows.map(r => ({
      codeType: r.CODE_TYPE,
      sampleValues: (r.VALS || '').split(',').slice(0, 5),
    })),
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  도메인 자동 제안 (초기 시드)                                                */
/* ────────────────────────────────────────────────────────────────────────── */

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
    members: by.sort(), excludeFromPrompt: true,
  });

  const when = [...allCols].filter(c => /(_DATE|_AT)$/.test(c));
  if (when.length >= 3) domains.push({
    id: 'audit-when', name: '입력·수정 일시',
    description: '감사 로그 - 언제 등록·변경됐는가',
    members: when.sort(), excludeFromPrompt: true,
  });

  const org = [...allCols].filter(c => /^(ORG|ORGANIZATION)_?ID$/.test(c));
  if (org.length >= 1) domains.push({
    id: 'system-org', name: '조직 ID',
    description: 'MES 멀티 조직 구분',
    members: org.sort(), excludeFromPrompt: true,
  });

  const knownTypes = new Set(basecodes.codeTypes.map(b => b.codeType));
  const codeCols = [...allCols].filter(c => /_CODE$/.test(c)).sort();
  for (const col of codeCols) {
    const candidate = col.replace(/_/g, ' ');
    if (!knownTypes.has(candidate)) continue;
    const id = candidate.toLowerCase().replace(/\s/g, '-');
    if (domains.some(d => d.id === id)) continue;
    domains.push({
      id, name: candidate,
      description: `F_GET_BASECODE('${candidate}', ...) 로 해석`,
      members: [col],
      priority: 'common',
      decode: { kind: 'basecode', codeType: candidate },
    });
  }

  return { version: 1, updatedAt: new Date().toISOString(), domains };
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  메인                                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

(async () => {
  console.log('🚀 migrate-to-tables-json 시작');
  console.log(`   dry-run: ${dryRun}`);

  const catalog = loadJson(path.join(ctx, 'catalog.json'));
  console.log(`   catalog: ${catalog.tables.length} 테이블`);

  const cfg = loadDbConfig();
  console.log(`   DB 프로필: ${cfg.name} (${cfg.host}:${cfg.port}/${cfg.sidOrService})`);

  const conn = await oracledb.getConnection({
    user: cfg.username, password: cfg.password,
    connectString: cfg.connectionType === 'SERVICE_NAME'
      ? `${cfg.host}:${cfg.port}/${cfg.sidOrService}`
      : `${cfg.host}:${cfg.port}:${cfg.sidOrService}`,
  });

  // 1. tables.json
  const tablesJson = buildTablesJson(catalog);
  const totalTables = Object.values(tablesJson.sites).reduce((s, v) => s + Object.keys(v.tables).length, 0);
  console.log(`   tables.json: ${totalTables} 테이블 생성`);
  saveJson(path.join(ctx, 'tables.json'), tablesJson);

  // 2. schema-cache.json (DB 조회)
  const schemaCache = await buildSchemaCache(catalog, conn);
  saveJson(path.join(ctx, 'schema-cache.json'), schemaCache);

  // 3. basecode-cache.json
  const basecodeCache = await buildBasecodeCache(conn);
  console.log(`   basecode-cache: ${basecodeCache.codeTypes.length} code types`);
  saveJson(path.join(ctx, 'basecode-cache.json'), basecodeCache);

  // 4. column-domains.json (자동 제안 시드)
  const domains = suggestDomains(schemaCache, basecodeCache);
  console.log(`   column-domains: ${domains.domains.length} 도메인 시드`);
  saveJson(path.join(ctx, 'column-domains.json'), domains);

  await conn.close();
  console.log('\n✅ 마이그레이션 완료');
  if (dryRun) console.log('👉 실제 반영은 --dry-run 옵션 제거 후 재실행');
  else console.log('👉 다음: `git diff data/ai-context/`로 검토 후 커밋');
})().catch(e => { console.error('\n❌ ERROR:', e.message); process.exit(1); });
