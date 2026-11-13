// Swaps the simple built-in shapes for real 3D models, one area at a time.
// Each step only runs if its models loaded; otherwise the old shapes stay.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { preload, cloneModel, instanceModel, fitToFootprint, loadProgress } from './assets.js';
import { PEOPLE } from './models.js';
import { createCharacter } from './characters.js';

// Every model file the game wants (names in public/models, without .glb)
export const MODEL_LIST = [
  'ground/grass-large', 'ground/grass-leafs', 'ground/flower-red', 'ground/flower-yellow', 'ground/flower-purple',
  'ground/bush', 'ground/bush-large', 'ground/rock-a', 'ground/rock-b',
  'trees/palm-tall', 'trees/palm-detailed', 'trees/palm-short', 'trees/oak', 'trees/fat',
  'buildings/lecture', 'buildings/admin', 'buildings/library', 'buildings/hostel', 'buildings/block-a', 'buildings/block-b',
  'props/awning', 'props/parasol', 'vehicles/danfo',
  'characters/male', 'characters/female', 'characters/anims',
];

export async function loadAllModels(onProgress) { await preload(MODEL_LIST, onProgress); }

// Small repeatable pseudo-random numbers so the scenery looks the same every visit
const rng = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42);

const ok = name => !loadProgress.failed.includes(name);

// Which model for which building, how tall it should be, and whether it must be turned round.
// To flip a building that faces the wrong way, change `ry` to Math.PI.
const BUILDING_MODELS = {
  lecture: { model: 'buildings/lecture', ry: 0 },
  admin:   { model: 'buildings/admin',   ry: 0 },
  library: { model: 'buildings/library', ry: 0 },
  'block-a': { model: 'buildings/block-a', ry: 0 },
  'block-b': { model: 'buildings/block-b', ry: 0 },
  hostel:  { model: 'buildings/hostel',  ry: 0 },
};

// ctx = { scene, world }
export async function applyModels({ scene, world }) {
  await Promise.all([groundDressing(scene, world), trees(world), flowers(world), buildings(world), props(world), danfo(world)]
    .map(p => p.catch(e => console.warn('Upgrade step skipped:', e))));
  await characters().catch(e => console.warn('Characters skipped:', e));
  const r = bakeStatic(world.group);
  console.info('Static batching:', r.before, 'meshes ->', r.after);
}

// ---- Step 1: ground dressing (grass tufts, bushes, rocks, flowers along the edges) ----
async function groundDressing(scene, world) {
  // Keep clear of paths, plaza and buildings
  const clear = (x, z) => {
    if (Math.abs(x) < 6.5 && z > -58 && z < 24) return false;                    // avenue + forecourt
    if (Math.abs(x) < 13 && z > -31 && z < -9) return false;                     // plaza
    if (z > 18 && z < 36) return false;                                          // pavement + road
    if (Math.abs(z) < 2.5) return false;                                         // wall line
    if (world.colliders.some(c => x > c.minX - 1.5 && x < c.maxX + 1.5 && z > c.minZ - 1.5 && z < c.maxZ + 1.5)) return false;
    return true;
  };
  const spread = (n, xr, zr) => {
    const out = [];
    for (let i = 0, tries = 0; out.length < n && tries < n * 6; tries++, i++) {
      const x = (rng() - 0.5) * xr, z = -4 - rng() * zr;
      if (clear(x, z)) out.push({ x, z, ry: rng() * 6.28, s: 2.2 + rng() * 1.6 });
    }
    return out;
  };
  const add = async (name, placements) => {
    if (!ok(name)) return;
    const gp = await instanceModel(name, placements);
    if (gp) world.group.add(gp);
  };
  await Promise.all([
    add('ground/grass-large', spread(120, 120, 60)),
    add('ground/grass-leafs', spread(80, 120, 60)),
    add('ground/bush', spread(36, 110, 58).map(p => ({ ...p, s: 3 + rng() * 2 }))),
    add('ground/bush-large', spread(14, 100, 56).map(p => ({ ...p, s: 3.5 + rng() * 2 }))),
    add('ground/rock-a', spread(14, 110, 56).map(p => ({ ...p, s: 2 + rng() * 2 }))),
    add('ground/rock-b', spread(10, 110, 56).map(p => ({ ...p, s: 2 + rng() * 2 }))),
    add('ground/flower-yellow', spread(30, 100, 54).map(p => ({ ...p, s: 3 }))),
    add('ground/flower-red', spread(24, 100, 54).map(p => ({ ...p, s: 3 }))),
    add('ground/flower-purple', spread(24, 100, 54).map(p => ({ ...p, s: 3 }))),
  ]);
}

// ---- Step 3a: trees (palms and shade trees, instanced) ----
async function trees(world) {
  const kinds = ['trees/palm-tall', 'trees/palm-detailed', 'trees/palm-short', 'trees/oak', 'trees/fat'].filter(ok);
  if (!kinds.length) return;                                                     // keep the old trees
  const spots = [...world.treeSpots];
  // a few extra trees along the inside of the wall and the back of the campus
  for (let i = 0; i < 26; i++) {
    const x = (rng() - 0.5) * 120, z = -6 - rng() * 52;
    if (Math.abs(x) < 9 || world.colliders.some(c => x > c.minX - 3 && x < c.maxX + 3 && z > c.minZ - 3 && z < c.maxZ + 3)) continue;
    spots.push([x, z]);
  }
  const groups = kinds.map(() => []);
  spots.forEach(([x, z], i) => groups[i % kinds.length].push({ x, z, y: 0.05 * 6, ry: rng() * 6.28, s: 5 + rng() * 2.5 }));
  for (let k = 0; k < kinds.length; k++) {
    const gp = await instanceModel(kinds[k], groups[k]);
    if (gp) world.group.add(gp);
  }
  world.treesG.visible = false;
}

// ---- Step 3b: flower beds ----
async function flowers(world) {
  const by = { 0xe53935: 'ground/flower-red', 0xfdd835: 'ground/flower-yellow', 0xec407a: 'ground/flower-purple' };
  const lists = {};
  for (const [x, z, c] of world.flowerSpots) (lists[by[c] || 'ground/flower-red'] ||= []).push({ x, y: 0.4, z, ry: rng() * 6.28, s: 5 });
  let any = false;
  for (const [name, list] of Object.entries(lists)) {
    if (!ok(name)) continue;
    const gp = await instanceModel(name, list);
    if (gp) { world.group.add(gp); any = true; }
  }
  if (any) world.flowersG.visible = false;
}

// ---- Step 2: buildings ----
async function buildings(world) {
  for (const b of world.buildingList) {
    const spec = BUILDING_MODELS[b.id];
    if (!spec || !ok(spec.model)) continue;
    const m = await cloneModel(spec.model);
    if (!m) continue;
    const pivot = new THREE.Group(); pivot.add(m);
    m.rotation.y = spec.ry;
    fitToFootprint(m, Math.max(b.w, b.d * 1.6));        // sized to the old building's footprint
    const hNow = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).y;
    if (hNow > b.h * 1.25) {                              // not taller than ~1.25x the old building
      m.scale.multiplyScalar((b.h * 1.25) / hNow); m.position.y = 0;
      m.position.y -= new THREE.Box3().setFromObject(m).min.y;
    }
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    m.position.x -= c.x; m.position.z -= c.z;
    pivot.position.set(b.x, 0, b.z);
    world.group.add(pivot);
    b.parts.visible = false;
    if (b.sign) { b.sign.position.set(b.x, Math.min(size.y * 0.5, 5.2), b.z + size.z / 2 + 0.15); }   // our own banner on the new facade
    // Collision follows the real model
    const foot = { minX: b.x - size.x / 2, maxX: b.x + size.x / 2, minZ: b.z - size.z / 2, maxZ: b.z + size.z / 2 };
    world.colliders.push(foot); world.occluders.push({ ...foot, minY: 0, maxY: size.y });
    if (b.id === 'hostel') { world.hostelDoor.x = b.x; world.hostelDoor.z = foot.maxZ + 1.6; }   // the door moves with the real model
  }
}

// ---- Step 3c: parasols and the kiosk awning ----
async function props(world) {
  if (ok('props/awning')) {
    const a = await cloneModel('props/awning');
    if (a) {
      fitToFootprint(a, 5.4); a.position.set(-14, a.position.y, -5.6);
      world.group.add(a); world.awningG.visible = false;
    }
  }
  if (ok('props/parasol')) {
    for (const [x, z] of [[-12.5, -27.5], [12.5, -27.5], [-12.5, -38], [12.5, -38]]) {
      const p = await cloneModel('props/parasol');
      if (!p) break;
      fitToFootprint(p, 3.2); p.position.x += x; p.position.z += z;
      world.group.add(p);
    }
  }
}

// ---- Step 3d: the danfo ----
async function danfo(world) {
  if (!ok('vehicles/danfo')) return;
  const m = await cloneModel('vehicles/danfo');
  if (!m) return;
  const pivot = new THREE.Group(); pivot.add(m);
  m.rotation.y = Math.PI / 2;                                // the van faces +z; the bus drives along +x
  const box0 = new THREE.Box3().setFromObject(m), k = 7.6 / (box0.max.x - box0.min.x);
  m.scale.setScalar(k);
  const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3());
  m.position.set(-c.x, -b.min.y, -c.z);
  const bus = world.bus;
  bus.children.slice().forEach(ch => { ch.visible = false; });  // hide the old box-bus
  m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive.set(0x3a2d00); } });   // lift the yellow in shade
  bus.add(pivot);
  bus.userData.collide = { minX: -b.getSize(new THREE.Vector3()).x / 2 - 0.5, maxX: b.getSize(new THREE.Vector3()).x / 2 + 0.5, halfZ: 2.5 };
}

// ---- Performance: merge static boxes that share a material into one mesh each (hundreds of draws -> dozens) ----
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), used = [];
  const hiddenAbove = o => { for (let p = o; p && p !== root.parent; p = p.parent) if (!p.visible) return true; return false; };
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.material.map || o.material.isMeshBasicMaterial) return;
    if (hiddenAbove(o)) return;
    const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld);
    const flat = geo.index ? geo.toNonIndexed() : geo;
    for (const k of Object.keys(flat.attributes)) if (!['position', 'normal', 'uv'].includes(k)) flat.deleteAttribute(k);
    if (!flat.attributes.uv) continue_(flat);
    (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(flat);
    used.push(o);
  });
  used.forEach(o => o.removeFromParent());
  let meshes = 0;
  for (const [material, geos] of byMat) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const m = new THREE.Mesh(merged, material); m.frustumCulled = false; root.add(m); meshes++;
  }
  return { before: used.length, after: meshes };
}
function continue_(g) { g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); }

// ---- Step 4: real characters replace the simple ones (same position, same animation hooks) ----
async function characters() {
  if (!ok('characters/male') || !ok('characters/female') || !ok('characters/anims')) return;
  let n = 0;
  for (const { group, opts } of PEOPLE) {
    const ch = await createCharacter({
      female: !!opts.female, skin: opts.skin, shirt: opts.top, pants: opts.female ? (opts.skirt ?? opts.bottom) : opts.bottom,
      shoes: opts.shoe, hair: opts.hair, bag: opts.bag === false ? null : (opts.bag ?? 0x37474f), talk: !!group.userData.talk,
    });
    if (!ch) continue;
    group.children.forEach(c => { c.visible = false; });           // hide the simple version
    group.add(ch.object);
    group.userData.char = ch; n++;
  }
  console.info('Characters upgraded:', n);
}
