#!/usr/bin/env node
// Turns a picked AI candidate into set planes in one go (after batch.mjs):
//   node studio/scripts/ai-art/finish.mjs <universe>/sets/<id> --pick <n> --horizon <%> [--ref-horizon <%>]
//        [--amount 0.95] [--l-amount 0.6] [--margin 0.05] [--sky 0.06] [--front-below <y%>]
// cand-<n>.png → source-ai.png → grade.mjs against init.png (the code-drawn layout = the universe palette)
// → source-graded.png → depth.py (Depth Anything V2, ComfyUI's Python) → split.mjs → <id>-{sky,ground,near}.png
// (+ <id>-planes.json, <id>-depth.png). Interiors: --horizon 0 (no sky; the backdrop is the whole room).

import { spawnSync } from 'node:child_process';
import { copyFile, readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiConfig } from './paths.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const cfg = aiConfig(); // per-PC tool paths: paths.mjs
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const dir = resolve(args[0]);
const id = basename(dir);
const pick = opt('pick');
if (!pick) { console.error('--pick <n> is required'); process.exit(1); }
const horizon = opt('horizon', '50'), refH = opt('ref-horizon', horizon);
const run = (exe, a) => { const r = spawnSync(exe, a, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${basename(a[0] ?? exe)}: ${(r.stderr || r.stdout).slice(-400)}`); return r.stdout.trim().split('\n').pop(); };

await copyFile(join(dir, `cand-${pick}.png`), join(dir, 'source-ai.png'));
const graded = JSON.parse(run(process.execPath, [join(HERE, 'grade.mjs'), '--image', join(dir, 'source-ai.png'), '--ref', join(dir, 'init.png'), '--out', join(dir, 'source-graded.png'),
  '--horizon', horizon, '--ref-horizon', refH, '--amount', opt('amount', '0.95'), '--l-amount', opt('l-amount', '0.6')]));
const py = join(cfg.comfyRoot, 'python_embeded', 'python.exe');
run(py, ['-s', join(HERE, 'depth.py'), join(dir, 'source-ai.png'), join(dir, 'depth16.png'), cfg.depthModel]);
const planes = JSON.parse(run(process.execPath, [join(HERE, 'split.mjs'), '--image', join(dir, 'source-graded.png'), '--depth', join(dir, 'depth16.png'), '--out', join(dir, id),
  '--horizon', horizon, '--margin', opt('margin', '0.05'), '--sky', opt('sky', '0.06'), ...(opt('front-below') ? ['--front-below', opt('front-below')] : [])]));
console.log(JSON.stringify({ id, pick: Number(pick), grade: { sky: graded.sky, land: graded.land }, sky: planes.sky, near: planes.near }));
