/**
 * @file scripts/diag-ib-tables.mjs
 * @description 일회성 진단 — 현재 active 프로필의 USER_TABLES vs ALL_TABLES vs SYNONYMS 비교.
 *   45개 고정 vs 실제 DB에 존재하는 IB_* 테이블 위치를 추적한다.
 */

import oracledb from 'oracledb';
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync('config/database.json', 'utf8'));
const profile = cfg.profiles.find((p) => p.name === cfg.activeProfile);

console.log(`[profile] ${profile.name} | ${profile.host}:${profile.port}/${profile.sidOrService} | user=${profile.username}`);

const conn = await oracledb.getConnection({
  user: profile.username,
  password: profile.password,
  connectString: `${profile.host}:${profile.port}/${profile.sidOrService}`,
});

const q = async (sql) => {
  const r = await conn.execute(sql);
  return r.rows ?? [];
};

// 1. 총 개수 비교
const [[userCnt], [allCnt], [synCnt]] = await Promise.all([
  q('SELECT COUNT(*) FROM USER_TABLES'),
  q('SELECT COUNT(*) FROM ALL_TABLES'),
  q('SELECT COUNT(*) FROM USER_SYNONYMS'),
]);
console.log('');
console.log('=== 총 개수 ===');
console.log('USER_TABLES (내 소유):', userCnt[0]);
console.log('ALL_TABLES  (접근 가능 전체):', allCnt[0]);
console.log('USER_SYNONYMS (내 동의어):', synCnt[0]);

// 2. IB_LINE_MASTER 검색
console.log('');
console.log('=== IB_LINE_MASTER 위치 ===');
const ibMaster = await q(`
  SELECT OWNER, TABLE_NAME FROM ALL_TABLES WHERE TABLE_NAME = 'IB_LINE_MASTER'
`);
console.log('ALL_TABLES 에서:', ibMaster.length === 0 ? '없음' : ibMaster);

const ibMasterSyn = await q(`
  SELECT SYNONYM_NAME, TABLE_OWNER, TABLE_NAME FROM ALL_SYNONYMS WHERE SYNONYM_NAME = 'IB_LINE_MASTER'
`);
console.log('ALL_SYNONYMS 에서:', ibMasterSyn.length === 0 ? '없음' : ibMasterSyn);

// 3. IB_ 접두어 전수
console.log('');
console.log('=== ALL_TABLES 의 IB_* 전체 ===');
const allIB = await q(`
  SELECT OWNER, TABLE_NAME FROM ALL_TABLES WHERE TABLE_NAME LIKE 'IB\\_%' ESCAPE '\\' ORDER BY OWNER, TABLE_NAME
`);
console.log(`개수: ${allIB.length}`);
for (const row of allIB) console.log(`  ${row[0]}.${row[1]}`);

console.log('');
console.log('=== USER_SYNONYMS 의 IB_* ===');
const synIB = await q(`
  SELECT SYNONYM_NAME, TABLE_OWNER, TABLE_NAME FROM USER_SYNONYMS WHERE SYNONYM_NAME LIKE 'IB\\_%' ESCAPE '\\' ORDER BY SYNONYM_NAME
`);
console.log(`개수: ${synIB.length}`);
for (const row of synIB) console.log(`  ${row[0]} -> ${row[1]}.${row[2]}`);

await conn.close();
