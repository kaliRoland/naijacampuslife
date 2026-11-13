// Dev helper: the player never sorts a bed; 10 pm arrives (fail-forward check).
import puppeteer from 'puppeteer-core';
const [url] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 900, height: 520 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem('ncl-lang', 'en'); localStorage.setItem('ncl-help-seen', '1'); } catch {} });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url + '?debug', { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => !document.getElementById('startBtn').disabled, { timeout: 90000 });
await page.click('#startBtn');
await page.waitForFunction(() => document.getElementById('objText').textContent.includes('Walk through'), { timeout: 120000 });
await page.evaluate(() => window.__ncl.player.position.set(0, 0, -3));
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
await page.evaluate(() => document.querySelector('#choiceBtns button').click());
await page.evaluate(() => { window.__ncl.getState().time.minutes = 21 * 60 + 57; });          // 9:57 pm
await page.waitForFunction(() => !document.getElementById('fade').hidden, { timeout: 120000 });
console.log('fade text:', await page.$eval('#fadeText', e => e.textContent));
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
const s = await page.evaluate(() => { const s = window.__ncl.getState(); return { flags: Object.keys(s.flags).filter(k => s.flags[k]), items: Object.keys(s.inventory), health: s.health.health, stress: s.health.stress, mission: s.missions['M-01'], msgs: s.messages.length, cash: s.money.cash }; });
console.log(JSON.stringify(s));
console.log(errors.length ? 'ERRORS ' + errors.join('; ') : 'no console errors');
await browser.close();
