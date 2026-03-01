/**
 * @file test-section-restore.mjs
 * @description 섹션 복원 기능 자동 테스트 (Puppeteer)
 *
 * 1. 메뉴 페이지 열기
 * 2. 디버그 오버레이 내용 확인
 * 3. localStorage에 값 직접 설정
 * 4. 페이지 새로고침
 * 5. 디버그 오버레이에서 복원 결과 확인
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 콘솔 로그 캡처
  page.on('console', (msg) => {
    if (msg.text().includes('[Menu]')) {
      console.log('  BROWSER:', msg.text());
    }
  });

  console.log('=== 테스트 1: 초기 로드 (localStorage 비어있음) ===');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#__dbg', { timeout: 10000 }).catch(() => null);
  await new Promise(r => setTimeout(r, 2000)); // 초기화 대기

  const dbg1 = await page.$eval('#__dbg', el => el.textContent).catch(() => 'NO OVERLAY');
  console.log('  오버레이:', dbg1);

  const section1 = await page.evaluate(() => {
    const active = document.querySelector('.section-cards.active');
    return active ? active.getAttribute('data-section') : 'NONE';
  });
  console.log('  활성 섹션:', section1);

  const title1 = await page.$eval('#section-title', el => el.textContent).catch(() => 'N/A');
  console.log('  섹션 타이틀:', title1);

  console.log('\n=== 테스트 2: localStorage에 section=4 저장 후 새로고침 ===');
  await page.evaluate(() => {
    localStorage.setItem('mes-display-last-section', '4');
  });
  const verify = await page.evaluate(() => localStorage.getItem('mes-display-last-section'));
  console.log('  localStorage 설정 확인:', verify);

  await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('#__dbg', { timeout: 10000 }).catch(() => null);
  await new Promise(r => setTimeout(r, 3000)); // 초기화 + 애니메이션 대기

  const dbg2 = await page.$eval('#__dbg', el => el.textContent).catch(() => 'NO OVERLAY');
  console.log('  오버레이:', dbg2);

  const section2 = await page.evaluate(() => {
    const active = document.querySelector('.section-cards.active');
    return active ? active.getAttribute('data-section') : 'NONE';
  });
  console.log('  활성 섹션:', section2);

  const title2 = await page.$eval('#section-title', el => el.textContent).catch(() => 'N/A');
  console.log('  섹션 타이틀:', title2);

  const currentSection = await page.evaluate(() => {
    // state 모듈에서 currentSection 값 확인
    return window.__menuState?.currentSection ?? 'N/A';
  });
  console.log('  state.currentSection:', currentSection);

  // 뎁스 인디케이터 확인
  const activeDot = await page.evaluate(() => {
    const dots = document.querySelectorAll('.depth-dot');
    let activeIdx = -1;
    dots.forEach((d, i) => { if (d.classList.contains('active')) activeIdx = i; });
    return activeIdx;
  });
  console.log('  활성 뎁스 도트:', activeDot);

  console.log('\n=== 테스트 3: 카드 클릭 시 localStorage 저장 확인 ===');
  // 먼저 localStorage 클리어
  await page.evaluate(() => localStorage.removeItem('mes-display-last-section'));

  // section-cards.active 내의 첫 번째 카드 클릭
  const cardClicked = await page.evaluate(() => {
    const card = document.querySelector('.section-cards.active .shortcut-card');
    if (card) {
      card.click();
      return true;
    }
    return false;
  });
  console.log('  카드 클릭:', cardClicked ? '성공' : '실패');

  await new Promise(r => setTimeout(r, 500)); // 클릭 처리 대기

  const savedValue = await page.evaluate(() => localStorage.getItem('mes-display-last-section'));
  console.log('  localStorage 저장값:', savedValue);

  console.log('\n=== 결과 요약 ===');
  if (section2 === '4') {
    console.log('  ✅ 섹션 복원 성공! 섹션 4 (QUALITY) 활성화됨');
  } else {
    console.log('  ❌ 섹션 복원 실패. 활성 섹션:', section2, '(예상: 4)');
  }

  await browser.close();
}

test().catch(e => { console.error('테스트 에러:', e); process.exit(1); });
