const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 780 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  // localStorage 세팅
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(() => {
    localStorage.setItem('mes-display-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('mes-display-locale', 'ko');
  });

  // 생산계획등록 - 충분히 대기
  console.log('Navigating to /display/20...');
  await page.goto('http://localhost:3000/display/20', { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('Waiting 15 seconds for full render...');
  await new Promise(r => setTimeout(r, 15000));

  // 모달이 있으면 모달 밖 영역 클릭으로 닫기 (ESC는 메뉴이동이므로 사용금지)
  const modal = await page.$('[class*=modal], [role=dialog]');
  if (modal) {
    console.log('Modal detected, clicking backdrop...');
    await page.mouse.click(10, 10);
    await new Promise(r => setTimeout(r, 1000));
  }

  await page.screenshot({ path: 'public/manual/production-plan.png' });
  console.log('Done: production-plan.png');

  await browser.close();
})();
