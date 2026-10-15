#!/usr/bin/env node
// One-command setup of the studio on a fresh clone (safe to re-run; finished steps are skipped):
//
//   npm run setup                     Node packages + Remotion's browser + the Python voice env (.venv), then doctor
//   npm run setup -- --ai             … plus the local AI set-art tools: ComfyUI portable + Flux.1-schnell fp8
//                                     (~19 GB, Windows + NVIDIA GPU), checksum-verified, + the depth model
//   options: --tools <dir>            where the AI tools go (default <home>/studio-tools; written to
//                                     studio/scripts/ai-art/config.local.json when not the default)
//            --skip-npm --skip-python --parts <n> (parallel download connections, default 6)
//
// Big downloads go in pieces over several connections (resumable: re-run after a drop) and are checked
// against pinned SHA-256 sums before use.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TOOLS } from './ai-art/paths.mjs';
import { download as dl } from './lib/download.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const WIN = process.platform === 'win32';

// Pinned downloads (update url + sha256 together).
const COMFY = {
  url: 'https://github.com/Comfy-Org/ComfyUI/releases/download/v0.40.0/ComfyUI_windows_portable_nvidia.7z',
  sha256: 'bc4dd972b7134347128579a34b1910f19a59d8a4c9fea7d8e4bae586bad68b0c', folder: 'ComfyUI_windows_portable',
};
const FLUX = {
  url: 'https://huggingface.co/Comfy-Org/flux1-schnell/resolve/main/flux1-schnell-fp8.safetensors',
  sha256: 'ead426278b49030e9da5df862994f25ce94ab2ee4df38b556ddddb3db093bf72', file: 'flux1-schnell-fp8.safetensors',
};

const log = (s) => console.log(s);
const step = (s) => log(`\n▶ ${s}`);
// npm / npx are .cmd files on Windows and need a shell (passed as one command line); everything else runs directly
const viaShell = (cmd) => WIN && (cmd === 'npm' || cmd === 'npx');
const run = (cmd, a, o = {}) => (viaShell(cmd) ? spawnSync([cmd, ...a].join(' '), { stdio: 'inherit', shell: true, cwd: ROOT, ...o }) : spawnSync(cmd, a, { stdio: 'inherit', cwd: ROOT, ...o }));
const quiet = (cmd, a) => spawnSync(cmd, a, { encoding: 'utf8', cwd: ROOT });

// ---------- 1. Node ----------
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) { console.error(`Node ${process.versions.node} is too old — install Node 20 or newer (LTS) and re-run.`); process.exit(1); }

if (!has('skip-npm')) {
  step('Node packages');
  if (existsSync(join(ROOT, 'node_modules/remotion')) && !has('force')) log('  already installed (use --force to reinstall)');
  else if (run('npm', [existsSync(join(ROOT, 'package-lock.json')) ? 'ci' : 'install']).status !== 0) { console.error('npm install failed'); process.exit(1); }
  step("Remotion's headless browser (for rendering)");
  if (run('npx', ['remotion', 'browser', 'ensure']).status !== 0) log('  ! could not fetch it now — Remotion downloads it on the first render');
}

// ---------- 2. Python voice env ----------
if (!has('skip-python')) {
  step('Python voice environment (.venv + edge-tts)');
  const venvPy = join(ROOT, '.venv', WIN ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(venvPy)) {
    const candidates = WIN ? [['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]];
    const found = candidates.find(([c, a]) => { const r = quiet(c, [...a, '--version']); return r.status === 0 && /Python 3\.(9|[1-9]\d)/.test(r.stdout + r.stderr); });
    if (!found) { console.error('Python 3.9+ not found — install it from python.org (tick "Add to PATH") and re-run.'); process.exit(1); }
    if (run(found[0], [...found[1], '-m', 'venv', '.venv']).status !== 0) { console.error('could not create .venv'); process.exit(1); }
  }
  if (run(venvPy, ['-m', 'pip', 'install', '--quiet', '--upgrade', 'pip']).status !== 0 || run(venvPy, ['-m', 'pip', 'install', '--quiet', '-r', 'requirements.txt']).status !== 0) { console.error('pip install failed'); process.exit(1); }
  log('  edge-tts ready');
}

// ---------- 3. Local AI tools (optional) ----------
if (has('ai')) {
  step('Local AI set-art tools (ComfyUI + Flux.1-schnell)');
  if (!WIN) { console.error('The AI tools install is Windows-only (ComfyUI portable for NVIDIA). Existing sets still render.'); process.exit(1); }
  const gpu = quiet('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader']);
  if (gpu.status !== 0) log('  ! no NVIDIA GPU found — ComfyUI would run on the CPU (very slow); installing anyway');
  else log(`  GPU: ${gpu.stdout.trim()}`);
  const tools = resolve(opt('tools', DEFAULT_TOOLS));
  const parts = Number(opt('parts', 6));
  const comfyRoot = join(tools, COMFY.folder);
  if (!existsSync(join(comfyRoot, 'python_embeded', 'python.exe'))) {
    const archive = join(tools, 'downloads', 'ComfyUI_windows_portable_nvidia.7z');
    await dl(COMFY, archive, parts, log);
    log('  extracting…');
    const tar = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'); // Windows bsdtar reads .7z
    if (spawnSync(tar, ['-xf', archive, '-C', tools], { stdio: 'inherit' }).status !== 0) throw new Error('extract failed (needs Windows 10 1803+ tar, or 7-Zip)');
  } else log(`  ComfyUI already at ${comfyRoot}`);
  const ckpt = join(comfyRoot, 'ComfyUI', 'models', 'checkpoints', FLUX.file);
  await dl(FLUX, ckpt, Math.max(parts, 8), log);
  if (tools !== resolve(DEFAULT_TOOLS)) {
    await writeFile(join(ROOT, 'studio/scripts/ai-art/config.local.json'), JSON.stringify({ comfyRoot }, null, 2) + '\n');
    log('  wrote studio/scripts/ai-art/config.local.json');
  }
  step('Depth model (Depth Anything V2 Small, ~100 MB, cached once)');
  const py = join(comfyRoot, 'python_embeded', 'python.exe');
  const cfg = JSON.parse(await readFile(join(ROOT, 'studio/scripts/ai-art/config.json'), 'utf8'));
  if (spawnSync(py, ['-s', '-c', `from transformers import pipeline; pipeline("depth-estimation", model="${cfg.depthModel}"); print("  depth model cached")`], { stdio: 'inherit' }).status !== 0) log('  ! could not cache it now — it downloads on first use');
}

step('Health check');
const d = run(process.execPath, [join(ROOT, 'studio/scripts/doctor.mjs')]);
process.exit(d.status ?? 0);
