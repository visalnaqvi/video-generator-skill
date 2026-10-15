#!/usr/bin/env node
// Health check of the studio on this PC: what works, what is missing and the command that fixes it.
//   npm run doctor            (= node studio/scripts/doctor.mjs)     · --json for compact JSON
// FAIL = a pipeline stage cannot run · WARN = optional or downloads on first use · exit code 1 on any FAIL.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statfsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { aiConfig } from './ai-art/paths.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(ROOT, 'package.json'));
const WIN = process.platform === 'win32';
const out = [];
const add = (level, name, detail, fix) => out.push({ level, name, detail, ...(fix ? { fix } : {}) });
const quiet = (cmd, a, o = {}) => spawnSync(cmd, a, { encoding: 'utf8', timeout: 120000, ...o });

// Node + packages
const major = Number(process.versions.node.split('.')[0]);
add(major >= 20 ? 'PASS' : 'FAIL', 'node', process.versions.node, major >= 20 ? null : 'install Node 20+');
const pkgs = ['remotion', '@remotion/renderer', '@remotion/bundler', 'sharp', 'ffmpeg-static', 'ffprobe-static', '@remotion/three', 'matter-js', 'p5.brush'];
const missing = pkgs.filter((p) => { try { require.resolve(`${p}/package.json`); return false; } catch { return !existsSync(join(ROOT, 'node_modules', p)); } });
add(missing.length ? 'FAIL' : 'PASS', 'node packages', missing.length ? `missing: ${missing.join(', ')}` : `${pkgs.length} key packages`, missing.length ? 'npm run setup' : null);
if (!missing.length) {
  try { require('sharp'); add('PASS', 'sharp', 'loads'); } catch (e) { add('FAIL', 'sharp', e.message.split('\n')[0], 'npm rebuild sharp'); }
  const ff = require('ffmpeg-static');
  const r = quiet(ff, ['-version']);
  add(r.status === 0 ? 'PASS' : 'FAIL', 'ffmpeg', r.status === 0 ? r.stdout.split('\n')[0].slice(0, 40) : 'does not run', r.status === 0 ? null : 'npm rebuild ffmpeg-static');
}
const browserDir = join(ROOT, 'node_modules/.remotion/chrome-headless-shell');
add(existsSync(browserDir) ? 'PASS' : 'WARN', 'render browser', existsSync(browserDir) ? 'chrome-headless-shell present' : 'not downloaded yet (Remotion fetches it on the first render)', existsSync(browserDir) ? null : 'npx remotion browser ensure');

// Python voice env
const venvPy = join(ROOT, '.venv', WIN ? 'Scripts/python.exe' : 'bin/python');
if (!existsSync(venvPy)) add('FAIL', 'voice env', '.venv missing (free Edge voice)', 'npm run setup');
else {
  const r = quiet(venvPy, ['-c', 'import edge_tts, sys; print(edge_tts.__version__ if hasattr(edge_tts, "__version__") else "ok", sys.version.split()[0])']);
  add(r.status === 0 ? 'PASS' : 'FAIL', 'voice env', r.status === 0 ? `edge-tts ${r.stdout.trim()}` : 'edge-tts not importable', r.status === 0 ? null : 'npm run setup');
}

// Library files referenced by universe sets and scenes (catches a partial clone / missing art)
const uniDir = join(ROOT, 'studio/library/universes');
let refs = 0; const lost = [];
for (const u of existsSync(uniDir) ? readdirSync(uniDir) : []) {
  const setDir = join(uniDir, u, 'sets');
  for (const f of existsSync(setDir) ? readdirSync(setDir).filter((x) => x.endsWith('.json') && x !== 'prompts.json') : []) {
    const text = readFileSync(join(setDir, f), 'utf8');
    for (const m of text.matchAll(/"lib:([^"]+)"/g)) { refs++; if (!existsSync(join(ROOT, 'studio/library', m[1]))) lost.push(m[1]); }
  }
  const idx = join(uniDir, u, 'scenes/index.json');
  if (existsSync(idx)) for (const s of JSON.parse(readFileSync(idx, 'utf8')).scenes ?? []) { refs++; if (!existsSync(join(uniDir, u, 'scenes', s.file))) lost.push(`${u}/scenes/${s.file}`); }
}
add(lost.length ? 'FAIL' : 'PASS', 'library art', lost.length ? `${lost.length} of ${refs} files missing: ${lost.slice(0, 3).join(', ')}…` : `${refs} set/scene files present`, lost.length ? 'git pull (or regenerate: scenes/make.mjs, ai-art/finish.mjs)' : null);

// Local AI set-art tools (optional — only needed to make NEW AI sets)
const ai = aiConfig();
if (!existsSync(ai.python)) add('WARN', 'AI set tools', `ComfyUI not installed (looked in ${ai.comfyRoot}) — only needed to make new AI sets`, 'npm run setup -- --ai');
else {
  const ck = existsSync(ai.checkpoint);
  const verified = existsSync(`${ai.checkpoint}.sha256`);
  add(ck ? 'PASS' : 'WARN', 'AI model', ck ? `${ai.model}${verified ? ' (checksum verified)' : ''}` : `${ai.model} missing`, ck ? null : 'npm run setup -- --ai');
  const r = quiet(ai.python, ['-s', '-c', 'import torch, transformers; print(torch.__version__, torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else "-")']);
  if (r.status !== 0) add('WARN', 'AI runtime', 'torch/transformers not importable in ComfyUI\'s Python', 'npm run setup -- --ai');
  else { const [tv, cuda, ...name] = r.stdout.trim().split(' '); add(cuda === 'True' ? 'PASS' : 'WARN', 'AI runtime', `torch ${tv} · GPU ${cuda === 'True' ? name.join(' ') : 'not available (CPU only, slow)'}`); }
}

// Disk
try { const s = statfsSync(ROOT); const gb = (s.bavail * s.bsize) / 1e9; add(gb > 25 ? 'PASS' : 'WARN', 'disk', `${gb.toFixed(0)} GB free`, gb > 25 ? null : 'free space: renders and AI tools need 25 GB+'); } catch {}

const fails = out.filter((o) => o.level === 'FAIL').length, warns = out.filter((o) => o.level === 'WARN').length;
if (process.argv.includes('--json')) console.log(JSON.stringify({ ok: !fails, fails, warns, checks: out }));
else {
  for (const o of out) console.log(`${o.level === 'PASS' ? '✅' : o.level === 'WARN' ? '⚠️ ' : '❌'} ${o.name.padEnd(15)} ${o.detail}${o.fix ? `  →  ${o.fix}` : ''}`);
  console.log(fails ? `\n${fails} problem(s) — run the commands above.` : `\nReady${warns ? ` (${warns} optional item(s))` : ''}.`);
}
process.exit(fails ? 1 : 0);
