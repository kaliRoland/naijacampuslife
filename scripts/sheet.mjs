// Dev helper: builds a labelled contact sheet of Kenney preview images so models can be picked by eye.
//   node scripts/sheet.mjs <out.png> <previewDir> name1 name2 ...
import sharp from 'sharp';
import { join } from 'node:path';
const [out, dir, ...names] = process.argv.slice(2);
const W = 200, H = 200, cols = 6, rows = Math.ceil(names.length / cols);
const layers = [];
for (let i = 0; i < names.length; i++) {
  const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 18);
  try {
    layers.push({ input: await sharp(join(dir, names[i] + '.png')).resize(W, H, { fit: 'contain', background: '#2b2f36' }).toBuffer(), left: x, top: y });
  } catch { /* missing preview */ }
  layers.push({ input: Buffer.from(`<svg width="${W}" height="18"><rect width="${W}" height="18" fill="#000"/><text x="4" y="13" font-size="12" fill="#fff" font-family="Arial">${names[i]}</text></svg>`), left: x, top: y + H });
}
await sharp({ create: { width: cols * W, height: rows * (H + 18), channels: 3, background: '#2b2f36' } }).composite(layers).png().toFile(out);
console.log('wrote', out);
