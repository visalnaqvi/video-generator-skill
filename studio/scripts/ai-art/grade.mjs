#!/usr/bin/env node
// Colour-grades AI art to a universe's own palette: matches the image's colour tone to a reference picture
// (the code-drawn version of the same set) in Lab colour space, separately for the sky and the land, while
// warm, saturated light sources (windows, town glow, moon, lamps) keep their own colour.
//
//   node studio/scripts/ai-art/grade.mjs --image <ai.png> --ref <reference.png> --out <png>
//        [--horizon 44] [--ref-horizon 52] [--amount 0.9] [--keep-warm 0.8] [--l-amount 0.6]
// --horizon / --ref-horizon: % from the top where sky meets land in each picture (each part is matched to
// the same part of the reference) · --amount: 0 = untouched, 1 = full match · --keep-warm: how much the warm
// lights are protected (0 = graded like everything else) · --l-amount: share of the lightness match (default 0.6:
// the colour tone matches fully, the image stays a little brighter than flat code art; scene light darkens it later).

import sharp from 'sharp';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const img = resolve(opt('image')), ref = resolve(opt('ref')), out = resolve(opt('out'));
const hz = Number(opt('horizon', 50)) / 100, rhz = Number(opt('ref-horizon', opt('horizon', 50))) / 100;
const amount = Number(opt('amount', 0.9)), keepWarm = Number(opt('keep-warm', 0.8)), lAmount = Number(opt('l-amount', 0.6));

// ---- sRGB ⇄ Lab (D65) ----
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fi = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
const Xn = 0.95047, Zn = 1.08883;
function toLab(r, g, b) {
  r = lin(r / 255); g = lin(g / 255); b = lin(b / 255);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / Xn, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / Zn;
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function toRgb(L, a, bb) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - bb / 200;
  const x = fi(fx) * Xn, y = fi(fy), z = fi(fz) * Zn;
  const r = 3.2406 * x - 1.5372 * y - 0.4986 * z, g = -0.9689 * x + 1.8758 * y + 0.0415 * z, b = 0.0557 * x - 0.204 * y + 1.057 * z;
  return [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(gam(Math.max(0, Math.min(1, c))) * 255))));
}

async function labOf(file, w, h) {
  const raw = await sharp(file).resize(w, h, { fit: 'fill' }).removeAlpha().raw().toBuffer();
  const lab = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { const v = toLab(raw[i * 3], raw[i * 3 + 1], raw[i * 3 + 2]); lab[i * 3] = v[0]; lab[i * 3 + 1] = v[1]; lab[i * 3 + 2] = v[2]; }
  return lab;
}
// warm light sources: saturated and yellow/orange/red (a > 0 or b > 30 with high chroma)
// …and bright highlights of any colour (moon, stars, lamps) are light sources too
const warmth = (L, a, b) => {
  const C = Math.hypot(a, b), hue = Math.atan2(b, a) * 180 / Math.PI;
  const warm = C > 28 && hue > -10 && hue < 100 && L > 35 ? Math.min(1, (C - 28) / 25) : 0;
  const bright = Math.min(1, Math.max(0, (L - 55) / 20));
  return Math.max(warm, bright);
};

function stats(lab, w, y0, y1) {
  const m = [0, 0, 0], s = [0, 0, 0]; let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3; if (warmth(lab[i], lab[i + 1], lab[i + 2]) > 0.2) continue;
    for (let c = 0; c < 3; c++) { m[c] += lab[i + c]; s[c] += lab[i + c] ** 2; } n++;
  }
  if (n < 50) return null; // empty region (an interior has no sky)
  return m.map((v, c) => { const mean = v / n; return { mean, sd: Math.sqrt(Math.max(1e-6, s[c] / n - mean * mean)) }; });
}

const meta = await sharp(img).metadata();
const W = meta.width, H = meta.height, SW = 270, SH = Math.round((270 * H) / W);
// statistics on small copies (fast), applied to the full-size image
const sImg = await labOf(img, SW, SH), sRef = await labOf(ref, SW, SH);
const split = (h) => Math.round(h * SH);
const land = [stats(sImg, SW, split(hz), SH), stats(sRef, SW, split(rhz), SH)];
let sky = [stats(sImg, SW, 0, split(hz)), stats(sRef, SW, 0, split(rhz))];
if (!sky[0] || !sky[1]) sky = land; // no sky in one of them: match the whole picture as land

const raw = await sharp(img).removeAlpha().raw().toBuffer();
const outBuf = Buffer.alloc(W * H * 3);
const band = Math.max(1, Math.round(H * 0.03)), hy = Math.round(hz * H);
for (let y = 0; y < H; y++) {
  // blend the sky and land transfers across a soft band at the horizon
  const t = Math.min(1, Math.max(0, (y - (hy - band)) / (2 * band)));
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    const [L, a, b] = toLab(raw[i], raw[i + 1], raw[i + 2]);
    const v = [L, a, b];
    const mapped = [0, 1, 2].map((c) => {
      const s0 = sky[0][c], s1 = sky[1][c], l0 = land[0][c], l1 = land[1][c];
      const ms = (v[c] - s0.mean) * (s1.sd / s0.sd) + s1.mean, ml = (v[c] - l0.mean) * (l1.sd / l0.sd) + l1.mean;
      return ms * (1 - t) + ml * t;
    });
    const k = amount * (1 - keepWarm * warmth(L, a, b));
    const rgb = toRgb(L + (mapped[0] - L) * k * lAmount, a + (mapped[1] - a) * k, b + (mapped[2] - b) * k);
    outBuf[i] = rgb[0]; outBuf[i + 1] = rgb[1]; outBuf[i + 2] = rgb[2];
  }
}
await sharp(outBuf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
const fmt = (s) => (s ?? []).map((c) => +c.mean.toFixed(1));
console.log(JSON.stringify({ out, sky: { before: fmt(sky[0]), target: fmt(sky[1]) }, land: { before: fmt(land[0]), target: fmt(land[1]) } }));
