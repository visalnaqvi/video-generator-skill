#!/usr/bin/env node
// Local AI art through ComfyUI (free, on this PC's GPU). Starts the ComfyUI server if needed, queues a
// Flux workflow over its HTTP API, waits and copies the result out.
//
//   node studio/scripts/ai-art/comfy.mjs gen  --prompt "<text>" --out <png> [--w 1088 --h 1920 --seed 7 --steps 4 --n 1]
//   node studio/scripts/ai-art/comfy.mjs detail --init <png> --prompt "<text>" --out <png> [--denoise 0.55 --seed 7 --n 1]
//        (image-to-image: keeps the init image's composition and palette, adds detail — use it on a code-drawn
//         set so the AI pass matches the universe and the set's stage notes / light positions stay valid)
//   node studio/scripts/ai-art/comfy.mjs stop
// --n > 1 writes <out>-1.png … <out>-n.png (different seeds). Prints compact JSON.
// Paths: studio/scripts/ai-art/config.json { comfyRoot, model }.

import { spawn } from 'node:child_process';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { aiConfig } from './paths.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const cfg = aiConfig(); // per-PC tool paths: paths.mjs
const API = `http://127.0.0.1:${cfg.port ?? 8188}`;
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };

async function up() { try { return (await fetch(`${API}/system_stats`)).ok; } catch { return false; } }

async function start() {
  if (await up()) return;
  const root = cfg.comfyRoot;
  const py = join(root, 'python_embeded', 'python.exe');
  const child = spawn(py, ['-s', join(root, 'ComfyUI', 'main.py'), '--listen', '127.0.0.1', '--port', String(cfg.port ?? 8188), '--disable-auto-launch', ...(cfg.args ?? [])], { cwd: root, detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  for (let i = 0; i < 180; i++) { await new Promise((r) => setTimeout(r, 1000)); if (await up()) return; }
  throw new Error('ComfyUI did not start in 180 s');
}

async function upload(file) {
  const fd = new FormData();
  fd.append('image', new Blob([await readFile(file)]), basename(file));
  fd.append('overwrite', 'true');
  const r = await fetch(`${API}/upload/image`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`upload failed ${r.status}`);
  return (await r.json()).name;
}

function workflow({ prompt, w, h, seed, steps, init, denoise }) {
  const wf = {
    1: { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: cfg.model } },
    2: { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    3: { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['1', 1] } },
    5: { class_type: 'KSampler', inputs: { model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0], seed, steps, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: init ? denoise : 1 } },
    6: { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    7: { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'studio' } },
  };
  if (init) {
    wf[8] = { class_type: 'LoadImage', inputs: { image: init } };
    wf[9] = { class_type: 'ImageScale', inputs: { image: ['8', 0], upscale_method: 'lanczos', width: w, height: h, crop: 'center' } };
    wf[4] = { class_type: 'VAEEncode', inputs: { pixels: ['9', 0], vae: ['1', 2] } };
  } else wf[4] = { class_type: 'EmptySD3LatentImage', inputs: { width: w, height: h, batch_size: 1 } };
  return wf;
}

async function run(job, out) {
  const r = await fetch(`${API}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: workflow(job) }) });
  if (!r.ok) throw new Error(`queue failed ${r.status}: ${await r.text()}`);
  const { prompt_id } = await r.json();
  const t0 = Date.now();
  for (;;) {
    await new Promise((res) => setTimeout(res, 1500));
    const h = await (await fetch(`${API}/history/${prompt_id}`)).json();
    const e = h[prompt_id];
    if (!e) continue;
    if (e.status?.status_str === 'error') throw new Error(JSON.stringify(e.status.messages?.slice(-1)));
    const img = Object.values(e.outputs ?? {}).flatMap((o) => o.images ?? [])[0];
    if (!img) continue;
    const buf = Buffer.from(await (await fetch(`${API}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`)).arrayBuffer());
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, buf);
    return { out, seconds: Math.round((Date.now() - t0) / 1000) };
  }
}

if (cmd === 'stop') {
  // the server runs hidden: find the process listening on its port and end it (frees GPU memory and RAM)
  const { execSync } = await import('node:child_process');
  const pids = new Set(execSync('netstat -ano', { encoding: 'utf8' }).split(/\r?\n/)
    .filter((l) => l.includes(`127.0.0.1:${cfg.port ?? 8188} `) && /LISTENING/.test(l)).map((l) => l.trim().split(/\s+/).pop()));
  for (const pid of pids) { try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch {} }
  console.log(JSON.stringify({ stopped: [...pids] }));
  process.exit(0);
}
if (cmd !== 'gen' && cmd !== 'detail') { console.error('Usage: comfy.mjs gen|detail|stop … (see header)'); process.exit(1); }
const prompt = opt('prompt');
const out = resolve(opt('out', 'ai-art.png'));
if (!prompt) { console.error('--prompt is required'); process.exit(1); }
await start();
const init = cmd === 'detail' ? await upload(resolve(opt('init'))) : undefined;
const n = Number(opt('n', 1)), seed0 = Number(opt('seed', 7));
const res = [];
for (let i = 0; i < n; i++) {
  const file = n > 1 ? out.replace(/\.png$/i, `-${i + 1}.png`) : out;
  res.push(await run({ prompt, w: Number(opt('w', 1088)), h: Number(opt('h', 1920)), seed: seed0 + i * 101, steps: Number(opt('steps', 4)), init, denoise: Number(opt('denoise', 0.55)) }, file));
}
console.log(JSON.stringify({ made: res }));
