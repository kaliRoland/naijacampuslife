// Prepares the Quaternius characters for the game:
//  - bodies: slimmed from ~12k to ~4k triangles, big textures dropped (clothes/skin are coloured at runtime)
//  - animations: trimmed from 43 clips to the few we use
// Output goes to art-source/x/_work/, then `npm run models` compresses it into public/models/characters/.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, prune, dedup, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
mkdirSync('art-source/x/_work', { recursive: true });

const SRC = 'art-source/x/Universal_Base_Characters/Universal Base Characters[Standard]/Base Characters/Godot - UE/';
// The pack's .gltf files point at two texture names that are missing from the zip; make copies under those names.
for (const [have, want] of [['T_Hair_1_Normal.png', 'T_Hair_1_Normal_png.png'], ['T_Eye_Normal.png', 'T_Eye_Normal_png.png']]) {
  if (!existsSync(SRC + want)) copyFileSync(SRC + have, SRC + want);
}

const tris = doc => doc.getRoot().listMeshes().flatMap(m => m.listPrimitives().map(p => [m.getName(), (p.getIndices()?.getCount() ?? 0) / 3]));

for (const who of ['Male', 'Female']) {
  const doc = await io.read(`${SRC}Superhero_${who}_FullBody.gltf`);
  console.log(who, 'before:', JSON.stringify(tris(doc)));

  for (const m of doc.getRoot().listMaterials()) {
    m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null);
    m.setMetallicFactor(0); m.setRoughnessFactor(1);
    if (/Superhero|Hair/.test(m.getName())) m.setBaseColorTexture(null);      // body + hair are coloured at runtime
    if (/Hair/.test(m.getName())) m.setBaseColorFactor([0.06, 0.05, 0.04, 1]);
    if (/Superhero/.test(m.getName())) m.setBaseColorFactor([1, 1, 1, 1]);
  }
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives())
    for (const s of ['TEXCOORD_1', 'TEXCOORD_2', 'TEXCOORD_3', 'COLOR_0', 'COLOR_1']) if (p.getAttribute(s)) p.setAttribute(s, null);

  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.26, error: 0.03 }), dedup(), prune());
  console.log(who, 'after: ', JSON.stringify(tris(doc)));
  await io.write(`art-source/x/_work/${who.toLowerCase()}.glb`, doc);
}

// Animations: keep only the clips we use, and drop the mannequin mesh (the characters bring their own body)
const UAL = 'art-source/x/Universal_Animation_Library_Standard_/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb';
const KEEP = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Idle_Talking_Loop', 'Interact'];
const anim = await io.read(UAL);
for (const a of anim.getRoot().listAnimations()) if (!KEEP.includes(a.getName())) a.dispose();
for (const n of anim.getRoot().listNodes()) { if (n.getMesh()) n.setMesh(null); if (n.getSkin()) n.setSkin(null); }
for (const m of anim.getRoot().listMeshes()) m.dispose();
for (const s of anim.getRoot().listSkins()) s.dispose();
await anim.transform(resample(), prune());
console.log('anims kept:', anim.getRoot().listAnimations().map(a => a.getName()).join(', '));
await io.write('art-source/x/_work/anims.glb', anim);
