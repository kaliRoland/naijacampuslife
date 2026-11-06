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
import { STARTING_ALLOWANCE, TEXT, GATE_CHOICE } from './data/story.js';
import { CATEGORIES } from './data/prices.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
const { bus, colliders } = buildWorld(scene);
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
const canMove = () => (state === 'walk' || state === 'done') && !isTalking() && $('phone').hidden;
const syncInput = () => { input.enabled = canMove(); };

// ---- Phone ----
initPhone();
$('phoneBtn').onclick = () => { $('phone').hidden = false; $('badge').hidden = true; syncInput(); };
$('phoneClose').onclick = () => { $('phone').hidden = true; syncInput(); };

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

$('startBtn').onclick = () => {
  $('start').classList.add('leaving');
  setTimeout(() => { $('start').hidden = true; }, 600);
  state = 'bus'; objective(TEXT.objective_bus);
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
const camPos = new THREE.Vector3();
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
  if (nx > bus.position.x - 5.2 && nx < bus.position.x + 7.8 && Math.abs(nz - bus.position.z) < 2.4) { nx = player.position.x; nz = player.position.z; }
  const moved = Math.hypot(nx - player.position.x, nz - player.position.z);
  if (moved > 0) {
    const target = Math.atan2(nx - player.position.x, nz - player.position.z);
    let d = target - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    player.rotation.y += d * Math.min(1, dt * 14);   // turn smoothly
  }
  animatePlayer(player, Math.min(1, moved / (SPEED * dt || 1)), dt);
  player.position.x = nx; player.position.z = nz;

  updateNPCs(dt, clock.elapsedTime);
  nearby = state === 'done' ? updateInteractables(clock.elapsedTime, player.position) : null;
  const showTalk = nearby && canMove();
  $('talkBtn').hidden = !showTalk;
  if (showTalk) $('talkBtn').innerHTML = `${TEXT.talk} <small>${nearby.name}${matchMedia('(pointer: fine)').matches ? ' · press E' : ''}</small>`;
  if (state === 'walk' && player.position.z < -2) atGate();

  // Third-person follow camera
  camPos.set(player.position.x + sin * 8, 4.5, player.position.z + cos * 8);
  camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, 1.6, player.position.z);

  if (state !== 'intro') renderer.render(scene, camera);   // no need to draw behind the landing page
  requestAnimationFrame(frame);
}
frame();
