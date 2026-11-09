import * as THREE from 'three';
import { buildWorld } from './game/world.js';
import { createNPCs, updateNPCs } from './game/npcs.js';
import { createInteractables, updateInteractables, faceToward } from './game/interact.js';
import { makePlayer, animatePlayer } from './game/models.js';
import { setupControls, input } from './game/controls.js';
import { wallet, naira } from './game/wallet.js';
import { game } from './game/state.js';
import { initPhone } from './game/phone.js';
import { startDialogue, isTalking } from './game/dialogue.js';
import { STARTING_ALLOWANCE, TEXT, GATE_CHOICE, HELP } from './data/story.js';
import { TARGETS } from './data/places.js';
import { startMusic, initMusicButton } from './game/audio.js';
import { createMap } from './game/map.js';
import { createBeacon, updateWaypoint, initHelp } from './game/guide.js';
import { CATEGORIES } from './data/prices.js';
import { loadAllModels, applyModels } from './game/upgrade.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
const world = buildWorld(scene);
const { bus, colliders } = world;
createNPCs(scene);
createInteractables(scene);
const player = makePlayer(scene);
player.position.set(0, 0, 23.5);
player.rotation.y = Math.PI;
setupControls(canvas);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---- Game flow: intro -> bus -> walk -> choice -> free roam (Week 2 errands) ----
let state = 'intro';
const canMove = () => (state === 'walk' || state === 'done') && !isTalking() && $('phone').hidden && !map.isOpen && !help.isOpen();
const syncInput = () => { input.enabled = canMove(); };

// ---- Phone ----
initPhone();
$('phoneBtn').onclick = () => { $('phone').hidden = false; $('badge').hidden = true; syncInput(); };
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
  if (e.code === 'Escape') { if (map.isOpen) closeMap(); else if (help.isOpen()) $('helpOk').click(); }
});
// What the player should do next, and where
function currentTarget() {
  if (state === 'walk') return TARGETS.gate;
  if (state !== 'done' || game.flags.registered) return null;
  return (game.inv.photos && game.inv.copies) ? TARGETS.registration : TARGETS.kiosk;
}
let lastTarget = null, miniTick = 0;

// ---- Bank alerts: every transaction pops a short SMS-style alert ----
let toastTimer;
function toast(html) {
  const t = $('toast'); t.innerHTML = html; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}
wallet.onChange(tx => {
  const c = CATEGORIES[tx.category] || CATEGORIES.other;
  toast(`<b>Bank alert · ${tx.amount >= 0 ? 'Credit' : 'Debit'}</b><br>${c.icon} ${tx.amount >= 0 ? '+' : '-'}${naira(tx.amount)}<br>${tx.reason}<br><small>Balance: ${naira(tx.balance)}</small>`);
  $('badge').hidden = $('phone').hidden ? false : true;
});

// ---- Objective follows your progress ----
const objective = t => { $('objective').textContent = t; };
function updateObjective() {
  if (state !== 'done') return;
  if (game.flags.registered) objective(TEXT.objective_registered);
  else if (game.inv.photos && game.inv.copies) objective(TEXT.objective_fee);
  else objective(TEXT.objective_register);
}
document.addEventListener('inventory', updateObjective);

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
if (debugBox) window.__ncl = { player, camera, input, scene, renderer, bus, world };

$('startBtn').onclick = () => {
  $('start').classList.add('leaving');
  setTimeout(() => { $('start').hidden = true; }, 600);
  state = 'bus'; objective(TEXT.objective_bus);
  document.body.classList.add('playing'); $('sideBtns').hidden = false; $('minimap').hidden = false;
  startMusic();                                   // sound is allowed now: the player just tapped
  if (help.firstTime()) help.open();
  syncInput();
  document.documentElement.requestFullscreen?.().catch(() => {});
  navigator.serviceWorker?.register('/sw.js').catch(() => {});
};

function atGate() {
  state = 'choice'; syncInput();
  wallet.add(STARTING_ALLOWANCE, TEXT.bankAlert, 'allowance');
  setTimeout(showChoice, 1800);
}
function showChoice() {
  $('choiceText').textContent = GATE_CHOICE.prompt;
  $('choiceBtns').innerHTML = '';
  GATE_CHOICE.options.forEach(o => {
    const b = document.createElement('button'); b.textContent = o.label;
    b.onclick = () => {
      if (o.cost) wallet.spend(o.cost, o.reason, o.category);
      $('choiceBtns').innerHTML = '';
      $('choiceResult').textContent = o.result; $('choiceResult').hidden = false;
      const ok = document.createElement('button'); ok.textContent = 'Continue';
      ok.onclick = () => { $('choice').hidden = true; state = 'done'; syncInput(); updateObjective(); };
      $('choiceBtns').appendChild(ok);
    };
    $('choiceBtns').appendChild(b);
  });
  $('choiceResult').hidden = true; $('choice').hidden = false;
}

// ---- Talking to people ----
let nearby = null;
function talk() {
  if (!nearby || isTalking() || !canMove()) return;
  const it = nearby;
  faceToward(it, player.position);
  player.rotation.y = Math.atan2(it.x - player.position.x, it.z - player.position.z);
  animatePlayer(player, 0, 0);
  $('talkBtn').hidden = true;
  startDialogue(it.id, () => { syncInput(); updateObjective(); });
  syncInput();
}
$('talkBtn').onclick = talk;
input.onInteract = talk;

// ---- Loop ----
const clock = new THREE.Clock();
const camPos = new THREE.Vector3(), head = new THREE.Vector3();
const VIEWS = { follow: { dist: 8, h: 4.5, fov: 60, look: 1.6 }, aerial: { dist: 8, h: 19, fov: 55, look: 0.6 } };
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
    if (bus.position.x >= target - 0.2) { bus.position.x = target; state = 'walk'; syncInput(); objective(TEXT.objective_walk); }
  }

  input.update();
  const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
  const fx = -sin, fz = -cos, rx = cos, rz = -sin;     // forward / right on the ground
  const vx = (fx * input.moveY + rx * input.moveX) * SPEED * dt;
  const vz = (fz * input.moveY + rz * input.moveX) * SPEED * dt;
  let nx = THREE.MathUtils.clamp(player.position.x + vx, -66, 66);
  let nz = THREE.MathUtils.clamp(player.position.z + vz, -51, 33);
  // The perimeter wall blocks everywhere except the gate opening
  if (Math.abs(nx) > 4.6 && Math.abs(nz) < 1.6) nz = player.position.z;
  if (Math.abs(nx) > 4.6 && Math.abs(player.position.z) < 1.6) nx = player.position.x;
  // Buildings, pillars, trees, fountain: slide along them (player radius 0.5)
  const R = 0.5, hit = (x, z) => colliders.some(c => x > c.minX - R && x < c.maxX + R && z > c.minZ - R && z < c.maxZ + R);
  if (hit(nx, player.position.z)) nx = player.position.x;
  if (hit(nx, nz)) nz = player.position.z;
  // Bus is solid
  const bc = bus.userData.collide;
  if (nx > bus.position.x + bc.minX && nx < bus.position.x + bc.maxX && Math.abs(nz - bus.position.z) < bc.halfZ) { nx = player.position.x; nz = player.position.z; }
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
    if (state !== 'intro' && (map.isOpen || ++miniTick % 2 === 0)) map.update(player.position.x, player.position.z, input.yaw, target, clock.elapsedTime, true);
  }
  nearby = state === 'done' ? updateInteractables(clock.elapsedTime, player.position) : null;
  const showTalk = nearby && canMove();
  $('talkBtn').hidden = !showTalk;
  if (showTalk) $('talkBtn').innerHTML = `${TEXT.talk} <small>${nearby.name}${matchMedia('(pointer: fine)').matches ? ' · press E' : ''}</small>`;
  if (state === 'walk' && player.position.z < -2) atGate();

  // Camera: follow view or aerial view, and a wall, tree or building never hides the player
  {
    const V = VIEWS[view], k = Math.min(1, dt * 3);
    for (const key of ['dist', 'h', 'fov', 'look']) cam[key] += (V[key] - cam[key]) * k;
    if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    head.set(player.position.x, 1.8, player.position.z);
    camPos.set(player.position.x + sin * cam.dist, cam.h, player.position.z + cos * cam.dist);
    const t = firstBlock(head, camPos, world.occluders), blocked = t < 1;
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
frame();
