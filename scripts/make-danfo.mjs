// Makes the danfo: Kenney's van with its blue paint swapped for danfo yellow.
// Only strongly-blue palette cells change; windows, tyres, lights and greys are untouched.
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mkdirSync } from 'node:fs';

const src = 'art-source/x/kenney_car-kit/Models/GLB format/van.glb';
const out = 'art-source/x/_work/danfo.glb';
mkdirSync('art-source/x/_work', { recursive: true });

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src);
const tex = doc.getRoot().listTextures()[0];

const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let changed = 0;
for (let i = 0; i < data.length; i += 4) {
  const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) continue;
  const s = d / mx;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h >= 205 && h <= 250 && s > 0.35) {            // the van's blue paint
    // keep the brightness, make it yellow (hue 47)
    const v = Math.min(1, mx * 1.7), ns = 0.9, hh = 47 / 60, c = v * ns, x = c * (1 - Math.abs((hh % 2) - 1)), m = v - c;
    const [nr, ng, nb] = hh < 1 ? [c, x, 0] : [x, c, 0];
    data[i] = Math.round((nr + m) * 255); data[i + 1] = Math.round((ng + m) * 255); data[i + 2] = Math.round((nb + m) * 255);
    changed++;
  }
}
const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
tex.setImage(new Uint8Array(png));
await io.write(out, doc);
console.log('danfo written; recoloured pixels:', changed);
