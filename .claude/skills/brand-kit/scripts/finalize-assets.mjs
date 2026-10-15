#!/usr/bin/env node
// Turns chosen candidates into the brand's asset library: reads <brandDir>/assets.json,
// copies each entry's `candidate` (cNN) to its `file` path under assets/, fills in size,
// optionally crops (`crop: {left, top, width, height}` in source px), then removes
// assets/_candidates. Re-runnable: entries without `candidate` are left as they are.
//
// Usage: node finalize-assets.mjs <brandDir>

import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import sharp from 'sharp';

const [brandDir] = process.argv.slice(2);
if (!brandDir) { console.error('Usage: node finalize-assets.mjs <brandDir>'); process.exit(1); }
const indexPath = join(brandDir, 'assets.json');
const index = JSON.parse(await readFile(indexPath, 'utf8'));
const candDir = join(brandDir, 'assets', '_candidates');
const candFiles = await readdir(candDir).catch(() => []);

let n = 0;
for (const a of index.assets) {
  if (!a.candidate) continue;
  const src = candFiles.find((f) => f.startsWith(`${a.candidate}.`));
  if (!src) { console.warn(`! ${a.id}: candidate ${a.candidate} not found`); continue; }
  const dest = join(brandDir, 'assets', a.file);
  await mkdir(dirname(dest), { recursive: true });
  let img = sharp(join(candDir, src));
  if (a.crop) img = img.extract(a.crop);
  await img.toFile(dest);
  const m = await sharp(dest).metadata();
  a.size = `${m.width}x${m.height}`;
  const short = Math.min(m.width, m.height);
  a.quality = short >= 700 ? 'full' : short >= 300 ? 'card' : 'avatar-only';
  delete a.candidate;
  delete a.crop;
  n++;
}
await rm(candDir, { recursive: true, force: true });
index.updated = new Date().toISOString().slice(0, 10);
await writeFile(indexPath, JSON.stringify(index, null, 2));

const byKind = index.assets.reduce((acc, a) => ((acc[a.kind] = (acc[a.kind] || 0) + 1), acc), {});
console.log(`Library: ${index.assets.length} assets (${n} added) · ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log('Removed assets/_candidates');
