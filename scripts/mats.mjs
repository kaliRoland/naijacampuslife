// Dev helper: prints material colours of GLB files.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
await MeshoptDecoder.ready;
for (const f of process.argv.slice(2)) {
  const d = await io.read(f);
  console.log(f.split('/').slice(-2).join('/'), d.getRoot().listMaterials().map(m => `${m.getName()}:${m.getBaseColorFactor().map(v => +v.toFixed(2))}`).join(' | '),
    '| prim attrs:', d.getRoot().listMeshes()[0].listPrimitives().map(p => p.listSemantics().join(',')).join(' ; '));
}
