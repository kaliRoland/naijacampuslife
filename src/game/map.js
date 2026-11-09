// In-game map: a small round mini-map (turns with your camera) and a full-screen campus map.
import { MAP_BOUNDS as B, MAP_GROUND, MAP_WALLS, MAP_SMALL, PLACES } from '../data/places.js';

const $ = id => document.getElementById(id);

export function createMap(world) {
  // ---- The campus drawn once, in world units ----
  const W = B.maxX - B.minX, H = B.maxZ - B.minZ, PX = 4;                      // 4 pixels per world unit
  const layer = document.createElement('canvas'); layer.width = W * PX; layer.height = H * PX;
  const g = layer.getContext('2d');
  g.setTransform(PX, 0, 0, PX, -B.minX * PX, -B.minZ * PX);
  const rect = (x, z, w, d, c) => { g.fillStyle = c; g.fillRect(x - w / 2, z - d / 2, w, d); };
  g.fillStyle = '#5f9a47'; g.fillRect(B.minX, B.minZ, W, H);                 // grass
  MAP_GROUND.forEach(r => rect(...r));
  MAP_WALLS.forEach(([x, z, w, d]) => rect(x, z, w, d, '#e8e0cc'));
  rect(-6.2, 0, 2.8, 2.8, '#e8e0cc'); rect(6.2, 0, 2.8, 2.8, '#e8e0cc');     // gate pillars
  g.fillStyle = '#2e7d32';
  world.treeSpots.forEach(([x, z]) => { g.beginPath(); g.arc(x, z, 1.6, 0, 7); g.fill(); });
  world.buildingList.forEach(b => { rect(b.x, b.z, b.w, b.d, '#8f979e'); g.strokeStyle = '#3d4348'; g.lineWidth = 0.4; g.strokeRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d); });
  MAP_SMALL.forEach(r => rect(...r));
  g.fillStyle = '#4fb3d9'; g.beginPath(); g.arc(0, -20, 3.4, 0, 7); g.fill();  // fountain

  // ---- Mini-map ----
  const mini = $('minimap'), mctx = mini.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2), MS = 112;
  mini.width = mini.height = Math.round(MS * dpr);
  const SCALE = 2.1;                                                          // pixels per world unit on the mini-map

  const star = (c, x, y, r, color) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1.5; c.stroke();
  };

  function drawMini(px, pz, yaw, target, t) {
    const s = mini.width, k = dpr;
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, s, s);
    mctx.save(); mctx.beginPath(); mctx.arc(s / 2, s / 2, s / 2 - 2, 0, 7); mctx.clip();
    mctx.fillStyle = '#243326'; mctx.fillRect(0, 0, s, s);
    mctx.translate(s / 2, s / 2); mctx.rotate(yaw);                           // camera direction points up
    mctx.translate(-px * SCALE * k, -pz * SCALE * k);
    mctx.drawImage(layer, B.minX * SCALE * k, B.minZ * SCALE * k, W * SCALE * k, H * SCALE * k);
    if (target) {                                                              // objective: star, or an edge arrow if far away
      const dx = target.x - px, dz = target.z - pz, d = Math.hypot(dx, dz), lim = (s / 2 - 14 * k) / (SCALE * k);
      const f = d > lim ? lim / d : 1;
      star(mctx, (px + dx * f) * SCALE * k, (pz + dz * f) * SCALE * k, (7 + Math.sin(t * 5) * 1.2) * k, '#f2c94c');
    }
    mctx.restore();
    // you, in the middle, pointing where the camera looks
    mctx.save(); mctx.translate(s / 2, s / 2);
    mctx.beginPath(); mctx.moveTo(0, -7 * k); mctx.lineTo(5.5 * k, 6 * k); mctx.lineTo(0, 3 * k); mctx.lineTo(-5.5 * k, 6 * k); mctx.closePath();
    mctx.fillStyle = '#29b6f6'; mctx.fill(); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5 * k; mctx.stroke();
    mctx.restore();
    mctx.beginPath(); mctx.arc(s / 2, s / 2, s / 2 - 2, 0, 7); mctx.strokeStyle = '#f2c94c'; mctx.lineWidth = 2 * k; mctx.stroke();
  }

  // ---- Full-screen map ----
  const screen = $('mapScreen'), canvas = $('mapCanvas'), ctx = canvas.getContext('2d');
  let isOpen = false;
  function drawFull(px, pz, yaw, target, t) {
    const box = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(200, Math.floor(box.width)), h = Math.max(200, Math.floor(box.height - 120));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; }
    const k = dpr, sc = Math.min(w / W, h / H) * k, ox = (canvas.width - W * sc) / 2, oy = (canvas.height - H * sc) / 2;
    const X = x => ox + (x - B.minX) * sc, Y = z => oy + (z - B.minZ) * sc;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer, ox, oy, W * sc, H * sc);
    ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 2 * k; ctx.strokeRect(ox, oy, W * sc, H * sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.max(11, Math.min(15, w / 28)) * k;
    ctx.font = `700 ${fs}px system-ui, Arial`;
    for (const p of PLACES) {
      const x = X(p.x), y = Y(p.z), label = p.name, side = p.side;
      ctx.textAlign = 'center'; ctx.font = `${fs * 1.5}px system-ui`; ctx.fillStyle = '#000'; ctx.fillText(p.icon, x, y - 2 * k);
      // labels sit under the icon, or beside it where two places are close together
      const lx = side === 'l' ? x - fs * 1.1 : side === 'r' ? x + fs * 1.1 : x, ly = side ? y - 2 * k : y + fs * 1.25;
      ctx.textAlign = side === 'l' ? 'right' : side === 'r' ? 'left' : 'center';
      ctx.font = `700 ${fs}px system-ui, Arial`; ctx.lineWidth = 4 * k; ctx.strokeStyle = '#000c'; ctx.strokeText(label, lx, ly);
      ctx.fillStyle = '#fff'; ctx.fillText(label, lx, ly);
    }
    if (target) star(ctx, X(target.x), Y(target.z), (12 + Math.sin(t * 5) * 2) * k, '#f2c94c');
    // you
    ctx.save(); ctx.translate(X(px), Y(pz)); ctx.rotate(-yaw);                        // north-up map: the arrow shows where the camera looks
    ctx.beginPath(); ctx.moveTo(0, -11 * k); ctx.lineTo(8 * k, 9 * k); ctx.lineTo(0, 5 * k); ctx.lineTo(-8 * k, 9 * k); ctx.closePath();
    ctx.fillStyle = '#29b6f6'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * k; ctx.stroke();
    ctx.restore();
  }

  return {
    get isOpen() { return isOpen; },
    openFull() { isOpen = true; screen.hidden = false; },
    closeFull() { isOpen = false; screen.hidden = true; },
    update(px, pz, yaw, target, t, miniVisible) {
      if (isOpen) drawFull(px, pz, yaw, target, t);
      else if (miniVisible) drawMini(px, pz, yaw, target, t);
    },
  };
}
