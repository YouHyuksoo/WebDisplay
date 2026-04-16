/**
 * @file scripts/generate-table-doc-from-db.mjs
 * @description Oracle DB에서 테이블 스키마를 실시간 조회해
 *   data/ai-context/tables/<TABLE>.md 문서를 자동 생성한다.
 *
 * 왜 필요한가:
 *   LLM이 없는 컬럼(ORGANIZATION_ID 등)을 환각해서 SQL을 짜는 문제를 방지.
 *   DB의 실제 컬럼 정보만을 LLM에 주입해야 정확한 SQL 생성 가능.
 *
 * 사용법:
 *   node scripts/generate-table-doc-from-db.mjs LOG_COATING1 LOG_COATING2 LOG_FCT
 *   node scripts/generate-table-doc-from-db.mjs --profile=멕시코전장내부 LOG_MARKING
 *   node scripts/generate-table-doc-from-db.mjs --update-catalog LOG_COATING1    # catalog.json도 갱신
 *
 * 옵션:
 *   --profile=<name>    : DB 프로필명 (기본: activeProfile)
 *   --update-catalog    : catalog.json의 tables 배열에도 자동 추가
 *   --overwrite         : 이미 md가 있어도 덮어쓰기 (기본: 건너뜀)
 */

import oracledb from 'oracledb';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const contextDir = path.join(root, 'data', 'ai-context');
const tablesDir = path.join(contextDir, 'tables');
const catalogFile = path.join(contextDir, 'catalog.json');

/* ------------------------------------------------------------------ */
/*  argv 파싱                                                            */
/* ------------------------------------------------------------------ */
const argv = process.argv.slice(2);
const tableArgs = [];
let profileOverride = null;
let updateCatalog = false;
let overwrite = false;

for (const a of argv) {
  if (a.startsWith('--profile=')) profileOverride = a.split('=')[1];
  else if (a === '--update-catalog') updateCatalog = true;
  else if (a === '--overwrite') overwrite = true;
  else tableArgs.push(a.toUpperCase());
}

if (tableArgs.length === 0) {
  console.error('❌ 테이블명을 최소 1개 지정해야 합니다.');
  console.error('   예: node scripts/generate-table-doc-from-db.mjs LOG_COATING1 LOG_FCT');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  DB 연결 설정                                                         */
/* ------------------------------------------------------------------ */
function loadDbConfig() {
  const cfgPath = path.join(root, 'config', 'database.json');
  const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  const name = profileOverride || data.activeProfile;
  const profile = data.profiles.find((p) => p.name === name);
  if (!profile) {
    throw new Error(`프로필 "${name}"을 config/database.json에서 찾을 수 없음. 사용 가능: ${data.profiles.map((p) => p.name).join(', ')}`);
  }
  return profile;
}

/* ------------------------------------------------------------------ */
/*  테이블 스키마 조회                                                    */
/* ------------------------------------------------------------------ */
async function fetchTable(conn, tableName) {
  // 1) 컬럼 목록
  const colsRes = await conn.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE, NULLABLE
       FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t ORDER BY COLUMN_ID`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  if (!colsRes.rows || colsRes.rows.length === 0) {
    return null;
  }

  // 2) 컬럼 코멘트
  const colCommentsRes = await conn.execute(
    `SELECT COLUMN_NAME, COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const commentsMap = Object.fromEntries(colCommentsRes.rows.map((r) => [r.COLUMN_NAME, r.COMMENTS]));

  // 3) 테이블 코멘트
  const tabCommentRes = await conn.execute(
    `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const tableComment = tabCommentRes.rows[0]?.COMMENTS || null;

  // 4) 인덱스 정보 (FK/UK 힌트용)
  let pkCols = [];
  try {
    const pkRes = await conn.execute(
      `SELECT cols.COLUMN_NAME
         FROM USER_CONSTRAINTS c
         JOIN USER_CONS_COLUMNS cols ON c.CONSTRAINT_NAME = cols.CONSTRAINT_NAME
        WHERE c.TABLE_NAME = :t AND c.CONSTRAINT_TYPE = 'P'
        ORDER BY cols.POSITION`,
      { t: tableName },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    );
    pkCols = pkRes.rows.map((r) => r.COLUMN_NAME);
  } catch { /* 권한 없으면 무시 */ }

  return {
    tableComment,
    pkCols,
    columns: colsRes.rows.map((c) => ({
      name: c.COLUMN_NAME,
      type: formatType(c),
      nullable: c.NULLABLE === 'Y',
      comment: commentsMap[c.COLUMN_NAME] || null,
    })),
  };
}

function formatType(c) {
  const { DATA_TYPE: t, DATA_LENGTH: len, DATA_PRECISION: p, DATA_SCALE: s } = c;
  if (t === 'NUMBER') {
    if (p == null) return 'NUMBER';
    return s > 0 ? `NUMBER(${p},${s})` : `NUMBER(${p})`;
  }
  if (t === 'VARCHAR2' || t === 'CHAR' || t === 'NVARCHAR2' || t === 'NCHAR') {
    return `${t}(${len})`;
  }
  return t;
}

/* ------------------------------------------------------------------ */
/*  md 문서 생성                                                         */
/* ------------------------------------------------------------------ */
function buildMarkdown(tableName, schema) {
  const { tableComment, pkCols, columns } = schema;
  const description = tableComment || `${tableName} 테이블 (DB에서 자동 추출)`;

  const rows = columns
    .map((c) => {
      const pkMark = pkCols.includes(c.name) ? ' (PK)' : '';
      const nullMark = c.nullable ? '' : ' NOT NULL';
      return `| ${c.name} | ${c.type}${nullMark} | ${c.comment || ''}${pkMark} |`;
    })
    .join('\n');

  return `---
name: ${tableName}
site: default
description: ${description}
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
${rows}

## 자주 쓰는 JOIN
(필요 시 수기로 추가)

## 예제 쿼리
(필요 시 수기로 추가)

<!-- 이 파일은 generate-table-doc-from-db.mjs로 자동 생성됨. DB 실제 컬럼 기반 -->
<!-- 마지막 추출: ${new Date().toISOString()} -->
`;
}

/* ------------------------------------------------------------------ */
/*  catalog.json 갱신                                                    */
/* ------------------------------------------------------------------ */
function updateCatalogFile(addedTables) {
  if (addedTables.length === 0) return;
  const catalog = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));
  const existing = new Set((catalog.tables || []).map((t) => t.name));
  for (const { name, summary } of addedTables) {
    if (existing.has(name)) continue;
    catalog.tables.push({
      name,
      site: 'default',
      summary: summary || `${name} 테이블`,
      tags: guessTags(name),
    });
  }
  // 알파벳 정렬
  catalog.tables.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(`📒 catalog.json 갱신: ${addedTables.length}건`);
}

function guessTags(tableName) {
  const tags = [];
  if (tableName.startsWith('LOG_')) tags.push('로그', '검사');
  if (/COATING/.test(tableName)) tags.push('코팅');
  if (/FCT|ICT|AOI|EOL|SPI|LCR/.test(tableName)) tags.push('검사', '품질');
  if (/REFLOW/.test(tableName)) tags.push('리플로우', '온도');
  if (/MARKING/.test(tableName)) tags.push('마킹');
  if (/MOUNTER/.test(tableName)) tags.push('마운터', 'SMT');
  if (tags.length === 0) tags.push('기타');
  return [...new Set(tags)];
}

/* ------------------------------------------------------------------ */
/*  메인                                                                */
/* ------------------------------------------------------------------ */
(async () => {
  const cfg = loadDbConfig();
  console.log(`🔌 DB 프로필: ${cfg.name} (${cfg.host}:${cfg.port}/${cfg.sidOrService})`);

  const conn = await oracledb.getConnection({
    user: cfg.username,
    password: cfg.password,
    connectString:
      cfg.connectionType === 'SERVICE_NAME'
        ? `${cfg.host}:${cfg.port}/${cfg.sidOrService}`
        : `${cfg.host}:${cfg.port}:${cfg.sidOrService}`,
  });

  fs.mkdirSync(tablesDir, { recursive: true });

  const added = [];
  const skipped = [];
  const notFound = [];

  for (const tableName of tableArgs) {
    const targetPath = path.join(tablesDir, `${tableName}.md`);
    if (fs.existsSync(targetPath) && !overwrite) {
      console.log(`⏭  ${tableName}: 이미 존재 (--overwrite로 덮어쓰기)`);
      skipped.push(tableName);
      continue;
    }

    console.log(`📥 ${tableName}...`);
    const schema = await fetchTable(conn, tableName);
    if (!schema) {
      console.log(`   ⚠️ DB에 없음: ${tableName}`);
      notFound.push(tableName);
      continue;
    }

    fs.writeFileSync(targetPath, buildMarkdown(tableName, schema), 'utf-8');
    console.log(`   ✅ ${tableName}.md 생성 (컬럼 ${schema.columns.length}개)`);
    added.push({ name: tableName, summary: schema.tableComment });
  }

  await conn.close();

  if (updateCatalog && added.length > 0) {
    updateCatalogFile(added);
  }

  console.log('\n── 결과 ──');
  console.log(`✅ 생성: ${added.length}건`);
  if (skipped.length) console.log(`⏭  건너뜀: ${skipped.length}건 (${skipped.join(', ')})`);
  if (notFound.length) console.log(`⚠️  DB에 없음: ${notFound.length}건 (${notFound.join(', ')})`);
  if (added.length > 0 && !updateCatalog) {
    console.log('\n💡 catalog.json에도 반영하려면 --update-catalog 옵션을 추가하세요.');
  }
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
