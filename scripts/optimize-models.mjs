// Turns raw pack models into small, compressed GLB files for the game.
//   npm run models            (converts everything listed in scripts/models.json)
// Raw packs live in art-source/x/<pack>/ (git-ignored). Output goes to public/models/.
// Each entry: "output-name": { "src": "pack-folder/path/to/file.glb", "simplify": 0.3 (optional ratio) }
import { readFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'node_modules/@gltf-transform/cli/bin/cli.js');
const list = JSON.parse(readFileSync(join(root, 'scripts/models.json'), 'utf8'));
const out = join(root, 'public/models');
mkdirSync(out, { recursive: true });

let total = 0;
for (const [name, spec] of Object.entries(list)) {
  const src = join(root, 'art-source/x', spec.src);
  if (!existsSync(src)) { console.warn('MISSING', spec.src); continue; }
  const dest = join(out, name + '.glb');
  mkdirSync(dirname(dest), { recursive: true });
  const args = [cli, 'optimize', src, dest, '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', String(spec.textureSize || 1024)];
  if (spec.simplify) args.push('--simplify', 'true', '--simplify-ratio', String(spec.simplify), '--simplify-error', '0.02');
  else args.push('--simplify', 'false');
  if (spec.keepNodes) args.push('--join', 'false', '--instance', 'false', '--flatten', 'false', '--palette', 'false');
  try {
    execFileSync('node', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    const kb = statSync(dest).size / 1024; total += kb;
    console.log(`${name.padEnd(28)} ${kb.toFixed(0).padStart(6)} KB`);
  } catch (e) { console.error('FAILED', name, String(e.stderr || e).slice(0, 300)); }
}
console.log(`TOTAL ${(total / 1024).toFixed(2)} MB`);
