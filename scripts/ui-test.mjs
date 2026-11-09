// Dev helper: phone-sized UI check (help card, HUD, minimap, arrow, full map, mute button).
//   node scripts/ui-test.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [url, out] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url + '?debug', { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => !document.getElementById('startBtn').disabled, { timeout: 90000 });
await page.screenshot({ path: out + '/a-landing.png' });
await page.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: out + '/b-help.png' });
console.log('help visible on first run:', await page.evaluate(() => !document.getElementById('help').hidden));
await page.click('#helpOk');
await page.waitForFunction(() => document.getElementById('objective').textContent.includes('Walk through'), { timeout: 120000 });
await new Promise(r => setTimeout(r, 800));
await page.screenshot({ path: out + '/c-hud-walk.png' });
// go through the gate
await page.evaluate(() => window.__ncl.player.position.set(0, 0, -3));
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[1].click());
await new Promise(r => setTimeout(r, 300));
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[0].click());
await page.evaluate(() => { window.__ncl.player.position.set(0, 0, -8); window.__ncl.input.yaw = 0.4; });
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: out + '/d-hud-errand.png' });
await page.click('#mapBtn'); await new Promise(r => setTimeout(r, 700));
await page.screenshot({ path: out + '/e-map.png' });
await page.click('#mapClose');
// music button
const before = await page.$eval('#soundBtn', e => e.textContent);
await page.click('#soundBtn');
const after = await page.$eval('#soundBtn', e => e.textContent);
const saved = await page.evaluate(() => localStorage.getItem('ncl-muted'));
console.log('sound button:', before, '->', after, '| saved muted =', saved);
await page.click('#soundBtn');
console.log('sound button toggled back:', await page.$eval('#soundBtn', e => e.textContent));
console.log(errors.length ? errors.slice(0, 8).join('\n') : 'no console errors');
await browser.close();
