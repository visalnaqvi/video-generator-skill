#!/usr/bin/env node
// Removes the background from photos (people, products) locally — no API, no cost.
// Writes <name>-cutout.png (transparent, trimmed to the subject) next to each input.
// First run downloads the model into node_modules; later runs are offline.
//
// Usage: node studio/scripts/cutout.mjs <image.jpg|png> [...]
//
// Note: @imgly/background-removal-node bundles an older sharp; loading both sharp builds
// in one process fails on Windows, so trimming runs in a child process.

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import { removeBackground } from '@imgly/background-removal-node';

const inputs = process.argv.slice(2);
if (!inputs.length) { console.error('Usage: node studio/scripts/cutout.mjs <image> [...]'); process.exit(1); }
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

for (const input of inputs) {
  const type = TYPES[extname(input).toLowerCase()];
  if (!type) { console.log(`${input} · skipped: use .jpg or .png`); continue; }
  const out = input.replace(/\.[^.]+$/, '') + '-cutout.png';
  try {
    const blob = await removeBackground(new Blob([await readFile(input)], { type }), { output: { format: 'image/png' } });
    await writeFile(out, Buffer.from(await blob.arrayBuffer()));
    const info = execFileSync(process.execPath, ['-e', `
      const sharp = require('sharp');
      sharp(process.argv[1]).trim({ threshold: 1 }).png().toBuffer()
        .then((b) => sharp(b).toFile(process.argv[1]))
        .then((m) => console.log(m.width + 'x' + m.height));`, out], { encoding: 'utf8' }).trim();
    console.log(`${out} · ${info}`);
  } catch (e) {
    console.log(`${input} · FAILED: ${e.message.split('\n')[0]}`);
  }
}
