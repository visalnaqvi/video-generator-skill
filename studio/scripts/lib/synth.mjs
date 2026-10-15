// Tiny offline synth used to generate the studio's sound effects and fallback music.
// Everything works on Float32Array buffers at a fixed sample rate; writeWav saves 16-bit PCM.

import { writeFile } from 'node:fs/promises';

export const SR = 48000;
export const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));

// Deterministic noise so regenerated files are identical.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
}

export function noise(sec, seed = 1) {
  const r = rng(seed); const b = buf(sec);
  for (let i = 0; i < b.length; i++) b[i] = r();
  return b;
}

/** Oscillator with a frequency function f(t) (Hz). type: sine | saw | tri | square. */
export function osc(sec, f, type = 'sine', phase0 = 0) {
  const b = buf(sec); let ph = phase0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += (typeof f === 'function' ? f(t) : f) / SR;
    const x = ph % 1;
    b[i] = type === 'sine' ? Math.sin(2 * Math.PI * x) : type === 'saw' ? 2 * x - 1 : type === 'tri' ? 1 - 4 * Math.abs(x - 0.5) : x < 0.5 ? 1 : -1;
  }
  return b;
}

/** Multiply by an envelope function e(t) → gain. */
export function env(b, e) { for (let i = 0; i < b.length; i++) b[i] *= e(i / SR); return b; }
export const adsr = (a, d, s, r, len) => (t) => (t < a ? t / a : t < a + d ? 1 - (1 - s) * ((t - a) / d) : t < len - r ? s : Math.max(0, s * (len - t) / r));
export const expDecay = (k, attack = 0.002) => (t) => (t < attack ? t / attack : Math.exp(-k * (t - attack)));

/** State-variable filter with time-varying cutoff fc(t); mode lp | hp | bp. */
export function svf(b, fc, mode = 'lp', q = 0.7) {
  let low = 0, band = 0; const out = new Float32Array(b.length); const damp = 1 / q;
  for (let i = 0; i < b.length; i++) {
    const f = Math.min(0.99, 2 * Math.sin(Math.PI * Math.min(SR / 4, typeof fc === 'function' ? fc(i / SR) : fc) / SR));
    low += f * band; const high = b[i] - low - damp * band; band += f * high;
    out[i] = mode === 'lp' ? low : mode === 'hp' ? high : band;
  }
  return out;
}

export function gain(b, g) { for (let i = 0; i < b.length; i++) b[i] *= g; return b; }
export function drive(b, amt = 2) { const n = Math.tanh(amt); for (let i = 0; i < b.length; i++) b[i] = Math.tanh(b[i] * amt) / n; return b; }

/** Add src into dst starting at `at` seconds (dst grows if needed is not supported — size dst first). */
export function mixInto(dst, src, at = 0, g = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g;
  return dst;
}

export function normalize(b, peak = 0.89) {
  let m = 0; for (const x of b) m = Math.max(m, Math.abs(x));
  return m > 0 ? gain(b, peak / m) : b;
}

/** Simple feedback-delay "room" for a touch of space. */
export function room(b, ms = 45, fb = 0.35, wet = 0.25) {
  const d = Math.round((ms / 1000) * SR); const out = Float32Array.from(b);
  for (let i = d; i < out.length; i++) out[i] += out[i - d] * fb;
  for (let i = 0; i < b.length; i++) out[i] = b[i] * (1 - wet) + out[i] * wet;
  return out;
}

/** Write mono or stereo ([L, R]) float buffers as 16-bit WAV. */
export async function writeWav(path, chans) {
  const ch = Array.isArray(chans) ? chans : [chans];
  const n = ch[0].length; const data = Buffer.alloc(n * ch.length * 2);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch.length; c++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, ch[c][i])) * 32767), (i * ch.length + c) * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(ch.length, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * ch.length * 2, 28); h.writeUInt16LE(ch.length * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  await writeFile(path, Buffer.concat([h, data]));
}
