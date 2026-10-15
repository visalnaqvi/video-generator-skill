#!/usr/bin/env node
// Generates AI set candidates for a universe from its sets/prompts.json (location + style words per set):
//   node studio/scripts/ai-art/batch.mjs studio/library/universes/<u>/sets/prompts.json [set-id …] [--n 4] [--seed 11]
// For each set: sets/<id>/init.png (the code-drawn layout) → sets/<id>/cand-1..n.png (Flux image-to-image)
// → sets/<id>/cands.png (one labelled sheet to pick from). Prints compact JSON. Then grade.mjs, depth.py,
// split.mjs on the pick (universe skill → Sets).

import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const file = resolve(args[0]);
const cfg = JSON.parse(await readFile(file, 'utf8'));
const dir = dirname(file);
const pick = args.slice(1).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] ?? '').startsWith('--'));
const ids = pick.length ? pick : Object.keys(cfg.sets);
const n = Number(opt('n', 4)), seed = Number(opt('seed', 11));
const out = [];
for (const id of ids) {
  const s = cfg.sets[id];
  if (!s) { console.warn(`! no prompt for ${id}`); continue; }
  const prompt = [s.location, cfg.style, s.text ? '' : cfg.noText].filter(Boolean).join(', ');
  const r = spawnSync(process.execPath, [join(HERE, 'comfy.mjs'), 'detail', '--init', join(dir, id, 'init.png'), '--prompt', prompt,
    '--denoise', String(s.denoise ?? 0.88), '--n', String(n), '--seed', String(seed), '--out', join(dir, id, 'cand.png')], { encoding: 'utf8' });
  if (r.status !== 0) { console.warn(`! ${id}: ${r.stderr.slice(-300)}`); continue; }
  const files = Array.from({ length: n }, (_, i) => join(dir, id, `cand-${i + 1}.png`));
  const tiles = await Promise.all(files.map((f) => sharp(f).resize(300, 530).png().toBuffer()));
  const labels = files.map((_, i) => ({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="36"><rect width="300" height="36" fill="#000" opacity="0.6"/><text x="10" y="25" font-family="Consolas, monospace" font-size="20" fill="#fff">${id} · ${i + 1}</text></svg>`), left: i * 306, top: 0 }));
  await sharp({ create: { width: n * 306, height: 530, channels: 3, background: '#888' } }).composite([...tiles.map((input, i) => ({ input, left: i * 306, top: 0 })), ...labels]).png().toFile(join(dir, id, 'cands.png'));
  out.push({ id, sheet: join(dir, id, 'cands.png').replace(/\\/g, '/') });
}
console.log(JSON.stringify({ made: out }));
