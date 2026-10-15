#!/usr/bin/env node
// Splits an illustration into set planes using its depth map (depth.py), for parallax, haze and lighting:
//   <out>-sky.png     the whole picture, opaque, standing objects painted out — the backdrop (z ≈ 0.05)
//   <out>-ground.png  everything below/in front of the sky, sky cut away; objects that stand up from the
//                     ground (poles, trees, fences) are patched over from their surroundings (z ≈ 0.35)
//   <out>-near.png    only those standing objects, feathered (z ≈ 0.6) — they slide over the ground
//   <out>-depth.png   depth preview · <out>-planes.json summary + ready set layers
//
//   node studio/scripts/ai-art/split.mjs --image <png> --depth <png> --out <dir/prefix>
//        [--size 2160x3840] [--horizon 52] [--sky 0.06] [--margin 0.07] [--feather 3] [--front-below <y%>]
// --horizon: % from the top where the sky meets the land · --sky: depth below which a pixel above the
// horizon is sky · --margin: how much nearer than the ground of its row a pixel must be to count as a
// standing object · --front-below: everything below this line (% from the top) is foreground (counters, ledges).

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const img = resolve(opt('image')), dep = resolve(opt('depth')), out = resolve(opt('out'));
const [W, H] = opt('size', '2160x3840').split('x').map(Number);
const frontBelow = opt('front-below') !== undefined ? Number(opt('front-below')) / 100 : null;
const horizon = Number(opt('horizon', 52)) / 100, skyT = Number(opt('sky', 0.06)), margin = Number(opt('margin', 0.07)), feather = Number(opt('feather', 3));
await mkdir(dirname(out), { recursive: true });

const rgb = await sharp(img).resize(W, H, { fit: 'cover', kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
const dRaw = await sharp(dep).resize(W, H, { fit: 'cover', kernel: 'cubic' }).toColourspace('grey16').raw({ depth: 'ushort' }).toBuffer();
const D = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) D[i] = dRaw.readUInt16LE(i * 2) / 65535;

// sky: far pixels above the horizon band
const hy = Math.round(horizon * H);
const sky = new Uint8Array(W * H);
for (let y = 0; y < Math.min(H, hy + Math.round(H * 0.02)); y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (D[i] < skyT) sky[i] = 255; }

// ground depth per row (40th percentile of the land pixels), then standing objects = clearly nearer
const g = new Float32Array(H);
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x += 4) { const i = y * W + x; if (!sky[i]) row.push(D[i]); }
  row.sort((a, b) => a - b);
  g[y] = row.length ? row[Math.floor(row.length * 0.4)] : 0;
}
for (let y = 0; y < Math.min(hy, H); y++) g[y] = g[Math.min(H - 1, hy + 2)];
const near = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!sky[i] && D[i] > g[y] * (1 + margin) + margin * 0.5) near[i] = 255; }
// a foreground mass that fills whole rows (a counter, a desk, a ledge) is not nearer than its own row: everything
// below --front-below (% from the top) joins the near plane
if (frontBelow !== null) for (let y = Math.round(frontBelow * H); y < H; y++) near.fill(255, y * W, (y + 1) * W);

// clean masks: blur + threshold removes specks, a second small blur feathers the edge
const clean = async (m, r) => sharp(Buffer.from(m), { raw: { width: W, height: H, channels: 1 } }).blur(Math.max(0.3, r)).threshold(128).blur(Math.max(0.3, feather)).extractChannel(0).raw().toBuffer(); // one channel (threshold returns 3)
const skyM = await clean(sky, 2), nearM = await clean(near, 1.5);

// ground with the standing objects patched: each masked run in a row filled from its two ends
const patched = Buffer.from(rgb);
for (let y = 0; y < H; y++) {
  let x = 0;
  while (x < W) {
    if (nearM[y * W + x] < 16) { x++; continue; }
    const a = x; while (x < W && nearM[y * W + x] >= 16) x++;
    const L = Math.max(0, a - 2), R = Math.min(W - 1, x + 1);
    for (let k = a; k < x; k++) { const t = (k - L) / Math.max(1, R - L); for (let c = 0; c < 3; c++) patched[(y * W + k) * 3 + c] = rgb[(y * W + L) * 3 + c] * (1 - t) + rgb[(y * W + R) * 3 + c] * t; }
  }
}
const withAlpha = (src, alphaOf) => { const o = Buffer.alloc(W * H * 4); for (let i = 0; i < W * H; i++) { o[i * 4] = src[i * 3]; o[i * 4 + 1] = src[i * 3 + 1]; o[i * 4 + 2] = src[i * 3 + 2]; o[i * 4 + 3] = alphaOf(i); } return o; };
const png = (buf, ch, file) => sharp(buf, { raw: { width: W, height: H, channels: ch } }).png({ compressionLevel: 9 }).toFile(file);
// backdrop = the whole picture with standing objects painted out (no ghosts when the near plane slides);
// ground = land only; above the horizon it is see-through where objects stood (the backdrop shows sky there)
await png(patched, 3, `${out}-sky.png`);
await png(withAlpha(patched, (i) => { const a = 255 - skyM[i]; return Math.floor(i / W) < hy ? Math.round(a * (1 - nearM[i] / 255)) : a; }), 4, `${out}-ground.png`);
await png(withAlpha(rgb, (i) => nearM[i]), 4, `${out}-near.png`);
await sharp(Buffer.from(D.map((v) => v * 255)), { raw: { width: W, height: H, channels: 1 } }).resize(540).png().toFile(`${out}-depth.png`);

let nNear = 0, nSky = 0; for (let i = 0; i < W * H; i++) { if (nearM[i] > 127) nNear++; if (skyM[i] > 127) nSky++; }
const lib = (f) => basename(f);
const summary = {
  size: `${W}x${H}`, horizon: horizon * 100, sky: +(nSky / (W * H)).toFixed(3), near: +(nNear / (W * H)).toFixed(3),
  layers: [
    { id: 'sky', type: 'image', src: lib(`${out}-sky.png`), x: 50, y: 50, w: 1160, h: 2062, z: 0.05, haze: 0.1 },
    { id: 'ground', type: 'image', src: lib(`${out}-ground.png`), x: 50, y: 50, w: 1160, h: 2062, z: 0.35 },
    { id: 'near', type: 'image', src: lib(`${out}-near.png`), x: 50, y: 50, w: 1160, h: 2062, z: 0.6 },
  ],
};
await writeFile(`${out}-planes.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary));
