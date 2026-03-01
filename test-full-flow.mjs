/**
 * @file test-full-flow.mjs
 * @description 전체 네비게이션 플로우 테스트: 메뉴 → 카드 클릭 → 디스플레이 → 나가기 → 메뉴 복원
 */
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';

async function test() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // 콘솔 로그 캡처
  page.on('console', (msg) => {
    if (msg.text().includes('[Menu]')) {
      console.log('  CONSOLE:', msg.text());
    }
  });

  console.log('=== Step 1: 메뉴 페이지 로드 ===');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // 초기화 완료 대기

  let title = await page.$eval('#section-title', el => el.textContent).catch(() => 'N/A');
  console.log('  섹션 타이틀:', title);
  let active = await page.evaluate(() => document.querySelector('.section-cards.active')?.getAttribute('data-section'));
  console.log('  활성 섹션:', active);

  console.log('\n=== Step 2: 섹션 4 (QUALITY)로 이동 ===');
  // depth-indicator의 5번째 도트(인덱스 4) 클릭
  const dotClicked = await page.evaluate(() => {
    const dots = document.querySelectorAll('.depth-dot');
    if (dots.length > 4) { dots[4].click(); return true; }
    return false;
  });
  console.log('  도트 클릭:', dotClicked);
  await new Promise(r => setTimeout(r, 1500)); // 애니메이션 대기

  title = await page.$eval('#section-title', el => el.textContent).catch(() => 'N/A');
  console.log('  섹션 타이틀:', title);
  active = await page.evaluate(() => document.querySelector('.section-cards.active')?.getAttribute('data-section'));
  console.log('  활성 섹션:', active);

  console.log('\n=== Step 3: "Solder Paste 관리" 카드 클릭 ===');
  // section-cards.active 내의 shortcut-card 중 "Solder" 포함된 것 찾아 클릭
  const ls_before = await page.evaluate(() => localStorage.getItem('mes-display-last-section'));
  console.log('  localStorage (클릭 전):', ls_before);

  const cardFound = await page.evaluate(() => {
    const cards = document.querySelectorAll('.section-cards.active .shortcut-card');
    for (const card of cards) {
      const titleEl = card.querySelector('.shortcut-title');
      if (titleEl && titleEl.textContent.includes('Solder')) {
        card.click();
        return titleEl.textContent;
      }
    }
    // 카드가 없으면 아무 카드나 클릭
    if (cards.length > 0) { cards[0].click(); return cards[0].querySelector('.shortcut-title')?.textContent || '(첫번째 카드)'; }
    return null;
  });
  console.log('  클릭한 카드:', cardFound);

  await new Promise(r => setTimeout(r, 1000)); // 클릭 처리 + 네비게이션 대기

  const ls_after = await page.evaluate(() => localStorage.getItem('mes-display-last-section'));
  console.log('  localStorage (클릭 후):', ls_after);

  console.log('\n=== Step 4: 네비게이션 대기 (디스플레이 페이지) ===');
  // router.push가 full page reload를 트리거 - waitForNavigation
  try {
    await page.waitForNavigation({ timeout: 5000, waitUntil: 'networkidle0' });
  } catch {
    console.log('  (네비게이션 타임아웃 - 페이지가 이미 변경되었을 수 있음)');
  }

  const currentUrl = page.url();
  console.log('  현재 URL:', currentUrl);

  // 디스플레이 페이지에서 localStorage 확인
  const ls_display = await page.evaluate(() => localStorage.getItem('mes-display-last-section'));
  console.log('  localStorage (디스플레이에서):', ls_display);

  console.log('\n=== Step 5: 메뉴 페이지로 돌아가기 ===');
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000)); // 초기화 완료 대기

  // 디버그 오버레이 확인
  const dbg = await page.$eval('#__dbg', el => el.textContent).catch(() => 'NO OVERLAY');
  console.log('  오버레이:', dbg);

  title = await page.$eval('#section-title', el => el.textContent).catch(() => 'N/A');
  console.log('  섹션 타이틀:', title);
  active = await page.evaluate(() => document.querySelector('.section-cards.active')?.getAttribute('data-section'));
  console.log('  활성 섹션:', active);

  const activeDot = await page.evaluate(() => {
    const dots = document.querySelectorAll('.depth-dot');
    let idx = -1;
    dots.forEach((d, i) => { if (d.classList.contains('active')) idx = i; });
    return idx;
  });
  console.log('  활성 도트:', activeDot);

  console.log('\n=== 최종 결과 ===');
  if (active === '4') {
    console.log('  ✅ 전체 플로우 성공! 메뉴가 섹션 4 (QUALITY)로 복원됨');
  } else {
    console.log('  ❌ 복원 실패! 활성 섹션:', active, '(예상: 4)');
    console.log('  → 오버레이 내용을 확인하여 어느 단계에서 실패했는지 분석 필요');
  }

  await browser.close();
}

test().catch(e => { console.error('테스트 에러:', e); process.exit(1); });
