import * as THREE from 'three';
import { buildWorld } from './game/world.js';
import { makePlayer, animatePlayer } from './game/models.js';
import { setupControls, input } from './game/controls.js';
import { wallet, naira } from './game/wallet.js';
import { STARTING_ALLOWANCE, TEXT, GATE_CHOICE } from './data/story.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
const { bus } = buildWorld(scene);
const player = makePlayer(scene);
player.position.set(0, 0, 23.5);
player.rotation.y = Math.PI;
setupControls(canvas);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---- Phone UI ----
const fmtTime = d => d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
function renderPhone() {
  $('bal').textContent = naira(wallet.balance);
  $('txList').innerHTML = wallet.log.map(t => `
    <div class="tx"><div>${t.reason}<small>${fmtTime(t.time)} · Bal ${naira(t.balance)}</small></div>
    <div class="${t.amount >= 0 ? 'in' : 'out'}">${t.amount >= 0 ? '+' : '-'}${naira(t.amount)}</div></div>`).join('');
}
wallet.onChange(renderPhone); renderPhone();

// ---- Game flow: intro -> bus -> walk -> choice -> done ----
let state = 'intro';
const canMove = () => state === 'walk' || state === 'done';
$('phoneBtn').onclick = () => { $('phone').hidden = false; $('badge').hidden = true; input.enabled = false; };
$('phoneClose').onclick = () => { $('phone').hidden = true; input.enabled = canMove(); };

let toastTimer;
function toast(html) {
  const t = $('toast'); t.innerHTML = html; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
}
const objective = t => { $('objective').textContent = t; };

$('startBtn').onclick = () => {
  $('start').hidden = true; state = 'bus'; objective(TEXT.objective_bus);
  document.documentElement.requestFullscreen?.().catch(() => {});
  navigator.serviceWorker?.register('/sw.js').catch(() => {});
};

function atGate() {
  state = 'choice'; input.enabled = false;
  wallet.add(STARTING_ALLOWANCE, TEXT.bankAlert);
  toast(`<b>Bank alert</b><br>Credit: ${naira(STARTING_ALLOWANCE)}<br>${TEXT.bankAlert}`);
  $('badge').hidden = false;
  setTimeout(showChoice, 1800);
}
function showChoice() {
  $('choiceText').textContent = GATE_CHOICE.prompt;
  $('choiceBtns').innerHTML = '';
  GATE_CHOICE.options.forEach(o => {
    const b = document.createElement('button'); b.textContent = o.label;
    b.onclick = () => {
      if (o.cost) wallet.spend(o.cost, o.reason);
      $('choiceBtns').innerHTML = '';
      $('choiceResult').textContent = o.result; $('choiceResult').hidden = false;
      const ok = document.createElement('button'); ok.textContent = 'Continue';
      ok.onclick = () => { $('choice').hidden = true; state = 'done'; input.enabled = true; objective(TEXT.objective_done); };
      $('choiceBtns').appendChild(ok);
    };
    $('choiceBtns').appendChild(b);
  });
  $('choiceResult').hidden = true; $('choice').hidden = false;
}

// ---- Loop ----
const clock = new THREE.Clock();
const camPos = new THREE.Vector3();
const SPEED = 6;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (state === 'bus') {                       // bus rolls in from the left and stops at the pavement
    const target = -12;
    bus.position.x += Math.max(2, (target - bus.position.x) * 1.2) * dt * 1.5;
    if (bus.position.x >= target - 0.2) { bus.position.x = target; state = 'walk'; input.enabled = true; objective(TEXT.objective_walk); }
  }

  input.update();
  const sin = Math.sin(input.yaw), cos = Math.cos(input.yaw);
  const fx = -sin, fz = -cos, rx = cos, rz = -sin;     // forward / right on the ground
  const vx = (fx * input.moveY + rx * input.moveX) * SPEED * dt;
  const vz = (fz * input.moveY + rz * input.moveX) * SPEED * dt;
  let nx = THREE.MathUtils.clamp(player.position.x + vx, -45, 45);
  let nz = THREE.MathUtils.clamp(player.position.z + vz, -45, 33);
  // The perimeter wall blocks everywhere except the gate opening
  if (Math.abs(nx) > 4.6 && Math.abs(nz) < 1.6) nz = player.position.z;
  if (Math.abs(nx) > 4.6 && Math.abs(player.position.z) < 1.6) nx = player.position.x;
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

  if (state === 'walk' && player.position.z < -2) atGate();

  // Third-person follow camera
  camPos.set(player.position.x + sin * 8, 4.5, player.position.z + cos * 8);
  camera.position.lerp(camPos, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x, 1.6, player.position.z);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
frame();
