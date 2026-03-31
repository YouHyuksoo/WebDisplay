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
    localStorage.setItem('mes-display-timing', JSON.stringify({ refreshSeconds: 90, scrollSeconds: 15 }));
    localStorage.setItem('display-lines-22', JSON.stringify(['P51']));
    localStorage.setItem('display-lines-23', JSON.stringify(['P51']));
  });

  // 1. PBA 메뉴
  console.log('1. PBA menu...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.evaluate(() => {
    const els = [...document.querySelectorAll('*')];
    const pba = els.find(el => el.textContent.trim() === 'PBA 모니터링' && el.children.length === 0);
    if (pba) pba.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'public/manual/menu-pba.png' });
  console.log('Done: menu-pba');

  // 2. 생산계획등록
  console.log('2. Production plan...');
  await page.goto('http://localhost:3000/display/20', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'public/manual/production-plan.png' });
  console.log('Done: production-plan');

  // 3. 제품투입현황
  console.log('3. Product input...');
  await page.goto('http://localhost:3000/display/22', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 15000));
  await page.screenshot({ path: 'public/manual/product-input.png' });
  console.log('Done: product-input');

  // 4. 라인선택 모달
  console.log('4. Line select modal...');
  const allBtns = await page.$$('button');
  if (allBtns.length > 2) {
    await allBtns[2].click();
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'public/manual/line-select-modal.png' });
    console.log('Done: line-select-modal');
  }

  // 5. 헤더 아이콘 확대
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'public/manual/header-icons.png', clip: { x: 900, y: 0, width: 500, height: 45 } });
  console.log('Done: header-icons');

  // 6. 제품포장현황
  console.log('6. Product packing...');
  await page.goto('http://localhost:3000/display/23', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 15000));
  await page.screenshot({ path: 'public/manual/product-packing.png' });
  console.log('Done: product-packing');

  await browser.close();
  console.log('All screenshots captured with dark mode!');
})();
