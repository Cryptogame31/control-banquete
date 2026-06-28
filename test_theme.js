const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto('http://localhost:8080/index.html');
  await page.waitForSelector('#theme-toggle-btn');
  console.log("Clicking theme toggle...");
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(1000);
  console.log("Theme after click:", await page.evaluate(() => document.body.className));
  
  await browser.close();
})();
