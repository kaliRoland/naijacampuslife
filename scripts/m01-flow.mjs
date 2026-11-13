// Dev helper: plays M-01 in a real browser, from the gate to the cliffhanger, and takes screenshots.
//   node scripts/m01-flow.mjs <url> <outDir> [negotiate|report|challenge|uche|chuks|offcampus|late]
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
const [url, out, path = 'negotiate'] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], defaultViewport: { width: 900, height: 520 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { try { localStorage.clear(); localStorage.setItem('ncl-lang', 'en'); localStorage.setItem('ncl-help-seen', '1'); } catch {} });
const errors = []; page.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => { await page.screenshot({ path: `${out}/${n}.png` }); };
const log = (...a) => console.log(...a);

await page.goto(url + '?debug', { waitUntil: 'load', timeout: 90000 });
await page.waitForFunction(() => !document.getElementById('startBtn').disabled, { timeout: 90000 });
await page.click('#startBtn');
await page.waitForFunction(() => document.getElementById('objText').textContent.includes('Walk through'), { timeout: 120000 });
const at = (x, z, yaw = 0) => page.evaluate((x, z, yaw) => { const n = window.__ncl; n.player.position.set(x, 0, z); n.input.yaw = yaw; }, x, z, yaw);
const press = async () => { await page.keyboard.press('KeyE'); await wait(400); };
const opt = text => page.evaluate(t => { const b = [...document.querySelectorAll('#dlgOpts button')].find(x => x.textContent.includes(t) && !x.disabled); if (!b) return false; b.click(); return true; }, text);
const dialogueText = () => page.evaluate(() => document.getElementById('dlgText').textContent);
const state = () => page.evaluate(() => { const s = window.__ncl.getState(); return { cash: s.money.cash, vars: s.vars, flags: Object.keys(s.flags).filter(k => s.flags[k]), items: Object.keys(s.inventory), msgs: s.messages.length, mission: s.missions['M-01'], day: s.time.day, min: s.time.minutes, loc: window.__ncl.loc, health: s.health.health, compromise: s.meters.compromise }; });

// 1. through the gate -> registration card
await at(0, -3);
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
await shot('01-registration-card');
log('registration card text:', (await page.$eval('#choiceText', e => e.textContent)).slice(0, 70).replace(/\n/g, ' '));
await page.evaluate(() => document.querySelector('#choiceBtns button').click());
await wait(500);
log('after registration:', JSON.stringify(await state()));
log('objective:', await page.$eval('#objText', e => e.textContent));
log('clock:', await page.$eval('#clock', e => e.textContent));

// 2. walk to the hostel door and go in
const door = await page.evaluate(() => ({ x: window.__ncl.world.hostelDoor.x, z: window.__ncl.world.hostelDoor.z }));
await at(door.x, door.z + 1.2, Math.PI);
await wait(1800); await shot('02-hostel-outside');
log('talk button:', (await page.$eval('#talkBtn', e => e.textContent)), 'hidden=', await page.$eval('#talkBtn', e => e.hidden));
await press(); await wait(1200);
log('location now:', (await state()).loc);
await shot('03-hostel-corridor');
const OX = await page.evaluate(() => window.__ncl.hostel.x);

const talkTo = async (x, z, wantText, yaw = 0) => { await at(OX + x, z, yaw); await wait(1500); await press(); await wait(600); const t = await dialogueText(); log(`  talking: "${t.slice(0, 80).replace(/\n/g, ' ')}"`); return t; };

// 3. the Quiet One explains, then the chosen path
await talkTo(-5.2, -2.6);
await shot('04-quiet-one');
await opt('What can I do'); await wait(300); log('  hints:', (await dialogueText()).slice(0, 60)); await opt('Okay. Thank you'); await wait(300);

if (path === 'negotiate') {
  await talkTo(-2.0, -5.2, '', 1.2); await shot('05-killer');
  await opt('settle this'); await wait(300); await shot('06-killer-offer'); await opt('Pay ₦2,000'); await wait(300); await opt('Thank you'); await wait(500);
} else if (path === 'report') {
  await talkTo(3.5, 7, '', 1.5); await opt('Killer and his people'); await opt('Thank you'); await wait(400);
} else if (path === 'challenge') {
  await talkTo(-2.0, -5.2, '', 1.2); await opt('my bed'); await wait(400); log('  result:', (await dialogueText()).slice(0, 90).replace(/\n/g, ' ')); await shot('05-challenge-result'); await page.evaluate(() => document.querySelector('#dlgOpts button').click()); await wait(400);
} else if (path === 'uche') {
  await talkTo(-0.2, -12.4, '', 0); await opt('Pay ₦3,500'); await wait(300); await opt('Thanks'); await wait(400);
} else if (path === 'chuks') {
  await talkTo(0.2, -5.0, '', -1.2); await opt('Accept'); await wait(300); await opt('Thanks'); await wait(400);
} else if (path === 'offcampus') {
  await at(OX, 10.6); await wait(1500); await press(); await wait(500); log('  exit says:', (await dialogueText()).slice(0, 60)); await opt('off-campus'); await wait(800);
}
log('after the choice:', JSON.stringify(await state()));
log('objective:', await page.$eval('#objText', e => e.textContent));

// 4. sleep (or the off-campus ending)
if (path !== 'offcampus') {
  await talkTo(-6.4, -6.0, '', 1.2); await shot('07-bed');
  await opt('Go to sleep'); await wait(800);
}
await wait(500); await shot('08-lights-out');
log('lights-out text:', (await page.$eval('#fadeText', e => e.textContent)).slice(0, 80));
await page.waitForFunction(() => !document.getElementById('choice').hidden, { timeout: 60000 });
await shot('09-end-card');
log('end card:', (await page.$eval('#choiceText', e => e.textContent)).slice(0, 60).replace(/\n/g, ' '));
await page.evaluate(() => document.querySelectorAll('#choiceBtns button')[1].click()); await wait(700);
await shot('10-phone-messages');
await page.evaluate(() => document.querySelector('[data-tab=messages]').click()); await wait(400); await shot('11-messages-tab');
log('final:', JSON.stringify(await state()));
log(errors.length ? 'ERRORS:\n' + errors.slice(0, 6).join('\n') : 'no console errors');
await browser.close();
