import * as THREE from 'three';
import { buildWorld } from './game/world.js';
import { createNPCs, updateNPCs } from './game/npcs.js';
import { addInteractables, createLegacyInteractables, updateInteractables, faceToward } from './game/interact.js';
import { makePlayer, animatePlayer, PEOPLE } from './game/models.js';
import { setupControls, input } from './game/controls.js';
import { wallet, naira } from './game/wallet.js';
import { game } from './game/state.js';
import { initPhone } from './game/phone.js';
import { startDialogue, isTalking } from './game/dialogue.js';
import { TEXT, HELP } from './data/story.js';
import { TARGETS } from './data/places.js';
import { FEATURES } from './data/config.js';
import { startMusic, initMusicButton } from './game/audio.js';
import { createMap } from './game/map.js';
import { createBeacon, updateWaypoint, initHelp } from './game/guide.js';
import { CATEGORIES } from './data/prices.js';
import { loadAllModels, applyModels } from './game/upgrade.js';
import { createHostel } from './game/hostel.js';
import { applyDaylight } from './game/daylight.js';
import M01 from './data/missions/m01.json';
import INTRO from './data/missions/intro.json';
import { getState, apply, applyAll } from './core/state.js';
import { on } from './core/events.js';
import { advanceReal, skipTo, formatClock, phaseOf, weekdayOf } from './core/time.js';
import { autosave } from './core/save.js';

const $ = id => document.getElementById(id);
const L = () => game.lang;                       // 'pcm' or 'en'
const say = o => (typeof o === 'string' ? o : (o[L()] || o.en));
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
const world = buildWorld(scene);
const { bus } = world;
createNPCs(scene);
if (FEATURES.legacyWeek2) createLegacyInteractables(scene);     // the Week 2 registration errand is parked
const hostel = createHostel(scene);
const player = makePlayer(scene);
player.position.set(0, 0, 23.5);
player.rotation.y = Math.PI;
setupControls(canvas);

// Where you can walk in: the campus, or inside Hostel Block A
let loc = 'campus';
const campusBounds = { minX: -66, maxX: 66, minZ: -51, maxZ: 33 };
const hostelDoorMark = Object.assign(world.hostelDoor, { name: 'Hostel Block A' });
addInteractables(scene, [{ id: 'door:hostel', name: 'Hostel Block A', kind: 'door', ref: hostelDoorMark, radius: 3.4, markerY: 3.4 }], 'campus');
addInteractables(scene, hostel.interactables, 'hostel');
const BED_TARGET = { x: hostel.x - 8.4, z: -6.0, name: 'Your bed (Room 14)' };

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---- Game flow: intro -> bus -> walk -> registration card -> play (M-01) ----
let state = 'intro';
const canMove = () => (state === 'walk' || state === 'play') && !isTalking() && $('phone').hidden && !map.isOpen && !help.isOpen();
const syncInput = () => { input.enabled = canMove(); };
const S = () => getState();

// ---- Phone ----
initPhone();
const togglePhone = () => {
  if (state === 'intro') return;
  const open = $('phone').hidden;
  $('phone').hidden = !open; if (open) $('badge').hidden = true;
  syncInput();
};
$('phoneBtn').onclick = togglePhone;
$('phoneClose').onclick = () => { $('phone').hidden = true; syncInput(); };

// ---- Where to go: map, pointer arrow, gold beacon, how-to-play card, music button ----
const map = createMap(world);
const beacon = createBeacon(scene);
const help = initHelp(HELP, () => syncInput());
$('helpOk').textContent = HELP.gotIt;
initMusicButton();
const openMap = () => { if (state === 'intro') return; map.openFull(); syncInput(); };
const closeMap = () => { map.closeFull(); syncInput(); };
$('mapBtn').onclick = openMap; $('minimap').onclick = openMap; $('mapClose').onclick = closeMap;
$('helpBtn').onclick = () => { help.open(); syncInput(); };
addEventListener('keydown', e => {
  if (e.code === 'KeyM' && !e.repeat) { map.isOpen ? closeMap() : (canMove() && openMap()); }
  if (e.code === 'KeyV' && !e.repeat && canMove()) toggleView();
  if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) togglePhone(); }
  if (e.code === 'Escape') { if (map.isOpen) closeMap(); else if (help.isOpen()) $('helpOk').click(); else if (!$('phone').hidden) { $('phone').hidden = true; syncInput(); } }
});

// What the player should do next, and where
const m01Done = () => S().missions['M-01'] === 'done';
function currentTarget() {
  if (state === 'walk') return TARGETS.gate;
  if (state !== 'play') return null;
  if (loc === 'campus') return S().flags.m01_out_off_campus || m01Done() ? null : hostelDoorMark;
  return (!m01Done() && !S().flags.m01_out_off_campus) ? BED_TARGET : null;
}
let lastTarget = null, miniTick = 0;

// ---- Toasts: bank alerts and new messages ----
let toastTimer;
function toast(html) {
  const t = $('toast'); t.innerHTML = html; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}
wallet.onChange(tx => {
  const c = CATEGORIES[tx.category] || CATEGORIES.other;
  toast(`<b>Bank alert · ${tx.amount >= 0 ? 'Credit' : 'Debit'}</b><br>${c.icon} ${tx.amount >= 0 ? '+' : '-'}${naira(tx.amount)}<br>${tx.reason}<br><small>Balance: ${naira(tx.balance)}</small>`);
  $('badge').hidden = !$('phone').hidden;
});
on('message:received', m => {
  toast(`<b>💬 New message</b><br>From: ${m.from}<br>${m.text}`);
  $('badge').hidden = !$('phone').hidden;
});

// ---- Objective follows your progress ----
const objective = t => { $('objText').textContent = t; };
function updateObjective() {
  if (state === 'bus') return objective(TEXT.objective_bus);
  if (state === 'walk') return objective(TEXT.objective_walk);
  if (state !== 'play') return;
  const f = S().flags, o = M01.objective;
  if (m01Done()) return objective(say(INTRO.objectiveAfter));
  if (f.m01_out_off_campus) return objective(say(o.resolved));
  if (f.m01_resolved) return objective(say(o.resolved));
  objective(say(loc === 'hostel' ? o.inside : o.start));
}
on('flag:changed', updateObjective); on('mission:changed', updateObjective);

// ---- Clock on screen, and the sky that follows it ----
function paintClock() {
  const t = S().time, ph = phaseOf(t.minutes);
  $('clock').textContent = `Day ${t.day} · ${weekdayOf(t.day)} · ${formatClock(t.minutes)} · ${ph[0].toUpperCase() + ph.slice(1)}`;
}
function paintSky() { applyDaylight(scene, world, S().time.minutes, loc === 'hostel'); }
on('time:tick', () => { paintClock(); if (loc === 'campus') paintSky(); checkLightsOut(); });
on('state:loaded', () => { paintClock(); paintSky(); updateObjective(); });

// ---- Autosave: after every important choice, mission change and change of time of day ----
const save = () => { try { autosave(); } catch (e) { console.warn('Autosave skipped:', e); } };
on('choice:made', save); on('mission:changed', save); on('time:phase', save);

// ---- Landing page: floating gold embers ----
{
  const box = $('embers');
  for (let i = 0; i < 22; i++) {
    const e = document.createElement('i');
    e.style.cssText = `left:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 8}s;--delay:${-Math.random() * 12}s;--x:${(Math.random() - 0.5) * 120}px`;
    box.appendChild(e);
  }
}

// ---- Load the 3D models while the landing page shows; Start unlocks when ready ----
{
  const btn = $('startBtn'), label = btn.querySelector('span'), ready = label.textContent;
  btn.disabled = true;
  const show = (d, t) => { label.textContent = t ? `Loading ${Math.round((d / t) * 100)}%` : 'Loading...'; };
  show(0, 0);
  loadAllModels(show)
    .then(() => applyModels({ scene, world }))
    .catch(e => console.warn('Model upgrade skipped:', e))
    .finally(() => { label.textContent = ready; btn.disabled = false; });
}

// ---- ?debug shows frame rate, draw calls and triangles ----
const debugBox = new URLSearchParams(location.search).has('debug') ? document.body.appendChild(Object.assign(document.createElement('div'), {
  style: 'position:fixed;left:8px;bottom:8px;z-index:99;background:#000b;color:#7CFC00;font:12px monospace;padding:6px 8px;border-radius:6px;white-space:pre;pointer-events:none',
})) : null;
let dbgFrames = 0, dbgT = performance.now();
if (debugBox) window.__ncl = { player, camera, input, scene, renderer, bus, world, hostel, getState, apply, enterHostel: () => enterHostel(), leaveHostel: () => leaveHostel(), lightsOut: () => lightsOut(), forceState: s => { state = s; syncInput(); updateObjective(); }, get loc() { return loc; } };

$('startBtn').onclick = () => {
  $('start').classList.add('leaving');
  setTimeout(() => { $('start').hidden = true; }, 600);
  state = 'bus'; updateObjective(); paintClock(); paintSky();
  document.body.classList.add('playing'); $('sideBtns').hidden = false; $('minimap').hidden = false;
  startMusic();                                   // sound is allowed now: the player just tapped
  if (help.firstTime()) help.open();
  syncInput();
  document.documentElement.requestFullscreen?.().catch(() => {});
  navigator.serviceWorker?.register('/sw.js').catch(() => {});
};

// ---- A story card (title, text, buttons) ----
function showCard(title, text, buttons) {
  const box = $('choiceText'); box.textContent = '';
  const h = document.createElement('b'); h.textContent = title; box.appendChild(h);
  box.appendChild(document.createTextNode('\n\n' + text));
  $('choiceResult').hidden = true;
  const wrap = $('choiceBtns'); wrap.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button'); el.textContent = b.label;
    el.onclick = () => { $('choice').hidden = true; b.onClick?.(); };
    wrap.appendChild(el);
  }
  $('choice').hidden = false;
}

// ---- Registration (a short stub, then M-01 begins) ----
function atGate() {
  state = 'registration'; syncInput();
  const r = INTRO.registration;
  showCard(say(r.title), say(r.text), [{
    label: say(r.button),
    onClick: () => {
      applyAll([{ item: 'id_card', give: true }, { item: 'bed_slip', give: true }, { flag: 'registered' }, { mission: 'M-01', status: 'active' }]);
      state = 'play'; syncInput(); updateObjective();
    },
  }]);
}

// ---- Moving between the campus and the hostel ----
function setLocation(next) {
  loc = next;
  const indoors = loc === 'hostel';
  world.group.visible = !indoors; bus.visible = !indoors;
  hostel.group.visible = indoors;
  for (const p of PEOPLE) p.group.visible = (p.group.userData.loc || 'campus') === loc;
  $('minimap').style.visibility = indoors ? 'hidden' : 'visible';
  paintSky(); updateObjective();
  lastTarget = null;
}
function enterHostel() {
  setLocation('hostel');
  player.position.set(hostel.spawn.x, 0, hostel.spawn.z); player.rotation.y = Math.PI;
  input.yaw = 0;
  Object.assign(cam, INDOOR_VIEW); camera.fov = cam.fov; camera.updateProjectionMatrix();     // snap to the indoor view
  camera.position.set(player.position.x, cam.h, player.position.z + cam.dist);
  toast(`<b>🏠 Hostel Block A</b><br>${say(M01.objective.inside)}`);
}
function leaveHostel() {
  setLocation('campus');
  player.position.set(world.hostelDoor.x, 0, world.hostelDoor.z + 0.4); player.rotation.y = 0;
  input.yaw = Math.PI;
  Object.assign(cam, VIEWS[view]); camera.fov = cam.fov; camera.updateProjectionMatrix();
  camera.position.set(player.position.x + Math.sin(input.yaw) * cam.dist, cam.h, player.position.z + Math.cos(input.yaw) * cam.dist);
}

// ---- Using what is in front of you: talk, inspect, open a door ----
let nearby = null;
const VERB = { talk: 'Talk', inspect: 'Inspect', door: 'Enter' };
function interact() {
  if (!nearby || isTalking() || !canMove()) return;
  const it = nearby;
  if (it.kind === 'door') {
    if (it.id === 'door:hostel') return enterHostel();
    // the hostel door back out
    if (S().flags.m01_resolved || m01Done()) return leaveHostel();
    $('talkBtn').hidden = true;
    startDialogue('m01_exit', () => { syncInput(); if (S().flags.m01_out_off_campus) { leaveHostel(); lightsOut(); } });
    syncInput(); return;
  }
  faceToward(it, player.position);
  const at = it.ref || it;
  player.rotation.y = Math.atan2(at.x - player.position.x, at.z - player.position.z);
  animatePlayer(player, 0, 0);
  $('talkBtn').hidden = true;
  startDialogue(it.id, () => { syncInput(); updateObjective(); if (pendingSleep) { pendingSleep = false; lightsOut(); } });
  syncInput();
}
$('talkBtn').onclick = interact;
input.onInteract = interact;

// ---- Lights out: the end of M-01 and the cliffhanger ----
let pendingSleep = false, lightsOutRunning = false;
on('m01:sleep', () => { pendingSleep = true; });

function checkLightsOut() {                       // 10 pm and still no bed: fail-forward, never a dead end
  const t = S().time;
  if (state !== 'play' || lightsOutRunning || m01Done() || S().missions['M-01'] !== 'active') return;
  if (t.minutes >= 22 * 60 && !S().flags.m01_resolved && !isTalking()) {
    applyAll([{ flag: 'm01_resolved' }, { flag: 'm01_out_floor' }, { health: -5 }, { stress: 10 }, { item: 'corridor_floor', give: true }]);
    lightsOut();
  }
}

function lightsOut() {
  if (lightsOutRunning || m01Done()) return;
  lightsOutRunning = true; state = 'cutscene'; syncInput();
  if (S().time.minutes < 22 * 60 && S().time.minutes >= 5 * 60) skipTo(22, 0);
  const lo = INTRO.lightsOut, f = S().flags;
  const key = Object.keys(lo.byOutcome).find(k => f[k]);
  $('fadeTitle').textContent = say(lo.title);
  $('fadeText').textContent = say(key ? lo.byOutcome[key] : lo.default);
  $('fade').hidden = false;
  setTimeout(() => {
    apply({ message: { from: INTRO.cliffhanger.from, text: INTRO.cliffhanger.text } });
    apply({ mission: 'M-01', status: 'done' });
    $('fade').hidden = true;
    const e = INTRO.end;
    showCard(say(e.title), say(e.text), [
      { label: say(e.button), onClick: () => { state = 'play'; lightsOutRunning = false; syncInput(); updateObjective(); } },
      { label: say(e.phone), onClick: () => { state = 'play'; lightsOutRunning = false; syncInput(); togglePhone(); } },
    ]);
  }, 4200);
}

// ---- Loop ----
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), head = new THREE.Vector3();
const VIEWS = { follow: { dist: 8, h: 4.5, fov: 60, look: 1.6 }, aerial: { dist: 8, h: 19, fov: 55, look: 0.6 } };
const INDOOR_VIEW = { dist: 5.2, h: 9.5, fov: 55, look: 1.0 };
const cam = { ...VIEWS.follow };
let view = 'follow';
function toggleView() {
  view = view === 'follow' ? 'aerial' : 'follow';
  toast('<b>Camera</b><br>' + (view === 'aerial' ? '🛰️ Aerial view: see the whole campus from above' : '🎥 Follow view'));
}
$('viewBtn').onclick = toggleView;
// Where along the line from a to b (0..1) the first solid object is hit; 1 = nothing in the way
function firstBlock(a, b, boxes) {
  let best = 1; const M = 0.3;
  const d = [b.x - a.x, b.y - a.y, b.z - a.z], o = [a.x, a.y, a.z];
  for (const bx of boxes) {
    const lo = [bx.minX - M, (bx.minY ?? 0) - M, bx.minZ - M], hi = [bx.maxX + M, bx.maxY + M, bx.maxZ + M];
    let t0 = 0, t1 = 1;
    for (let i = 0; i < 3 && t0 <= t1; i++) {
      if (Math.abs(d[i]) < 1e-6) { if (o[i] < lo[i] || o[i] > hi[i]) t0 = 2; continue; }
      let ta = (lo[i] - o[i]) / d[i], tb = (hi[i] - o[i]) / d[i];
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    if (t0 <= t1 && t0 > 0 && t0 < best) best = t0;
  }
  return best;
}
const SPEED = 6;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'bus') {                       // bus rolls in from the left and stops at the pavement
    const target = -12;
    bus.position.x += Math.max(2, (target - bus.position.x) * 1.2) * dt * 1.5;
    if (bus.position.x >= target - 0.2) { bus.position.x = target; state = 'walk'; syncInput(); updateObjective(); }
  }

  if (canMove()) advanceReal(dt);              // the game clock only runs while you can actually play

  input.update();
  const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
  const fx = -sin, fz = -cos, rx = cos, rz = -sin;     // forward / right on the ground
  const vx = (fx * input.moveY + rx * input.moveX) * SPEED * dt;
  const vz = (fz * input.moveY + rz * input.moveX) * SPEED * dt;
  const B = loc === 'hostel' ? hostel.bounds : campusBounds;
  let nx = THREE.MathUtils.clamp(player.position.x + vx, B.minX, B.maxX);
  let nz = THREE.MathUtils.clamp(player.position.z + vz, B.minZ, B.maxZ);
  const boxes = loc === 'hostel' ? hostel.colliders : world.colliders;
  if (loc === 'campus') {
    // The perimeter wall blocks everywhere except the gate opening
    if (Math.abs(nx) > 4.6 && Math.abs(nz) < 1.6) nz = player.position.z;
    if (Math.abs(nx) > 4.6 && Math.abs(player.position.z) < 1.6) nx = player.position.x;
  }
  // Buildings, walls, furniture, trees: slide along them (player radius 0.5)
  const R = 0.5, hit = (x, z) => boxes.some(c => x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R);
  if (hit(nx, player.position.z)) nx = player.position.x;
  if (hit(nx, nz)) nz = player.position.z;
  if (loc === 'campus') {                      // the bus is solid
    const bc = bus.userData.collide;
    if (nx > bus.position.x + bc.minX && nx < bus.position.x + bc.maxX && Math.abs(nz - bus.position.z) < bc.halfZ) { nx = player.position.x; nz = player.position.z; }
  }
  const moved = Math.hypot(nx - player.position.x, nz - player.position.z);
  if (moved > 0) {
    const target = Math.atan2(nx - player.position.x, nz - player.position.z);
    let d = target - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.rotation.y += d * Math.min(1, dt * 14);   // turn smoothly
  }
  animatePlayer(player, Math.min(1, moved / (SPEED * dt || 1)), dt);
  player.position.x = nx; player.position.z = nz;

  updateNPCs(dt, clock.elapsedTime);
  {                                                  // guide: arrow, beacon, map
    const target = currentTarget();
    if (target !== lastTarget) { lastTarget = target; beacon.set(target); }
    beacon.update(clock.elapsedTime);
    updateWaypoint(player.position, input.yaw, target, canMove());
    if (state !== 'intro' && loc === 'campus' && (map.isOpen || ++miniTick % 2 === 0)) map.update(player.position.x, player.position.z, input.yaw, target, clock.elapsedTime, true);
    else if (map.isOpen && loc === 'hostel') map.update(world.hostelDoor.x, world.hostelDoor.z, input.yaw, null, clock.elapsedTime, true);
  }
  nearby = state === 'play' ? updateInteractables(clock.elapsedTime, player.position, loc) : null;
  const showTalk = nearby && canMove();
  $('talkBtn').hidden = !showTalk;
  if (showTalk) {
    const verb = nearby.kind === 'door' && nearby.id === 'door:campus' ? 'Leave' : VERB[nearby.kind] || TEXT.talk;
    $('talkBtn').innerHTML = `${verb} <small>${nearby.name}${matchMedia('(pointer: fine)').matches ? ' · press E' : ''}</small>`;
  }
  if (state === 'walk' && player.position.z < -2) atGate();

  // Camera: follow view or aerial view, and a wall, tree or building never hides the player
  {
    const V = loc === 'hostel' ? INDOOR_VIEW : VIEWS[view], k = Math.min(1, dt * 3);
    for (const key of ['dist', 'h', 'fov', 'look']) cam[key] += (V[key] - cam[key]) * k;
    if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    head.set(player.position.x, 1.8, player.position.z);
    camPos.set(player.position.x + sin * cam.dist, cam.h, player.position.z + cos * cam.dist);
    const t = loc === 'hostel' ? 1 : firstBlock(head, camPos, world.occluders), blocked = t < 1;
    if (blocked) {                                   // pull the camera in front of the obstacle, and lift it a little to peek over
      const keep = Math.max(2.2 / head.distanceTo(camPos), t - 0.06);
      camPos.lerpVectors(head, camPos, keep); camPos.y += (1 - keep) * 3;
    }
    camera.position.lerp(camPos, blocked ? 0.35 : 1 - Math.pow(0.001, dt));
    camera.lookAt(player.position.x, cam.look, player.position.z);
  }

  if (state !== 'intro') renderer.render(scene, camera);   // no need to draw behind the landing page
  if (debugBox && ++dbgFrames >= 30) {
    const now = performance.now(), i = renderer.info.render;
    debugBox.textContent = `${Math.round(dbgFrames * 1000 / (now - dbgT))} fps
${i.calls} draw calls
${(i.triangles / 1000).toFixed(1)}k triangles`;
    dbgFrames = 0; dbgT = now;
  }
  requestAnimationFrame(frame);
}
setLocation('campus');
paintClock();
frame();
