// "What do I do and where do I go": a pointer arrow with distance, a gold beacon in the 3D world,
// and a how-to-play card shown the first time (and any time from the ❓ button).
import * as THREE from 'three';

const $ = id => document.getElementById(id);

// ---- Gold light pillar standing at the current destination ----
export function createBeacon(scene) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 16, 12, 1, true), mat); pillar.position.y = 8;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 24), new THREE.MeshBasicMaterial({ color: 0xf2c94c })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15;
  g.add(pillar, ring); g.visible = false; scene.add(g);
  return {
    set(target) { g.visible = !!target; if (target) g.position.set(target.x, 0, target.z); },
    update(t) { if (g.visible) { const s = 1 + Math.sin(t * 3) * 0.12; ring.scale.set(s, s, s); mat.opacity = 0.26 + Math.sin(t * 2.5) * 0.08; } },
  };
}

// ---- Arrow pill: "➤ Supplies Kiosk · 34 m", turning to point at the destination ----
export function updateWaypoint(player, yaw, target, show) {
  const el = $('waypoint');
  if (!show || !target) { el.hidden = true; return; }
  const dx = target.x - player.x, dz = target.z - player.z, dist = Math.hypot(dx, dz);
  if (dist < 3) { el.hidden = true; return; }                                   // you're here
  // direction relative to where the camera looks (forward = up the screen)
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const ang = Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz);
  el.hidden = false;
  $('wpArrow').style.transform = `rotate(${ang}rad)`;
  $('wpName').textContent = target.name;
  $('wpDist').textContent = `${Math.round(dist)} m`;
}

// ---- How to play ----
export function initHelp(text, onClose) {
  const card = $('help');
  const touch = matchMedia('(pointer: coarse)').matches;
  $('helpBody').innerHTML = `
    <p class="help-goal">${text.goal}</p>
    <ol class="help-steps">${text.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <h4>Controls</h4>
    <ul class="help-controls">${(touch ? text.controlsTouch : text.controlsKeys).map(c => `<li>${c}</li>`).join('')}</ul>`;
  $('helpTitle').textContent = text.title;
  const close = () => { card.hidden = true; try { localStorage.setItem('ncl-help-seen', '1'); } catch { /* ignore */ } onClose?.(); };
  $('helpOk').onclick = close;
  return {
    open() { card.hidden = false; },
    isOpen: () => !card.hidden,
    firstTime() { try { return localStorage.getItem('ncl-help-seen') !== '1'; } catch { return true; } },
  };
}
