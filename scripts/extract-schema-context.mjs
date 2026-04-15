/**
 * @file scripts/extract-schema-context.mjs
 * @description 화이트리스트 테이블의 컬럼/코멘트를 Oracle에서 추출해
 *   src/lib/ai/schema-context.ts SCHEMA 상수를 자동 생성한다.
 *
 * 사용법:
 *   1. WHITELIST 배열에 추적할 테이블명 추가
 *   2. npm run extract-schema 실행
 *   3. schema-context.ts가 갱신됨 → git diff로 확인 후 커밋
 */

import oracledb from 'oracledb';
import fs from 'fs';
import path from 'path';

// === 화이트리스트 (오빠 제공 후 채움) ===
const WHITELIST = [
  // 'IP_PRODUCT_LINE_TARGET',
  // 'IP_PRODUCT_WORKSTAGE_IO',
  // 'MES_LINE_MASTER',
  // 'MES_MODEL_MASTER',
  // 'ISYS_USERS',
];

const TARGET_FILE = path.join(process.cwd(), 'src', 'lib', 'ai', 'schema-context.ts');

async function loadConfig() {
  const cfgPath = path.join(process.cwd(), 'config', 'database.json');
  const data = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  const active = data.profiles.find((p) => p.name === data.activeProfile) || data.profiles[0];
  return active;
}

async function fetchTable(conn, tableName) {
  const colsRes = await conn.execute(
    `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE
       FROM USER_TAB_COLUMNS WHERE TABLE_NAME = :t ORDER BY COLUMN_ID`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const colCommentsRes = await conn.execute(
    `SELECT COLUMN_NAME, COMMENTS FROM USER_COL_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );
  const tabCommentRes = await conn.execute(
    `SELECT COMMENTS FROM USER_TAB_COMMENTS WHERE TABLE_NAME = :t`,
    { t: tableName },
    { outFormat: oracledb.OUT_FORMAT_OBJECT },
  );

  const commentsMap = Object.fromEntries(colCommentsRes.rows.map((r) => [r.COLUMN_NAME, r.COMMENTS]));
  const tableComment = tabCommentRes.rows[0]?.COMMENTS || `${tableName} (자동 추출)`;

  const columns = {};
  for (const c of colsRes.rows) {
    const typeStr = c.DATA_TYPE.startsWith('VARCHAR') || c.DATA_TYPE === 'CHAR'
      ? `${c.DATA_TYPE}(${c.DATA_LENGTH})`
      : c.DATA_TYPE;
    columns[c.COLUMN_NAME] = {
      type: typeStr,
      nullable: c.NULLABLE === 'Y',
      comment: commentsMap[c.COLUMN_NAME] || null,
    };
  }
  return { description: tableComment, columns };
}

function generateTsCode(schemaMap) {
  const header = `/**
 * @file src/lib/ai/schema-context.ts
 * @description LLM에 주입할 화이트리스트 테이블의 컬럼 명세.
 *
 * 자동 생성 파일 — 수동 편집 시 주의.
 * 갱신: scripts/extract-schema-context.mjs 실행
 * 마지막 추출: ${new Date().toISOString()}
 */

export interface ColumnSpec {
  type:     string;
  nullable: boolean;
  comment:  string | null;
}

export interface TableSpec {
  description: string;
  columns:     Record<string, ColumnSpec>;
  sampleQueries?: string[];
  enums?: Record<string, Record<string, string>>;
  joins?: string[];
}

export const SCHEMA: Record<string, TableSpec> = ${JSON.stringify(schemaMap, null, 2)};

`;

  const footer = `export function buildSchemaSection(selectedTables?: string[]): string {
  const tables = selectedTables && selectedTables.length > 0
    ? selectedTables.filter((t) => SCHEMA[t])
    : Object.keys(SCHEMA);

  if (tables.length === 0) {
    return '_(화이트리스트 테이블이 아직 등록되지 않았습니다. 관리자에게 문의하세요.)_';
  }

  const sections = tables.map((tableName) => {
    const spec = SCHEMA[tableName];
    const cols = Object.entries(spec.columns)
      .map(([name, c]) => \`| \${name} | \${c.type} | \${c.nullable ? 'Y' : 'N'} | \${c.comment ?? ''} |\`)
      .join('\\n');
    const samples = spec.sampleQueries?.length
      ? \`\\n\\n예시 SQL:\\n\${spec.sampleQueries.map((s) => \`- \\\`\${s}\\\`\`).join('\\n')}\`
      : '';
    const enums = spec.enums
      ? \`\\n\\n코드값:\\n\${Object.entries(spec.enums).map(([col, vals]) =>
          \`- \${col}: \${Object.entries(vals).map(([k, v]) => \`\${k}=\${v}\`).join(', ')}\`).join('\\n')}\`
      : '';
    return \`## \${tableName}\\n\${spec.description}\\n\\n| 컬럼 | 타입 | NULL | 코멘트 |\\n|---|---|---|---|\\n\${cols}\${enums}\${samples}\`;
  });

  return sections.join('\\n\\n');
}
`;

  return header + footer;
}

(async () => {
  if (WHITELIST.length === 0) {
    console.log('❌ WHITELIST 배열이 비어있습니다. scripts/extract-schema-context.mjs를 열어 테이블 목록 추가하세요.');
    process.exit(1);
  }

  const cfg = await loadConfig();
  const conn = await oracledb.getConnection({
    user: cfg.username,
    password: cfg.password,
    connectString: cfg.connectionType === 'SERVICE_NAME'
      ? `${cfg.host}:${cfg.port}/${cfg.sidOrService}`
      : `${cfg.host}:${cfg.port}:${cfg.sidOrService}`,
  });

  const schemaMap = {};
  for (const t of WHITELIST) {
    console.log(`📥 ${t}...`);
    schemaMap[t] = await fetchTable(conn, t);
  }

  await conn.close();
  fs.writeFileSync(TARGET_FILE, generateTsCode(schemaMap), 'utf-8');
  console.log(`✅ ${TARGET_FILE} 생성 완료 (${Object.keys(schemaMap).length}개 테이블)`);
})().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
