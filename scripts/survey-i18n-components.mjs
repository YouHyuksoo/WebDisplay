import fs from 'fs';
import path from 'path';

const roots = ['src/components', 'src/app'];
const files = [];
const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.tsx$/.test(f) && !/page\.tsx$/.test(f)) files.push(p);
  }
};
roots.forEach(walk);

/** 주석 제거(라인/블록) 후 한글 카운트 */
function countKoreanOutsideComments(src) {
  let noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '');
  let cleaned = noBlock.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  const m = cleaned.match(/[\uAC00-\uD7A3]/g);
  return m ? m.length : 0;
}

const results = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const hasI18n = /useTranslations|getTranslations/.test(t);
  const koCount = countKoreanOutsideComments(t);
  if (koCount > 0 && !hasI18n) {
    results.push({ f: f.split(path.sep).join('/'), koCount });
  }
}

results.sort((a, b) => b.koCount - a.koCount);
console.log(`TOTAL component/*.tsx scanned: ${files.length}`);
console.log(`Files with Korean (excl. comments) & no useTranslations: ${results.length}`);
const byDir = {};
for (const r of results) {
  const d = r.f.replace(/\/[^/]+$/, '');
  byDir[d] = (byDir[d] || 0) + 1;
}
console.log('\n-- 디렉토리별 미처리 파일 수 --');
Object.entries(byDir).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`  ${c.toString().padStart(3)}  ${d}`));
console.log('\n-- TOP 30 (한글 개수 많은 순) --');
results.slice(0, 30).forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. ${r.koCount.toString().padStart(4)}  ${r.f}`));
