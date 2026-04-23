import fs from 'fs';
import path from 'path';

const SRC = 'src/app';
const pageFiles = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/page\.tsx$/.test(f)) pageFiles.push(p);
  }
};
walk(SRC);

console.log('TOTAL page.tsx:', pageFiles.length);
let withI18n = 0, withoutI18n = 0, noKorean = 0;
const missing = [];
for (const f of pageFiles) {
  const t = fs.readFileSync(f, 'utf8');
  const hasI18n = /useTranslations|getTranslations/.test(t);
  const hasKoreanHardcoded = /[\uAC00-\uD7A3]/.test(t);
  if (hasI18n) withI18n++;
  else if (hasKoreanHardcoded) { withoutI18n++; missing.push(f.split(path.sep).join('/')); }
  else noKorean++;
}
console.log('  i18n 처리됨:', withI18n);
console.log('  한글 하드코딩 (미처리):', withoutI18n);
console.log('  한글 없음 (라우팅 스텁 등):', noKorean);
console.log('\n-- 미처리 페이지 목록 --');
missing.sort().forEach((p, i) => console.log('  ' + String(i + 1).padStart(2) + '. ' + p));
