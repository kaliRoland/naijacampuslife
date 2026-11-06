// Dev helper: guesses which side of a model is its front (the side that sticks out near the ground: doors, awnings).
import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f); let lo = { zmax: -9, zmin: 9 }, hi = { zmax: -9, zmin: 9 }, H = 0, pts = [];
  for (const n of doc.getRoot().listNodes()) { const m = n.getMesh(); if (!m) continue;
    for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); for (let i = 0; i < a.getCount(); i++) { const v = a.getElement(i, []); pts.push(v); H = Math.max(H, v[1]); } } }
  for (const v of pts) { const b = v[1] < H * 0.25 ? lo : hi; b.zmax = Math.max(b.zmax, v[2]); b.zmin = Math.min(b.zmin, v[2]); }
  const front = (lo.zmax - hi.zmax) > (hi.zmin - lo.zmin) ? '+z' : '-z';
  console.log(f.split('/').pop().padEnd(26), 'low z', lo.zmin.toFixed(2), lo.zmax.toFixed(2), ' high z', hi.zmin.toFixed(2), hi.zmax.toFixed(2), ' => front', front);
}
