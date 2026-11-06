// Model loading: GLB files (meshopt-compressed) with a cache, cloning and instancing.
// Rule: a model is loaded once; repeats share geometry and materials. If a model fails to load,
// callers keep their simple built-in version so the game never breaks.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const cache = new Map();     // name -> Promise<gltf>
// Kenney's Nature Kit greens are aqua; pull them toward real leaf/grass colours so they match our campus.
const MATERIAL_COLORS = {
  grass: 0x4e8f35, leafsGreen: 0x3f8a3a, leafsGreenDark: 0x2f6f2f, woodBark: 0x8a5a3a, dirt: 0x9a6a46,
  colorRed: 0xd32f2f, colorYellow: 0xfbc02d, colorPurple: 0x8e44ad,
};
export const loadProgress = { done: 0, total: 0, failed: [] };

export function loadModel(name) {
  if (!cache.has(name)) {
    loadProgress.total++;
    cache.set(name, loader.loadAsync(`/models/${name}.glb`).then(
      g => {
        // No environment map in our scenes, so metallic materials would render black. Keep everything matte.
        g.scene.traverse(o => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if ('metalness' in m) { m.metalness = 0; m.roughness = 1; } if (MATERIAL_COLORS[m.name] !== undefined) m.color.set(MATERIAL_COLORS[m.name]); }); });
        loadProgress.done++; return g;
      },
      err => { loadProgress.done++; loadProgress.failed.push(name); console.warn('Model failed:', name, err); return null; },
    ));
  }
  return cache.get(name);
}

// Load many models; resolves when all have finished (or failed). onProgress(done, total).
export async function preload(names, onProgress) {
  const tick = setInterval(() => onProgress?.(loadProgress.done, loadProgress.total), 100);
  await Promise.all(names.map(loadModel));
  clearInterval(tick); onProgress?.(loadProgress.total, loadProgress.total);
}

// A fresh copy that SHARES geometry and materials with the original (cheap).
export async function cloneModel(name) {
  const g = await loadModel(name);
  return g ? g.scene.clone(true) : null;
}

// Many copies of one model in as few draw calls as possible.
// placements: [{ x, y, z, ry, s }]   Returns a Group (or null if the model failed).
export async function instanceModel(name, placements) {
  const g = await loadModel(name);
  if (!g) return null;
  const group = new THREE.Group();
  g.scene.updateMatrixWorld(true);
  const m4 = new THREE.Matrix4(), place = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  g.scene.traverse(o => {
    if (!o.isMesh) return;
    const im = new THREE.InstancedMesh(o.geometry, o.material, placements.length);
    placements.forEach((p, i) => {
      e.set(0, p.ry || 0, 0); q.setFromEuler(e);
      place.compose(new THREE.Vector3(p.x, p.y || 0, p.z), q, new THREE.Vector3().setScalar(p.s || 1));
      m4.multiplyMatrices(place, o.matrixWorld);
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    group.add(im);
  });
  return group;
}

// Scale a model so its longest horizontal side (x/z) equals `size` world units, sitting on y = 0.
export function fitToFootprint(obj, size) {
  const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3());
  const k = size / Math.max(s.x, s.z);
  obj.scale.multiplyScalar(k);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
  return obj;
}

// Tint every material of a model (clones the materials so the original stays untouched).
export function tint(obj, color) {
  obj.traverse(o => {
    if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(color); }
  });
  return obj;
}
