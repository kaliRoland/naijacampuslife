// Dev helper: drives headless Chrome to take screenshots and read render stats.
//   node scripts/shot.mjs <url> <outDir>
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [url, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=900,500'],
  defaultViewport: { width: 900, height: 500 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); else if (m.text().startsWith('Static')) console.log(m.text()); });
await page.goto(url + '?debug', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !document.getElementById('startBtn').disabled, { timeout: 60000 });
await page.screenshot({ path: out + '/0-landing.png' });
await page.click('#startBtn');
await page.waitForFunction(() => document.getElementById('objective').textContent.includes('Walk through'), { timeout: 120000 });
const go = async (name, x, z, yaw, wait = 1200) => {
  await page.evaluate((x, z, yaw) => { const n = window.__ncl; n.player.position.set(x, 0, z); n.input.yaw = yaw; n.camera.position.set(x, 4.5, z + 8); }, x, z, yaw);
  await new Promise(r => setTimeout(r, wait));
  await page.screenshot({ path: `${out}/${name}.png` });
};
await go('1-gate-approach', 0, 14, 0);
// walk through the gate: trigger the story moment, then continue
await page.evaluate(() => window.__ncl.player.position.set(0, 0, -3));
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[1].click());
await new Promise(r => setTimeout(r, 300));
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[0].click());
await new Promise(r => setTimeout(r, 500));
await go('2-inside-avenue', 0, -6, 0);
await go('3-plaza', 0, -12, 0.0);
await go('4-registration', 14, -9, 0.5);
await go('5-kiosk', -10, -1, -0.6);
await go('6-buildings', 0, -22, 0.0);
await go('7-hostel', -40, -28, -0.9);
await go('8-library', 0, -44, 0.0);
await go('9-bus', -12, 16, Math.PI);
const stats = await page.evaluate(() => { const i = window.__ncl.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries, tex: i.memory.textures }; });
console.log('STATS', JSON.stringify(stats));
console.log(errors.length ? errors.slice(0, 10).join('\n') : 'no console errors');
await browser.close();
