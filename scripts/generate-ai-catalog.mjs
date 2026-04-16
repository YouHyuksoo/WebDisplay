import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SCHEMA_FILE = path.join(ROOT, 'src', 'lib', 'ai', 'schema-context.ts');
const OUT_DIR = path.join(ROOT, 'data', 'ai-context');
const TABLES_DIR = path.join(OUT_DIR, 'tables');
const DOMAINS_DIR = path.join(OUT_DIR, 'domains');
const SITES_DIR = path.join(OUT_DIR, 'sites');

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

function parseSchemaTables() {
  const src = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  const tableNames = [];
  const tableRe = /^\s{2}'([A-Z_][A-Z0-9_]*)':\s*\{/gm;

  let m;
  while ((m = tableRe.exec(src)) !== null) {
    tableNames.push(m[1]);
  }

  const tables = {};

  for (const tableName of tableNames) {
    const tableBlockRe = new RegExp(`'${tableName}':\\s*\\{([\\s\\S]*?)\\n\\s*\\},`, 'm');
    const tableBlock = src.match(tableBlockRe)?.[1] ?? '';

    const description = tableBlock.match(/description:\s*'([^']*)'/)?.[1] ?? '';

    const columns = [];

    const colRe = /'([A-Z_][A-Z0-9_]*)'\s*:\s*\{\s*type:\s*'([^']+)'\s*,\s*nullable:\s*(true|false)\s*,\s*comment:\s*(?:'([^']*)'|null)\s*\}/g;
    let cm;

    while ((cm = colRe.exec(tableBlock)) !== null) {
      columns.push({
        name: cm[1],
        type: cm[2],
        nullable: cm[3] === 'true',
        comment: cm[4] || '',
      });
    }

    tables[tableName] = { description, columns };
  }

  return tables;
}

function renderTableDoc(tableName, table) {
  const rows = table.columns
    .map((c) => `| ${c.name} | ${c.type} | ${c.comment} |`)
    .join('\n');

  return `---
name: ${tableName}
site: default
description: ${table.description || `${tableName} 테이블`}
related_tables: []
---

## 주요 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
${rows}

## 자주 쓰는 JOIN


## 예제 쿼리

`;
}

function buildCatalog(tables) {
  const entries = Object.entries(tables).map(([name, table]) => ({
    name,
    site: 'default',
    summary: table.description || `${name} 테이블`,
    tags: inferTags(name),
  }));

  return {
    tables: entries,
    domains: [],
    sites: [
      {
        key: 'default',
        description: '현재 activeProfile (config/database.json)',
        note: '사이트 미지정 시 항상 사용',
      },
      {
        key: '멕시코VD외부',
        description: '멕시코 VD 사이트 (SMMEXPDB)',
        note: '질문에 멕시코VD/SMMEXPDB 명시 시 사용',
      },
      {
        key: '베트남VD외부',
        description: '베트남 VD 사이트 (SMVNPDB)',
        note: '질문에 베트남/SMVNPDB 명시 시 사용',
      },
    ],
  };
}

function main() {
  const tables = parseSchemaTables();

  fs.mkdirSync(TABLES_DIR, { recursive: true });
  fs.mkdirSync(DOMAINS_DIR, { recursive: true });
  fs.mkdirSync(SITES_DIR, { recursive: true });

  for (const [name, table] of Object.entries(tables)) {
    fs.writeFileSync(path.join(TABLES_DIR, `${name}.md`), renderTableDoc(name, table), 'utf-8');
  }

  const catalog = buildCatalog(tables);
  fs.writeFileSync(path.join(OUT_DIR, 'catalog.json'), JSON.stringify(catalog, null, 2), 'utf-8');

  console.log(`Parsed tables: ${Object.keys(tables).length}`);
  console.log(`Generated docs: ${Object.keys(tables).length}`);
  console.log('Generated: data/ai-context/catalog.json');
}

main();
