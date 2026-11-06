// Real skinned characters (Quaternius, CC0) with idle / walk / jog / talk animations.
// The free bodies come undressed, so clothes are coloured on at load time by body region:
// skin (head, hands, forearms), shirt (torso, shoulders, upper arms), trousers (hips, legs), shoes (feet).
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadModel } from './assets.js';

const SKIN = 0, SHIRT = 1, PANTS = 2, SHOES = 3;
const regionOfBone = name => {
  if (/^(thigh|calf)_/.test(name) || name === 'pelvis' || name === 'root') return PANTS;
  if (/^(foot|ball)/.test(name)) return SHOES;
  if (/^(spine_|clavicle_|upperarm_)/.test(name)) return SHIRT;
  return SKIN;
};

const bodyMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

// Built once per body type: a non-indexed copy of the body where every triangle knows its region.
function bodyTemplate(gltf, bodyMesh) {
  if (gltf.userData.template) return gltf.userData.template;
  const g = bodyMesh.geometry, bones = bodyMesh.skeleton.bones;
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, idx = g.index.array;
  const vRegion = new Uint8Array(g.attributes.position.count);
  for (let v = 0; v < vRegion.length; v++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; best = si.getComponent(v, k); } }
    vRegion[v] = regionOfBone(bones[best].name);
  }
  const flat = g.toNonIndexed();                                   // 3 vertices per triangle
  const tri = idx.length / 3, region = new Uint8Array(tri * 3);
  for (let t = 0; t < tri; t++) {
    const a = vRegion[idx[t * 3]], b = vRegion[idx[t * 3 + 1]], c = vRegion[idx[t * 3 + 2]];
    const r = (a === b || a === c) ? a : (b === c ? b : a);        // majority wins -> hard clothing edges
    region[t * 3] = region[t * 3 + 1] = region[t * 3 + 2] = r;
  }
  return (gltf.userData.template = { flat, region });
}

const col = new THREE.Color();
function paintBody(template, palette) {
  const n = template.region.length, arr = new Float32Array(n * 3);
  const cols = palette.map(h => new THREE.Color(h));
  for (let i = 0; i < n; i++) { const c = cols[template.region[i]]; arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'skinIndex', 'skinWeight']) g.setAttribute(k, template.flat.attributes[k]);   // shared
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// opts: { female, skin, shirt, pants, shoes, hair, bag, talk }
export async function createCharacter(opts = {}) {
  const gltf = await loadModel(opts.female ? 'characters/female' : 'characters/male');
  const anims = await loadModel('characters/anims');
  if (!gltf || !anims) return null;

  const root = cloneSkinned(gltf.scene);
  const skinned = [];
  root.traverse(o => { if (o.isSkinnedMesh) skinned.push(o); });
  const body = skinned.reduce((a, b) => (b.geometry.attributes.position.count > a.geometry.attributes.position.count ? b : a));
  body.geometry = paintBody(bodyTemplate(gltf, body), [opts.skin ?? 0x8d5524, opts.shirt ?? 0x1e88e5, opts.pants ?? 0x2b3a67, opts.shoes ?? 0xf2f2f2]);
  body.material = bodyMaterial;
  for (const m of skinned) {

    if (m !== body && /hair|brow/i.test(m.material.name || '')) {  // hair colour
      m.material = m.material.clone(); m.material.color.set(opts.hair ?? 0x15110e);
    }
  }
  const holder = new THREE.Group();
  root.scale.setScalar(1.2);
  holder.add(root);
  if (opts.bag) {                                                  // simple backpack, rigid on the torso
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.18), new THREE.MeshLambertMaterial({ color: opts.bag }));
    bag.position.set(0, 1.55, -0.26); holder.add(bag);
  }

  const mixer = new THREE.AnimationMixer(root);
  const act = {};
  for (const clip of anims.animations) act[clip.name] = mixer.clipAction(clip);
  let current = null;
  const play = (name, timeScale = 1) => {
    const next = act[name]; if (!next) return;
    next.timeScale = timeScale;
    if (current === next) return;
    next.reset().play();
    if (current) current.crossFadeTo(next, 0.25, false);
    current = next;
  };
  play(opts.talk ? 'Idle_Talking_Loop' : 'Idle_Loop');
  mixer.update(Math.random() * 3);                                 // so a crowd isn't in perfect sync

  return {
    object: holder,
    // speed: 0 = standing, ~0.6 = walking, ~1 = full pace
    setMove(speed) {
      if (speed < 0.05) play(opts.talk ? 'Idle_Talking_Loop' : 'Idle_Loop');
      else if (speed > 0.8) play('Jog_Fwd_Loop', 1.15);
      else play('Walk_Loop', 0.9 + speed * 0.6);
    },
    update(dt) { mixer.update(dt); },
  };
}
