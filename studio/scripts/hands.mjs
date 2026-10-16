#!/usr/bin/env node
// One still per pose of a universe character standing in a set, with a % grid on top — read where the hands land
// before placing a held prop (cash, phone, papers, a magnifier) at them. Note the hand positions in the set's
// stage notes / the video's board script so they are measured once.
//   node studio/scripts/hands.mjs --set noxverse/collector-study-ai --char victor --x 28 --y 51.6 --h 860 \
//        --view 3/4-right --poses point,shrug,sign,up,phone [--out <png>]
// Views that work for reaching across to someone: 3/4-right reaches to screen right; for 3/4-left the reaching
// arm points away (screen right) — put that character on the left, or use `up` (raised hand) to show an object.
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const set = opt('set'), char = opt('char');
if (!set || !char) { console.error('Usage: node studio/scripts/hands.mjs --set <u>/<set> --char <id> --x --y --h --view [--poses point,shrug,up]'); process.exit(1); }
const [universe] = set.split('/');
const colors = JSON.parse(await readFile(join(ROOT, 'studio/library/universes', universe, 'characters', char, 'character.json'), 'utf8')).colors ?? {};
const place = { x: Number(opt('x', 50)), y: Number(opt('y', 60)), h: Number(opt('h', 800)), view: opt('view', 'front') };
const poses = opt('poses', 'point,shrug,sign,up,phone').split(',');
const grid = [];
for (let p = 5; p < 100; p += 5) {
  const major = p % 10 === 0;
  grid.push({ type: 'shape', shape: 'rect', x: 50, y: p, w: 1080, h: major ? 3 : 1, fill: major ? 'accent/70' : 'white/30', fixed: true });
  grid.push({ type: 'shape', shape: 'rect', x: p, y: 50, w: major ? 3 : 1, h: 1920, fill: major ? 'accent/70' : 'white/30', fixed: true });
  if (major) grid.push({ type: 'text', text: String(p), font: 'mono', size: 26, color: 'white', x: p, y: 2, fixed: true }, { type: 'text', text: String(p), font: 'mono', size: 26, color: 'white', x: 2.5, y: p, fixed: true });
}
const scenes = poses.map((arms) => ({
  id: `${char}-${arms}`, template: 'Composed', durationInFrames: 10, sheetFrame: 5, transition: { type: 'none' },
  props: { set, background: { kind: 'solid', colors: ['primary'] }, layers: [{ type: 'rig', rig: universe, character: char, colors, id: char, z: 0.6, idle: 'still', ...place, pose: { arms, face: 'focused', sweat: false } }, ...grid] },
}));
const tmp = join(ROOT, 'studio', '.stage', 'hands');
await mkdir(tmp, { recursive: true });
const sbPath = join(tmp, 'hands.json');
await writeFile(sbPath, JSON.stringify({ status: 'draft', version: 1, universe, style: 'data-infographic', format: '9:16', fps: 30, scenes }));
const out = resolve(opt('out', join(os.tmpdir(), `hands-${char}.png`)));
const r = spawnSync(process.execPath, [join(ROOT, 'studio/scripts/render.mjs'), sbPath, '--sheet', '--scale', '0.4', '--out', out], { encoding: 'utf8' });
await rm(sbPath, { force: true });
if (r.status !== 0) { console.error(r.stderr.slice(-600)); process.exit(1); }
console.log(JSON.stringify({ sheet: out, set, char, ...place, poses }));
