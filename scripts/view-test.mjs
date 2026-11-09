// Dev helper: checks the camera never gets blocked, and the aerial view works.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [url, out] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 900, height: 500 } });
const page = await browser.newPage();
const errors = []; page.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url + '?debug', { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => !document.getElementById('startBtn').disabled, { timeout: 90000 });
await page.click('#startBtn'); await new Promise(r => setTimeout(r, 800)); await page.click('#helpOk');
await page.waitForFunction(() => document.getElementById('objective').textContent.includes('Walk through'), { timeout: 120000 });
await page.evaluate(() => window.__ncl.player.position.set(0, 0, -3));
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[1].click());
await new Promise(r => setTimeout(r, 300));
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[0].click());
const camDist = () => page.evaluate(() => { const n = window.__ncl, p = n.player.position, c = n.camera.position; return +Math.hypot(c.x - p.x, c.z - p.z).toFixed(2) + ' away, height ' + c.y.toFixed(1); });
const at = async (name, x, z, yaw, wait) => { await page.evaluate((x, z, yaw) => { const n = window.__ncl; n.player.position.set(x, 0, z); n.input.yaw = yaw; }, x, z, yaw); await new Promise(r => setTimeout(r, wait)); await page.screenshot({ path: `${out}/${name}.png` }); console.log(name, '-> camera', await camDist()); };
// camera wants to sit 8 behind the player; a tree stands at (16,-8) right in that line
await at('1-behind-tree', 16, -2, Math.PI, 5000);
await at('2-open-ground', 16, 8, Math.PI, 5000);
await page.keyboard.press('KeyV');
await at('3-aerial', 0, -14, 0, 14000);
await at('4-aerial-by-building', -22, -24, 0.3, 6000);
await page.keyboard.press('KeyV');
console.log(errors.length ? errors.slice(0, 6).join('\n') : 'no console errors');
await browser.close();
