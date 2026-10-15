#!/usr/bin/env node
// Fallback music made in code (free): a simple, clean track cut exactly to the video —
// sparse intro, a "drop" into the full groove at a chosen moment (e.g. the reveal), and a
// resolved ending. Use when the music library has no suitable track. Moods:
//   upbeat     4-on-the-floor kick, claps, off-beat hats, bass, pad, pluck arpeggio
//   calm       pad + soft pluck + light pulse, no drums
//   cinematic  low pulse, toms on the drop, wide pad
//   tense      minor key, heartbeat bass pulse, ticking hats, unresolved low ending
// --silence <from>-<to>  mutes the music in that window (s); in tense mood only a ticking
//            clock + low drone play after it (e.g. a beat of silence before a reveal).
//
// Usage: node studio/scripts/make-music.mjs --out <file.wav> --duration <sec>
//          [--mood upbeat] [--bpm 112] [--drop <sec>] [--key C] [--seed 1] [--silence <from>-<to>]

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { buf, drive, env, expDecay, adsr, mixInto, noise, normalize, osc, room, svf, writeWav, SR } from './lib/synth.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const out = opt('--out');
const duration = Number(opt('--duration', 0));
if (!out || !duration) { console.error('Usage: node make-music.mjs --out <file.wav> --duration <sec> [--mood upbeat|calm|cinematic] [--bpm 112] [--drop <sec>] [--key C]'); process.exit(1); }
const mood = opt('--mood', 'upbeat');
const bpm = Number(opt('--bpm', mood === 'calm' ? 84 : mood === 'cinematic' ? 96 : mood === 'tense' ? 92 : 112));
const [silFrom, silTo] = (opt('--silence', '') || '').split('-').map(Number);
const hasSil = Number.isFinite(silFrom) && Number.isFinite(silTo) && silTo > silFrom;
const drop = Number(opt('--drop', Math.min(6, duration / 4)));
const KEYS = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const keyShift = KEYS[opt('--key', 'C')] ?? 0;
const beat = 60 / bpm;
const bar = beat * 4;
const total = duration + 0.05;
const midi = (n) => 440 * 2 ** ((n + keyShift - 69) / 12);

// I–V–vi–IV (C G Am F), one chord per bar; voicings around middle C.
const TENSE = mood === 'tense';
// tense: i–VI–iv–V in A minor (Am F Dm E)
const PROG = TENSE ? [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]] : [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const ROOT = TENSE ? [45, 41, 38, 40] : [48, 43, 45, 41];

const L = buf(total), R = buf(total);
const add = (b, at, g = 1, pan = 0) => { mixInto(L, b, at, g * Math.sqrt((1 - pan) / 2) * 1.41); mixInto(R, b, at, g * Math.sqrt((1 + pan) / 2) * 1.41); };

// --- instruments ---
const kick = env(osc(0.35, (t) => 48 + 110 * Math.exp(-t * 32), 'sine'), expDecay(10));
drive(kick, 1.5);
const clap = (() => { const b = buf(0.25); for (const d of [0, 0.012, 0.024]) mixInto(b, env(svf(noise(0.2, 41 + d * 1000), 1300, 'bp', 1.4), expDecay(d ? 60 : 22)), d, 0.8); return b; })();
const hat = env(svf(noise(0.06, 43), 8000, 'hp'), expDecay(70));
const tom = (f) => env(osc(0.6, (t) => f + f * 0.8 * Math.exp(-t * 18), 'sine'), expDecay(6));
const pluck = (n, len = 0.35) => { const b = osc(len, midi(n), 'tri'); mixInto(b, osc(len, midi(n + 12), 'sine'), 0, 0.3); return env(svf(b, (t) => 600 + 4000 * Math.exp(-t * 12), 'lp'), expDecay(9)); };
const padNote = (n, len) => { const b = buf(len); for (const d of [-0.12, 0, 0.12]) mixInto(b, osc(len, midi(n) * 2 ** (d / 12), 'saw'), 0, 0.33); return env(svf(b, 1100, 'lp'), adsr(0.35, 0.3, 0.75, 0.6, len)); };
const bassNote = (n, len) => env(svf(osc(len, midi(n), 'saw'), 420, 'lp', 0.9), adsr(0.005, 0.08, 0.7, 0.05, len));

// Bar grid aligned so a bar starts exactly on the drop (the musical lift lands on the reveal).
const gridStart = drop - Math.ceil(drop / bar) * bar;
const bars = Math.ceil((total - gridStart) / bar) + 1;
const endT = duration - 1.2; // last 1.2 s: sustained resolving chord
for (let b = 0; b < bars; b++) {
  const t0 = gridStart + b * bar;
  if (t0 > endT) break;
  const chord = PROG[b % 4];
  const full = t0 + 0.001 >= drop;
  if (t0 + bar < 0) continue;
  const preDrop = !full && t0 + bar > drop - bar; // bar before the drop → build
  // pad (always), quieter before the drop
  if (hasSil && t0 >= silFrom) { if (TENSE && t0 >= silTo) add(padNote(ROOT[0] - 12, Math.min(bar, endT - t0) + 0.3), t0, 0.08); continue; }
  for (const n of chord) add(padNote(n, Math.min(bar, endT - t0) + 0.3), t0, full ? 0.07 : 0.05, n % 2 ? -0.4 : 0.4);
  for (let s = 0; s < 16; s++) {
    const t = t0 + s * (beat / 4);
    if (t >= endT) break;
    if (t < 0) continue;
    if (hasSil && t >= silFrom) {
      // after the silence: a quiet ticking clock only
      if (TENSE && t >= silTo && s % 4 === 0) add(hat, t, 0.12, s % 8 ? 0.4 : -0.4);
      continue;
    }
    if (TENSE) {
      if (s % 2 === 0) add(bassNote(ROOT[b % 4], beat / 2 - 0.04), t, full ? 0.2 : 0.13); // heartbeat 8ths
      if (full && (s === 0 || s === 8)) add(kick, t, 0.42);
      if (full && s % 2 === 1) add(hat, t, 0.06, 0.3);
      if (s % 8 === 0) add(pluck(chord[(s / 8 + b) % 3] + 12), t, full ? 0.1 : 0.07, s ? 0.5 : -0.5);
      continue;
    }
    if (mood !== 'calm') {
      if (full && s % 4 === 0) add(kick, t, mood === 'cinematic' ? 0.5 : 0.75);
      if (full && mood === 'upbeat' && (s === 4 || s === 12)) add(clap, t, 0.35, 0.1);
      if ((full || preDrop) && s % 4 === 2) add(hat, t, preDrop ? 0.1 + 0.15 * (s / 16) : 0.18, 0.3);
      if (full && mood === 'upbeat' && s % 2 === 1) add(hat, t, 0.07, -0.3);
      if (full && s % 2 === 0) add(bassNote(ROOT[b % 4] + (s % 8 === 6 ? 7 : 0), beat / 2 - 0.02), t, 0.22);
      if (!full && mood === 'cinematic' && s % 4 === 0) add(bassNote(ROOT[b % 4], beat * 0.9), t, 0.18);
    }
    // arpeggio: sparse before the drop, 16ths after (upbeat) / 8ths (calm, cinematic)
    const every = full ? (mood === 'upbeat' ? 1 : 2) : 4;
    if (s % every === 0) add(pluck(chord[(s / every) % 3] + 12), t, full ? 0.12 : 0.09, (s % 3) - 1 > 0 ? 0.5 : -0.5);
  }
  if (mood === 'cinematic' && Math.abs(t0 - drop) < bar / 2) [0, 0.25, 0.5].forEach((d, i) => add(tom(70 - i * 8), t0 + d * beat * 2, 0.5));
}
// Lift into the drop: short noise riser ending on it.
if (drop > 1.5) { const r = env(svf(noise(1.4, 47), (t) => 400 + 5000 * (t / 1.4) ** 2, 'bp', 1.3), (t) => (t / 1.4) ** 2.4); add(r, drop - 1.4, 0.18); }
// Ending: tonic chord ring-out + a soft hit.
const endChord = buf(1.4);
for (const n of TENSE ? [33, 45, 57, 60, 64] : [48, 60, 64, 67, 72]) mixInto(endChord, env(osc(1.4, midi(n), n < 55 ? 'sine' : 'tri'), expDecay(2.2)), 0, 0.18);
add(endChord, endT, 0.8);
if (mood !== 'calm') add(kick, endT, 0.6);

// Master: gentle glue, space, fades.
const fadeIn = 0.4, fadeOut = 0.8;
let Lm = room(L, 38, 0.3, 0.18), Rm = room(R, 52, 0.3, 0.18);
for (let i = 0; i < Lm.length; i++) {
  const t = i / SR;
  let g = Math.min(1, t / fadeIn) * Math.min(1, Math.max(0, (total - t) / fadeOut));
  if (hasSil && t >= silFrom - 0.06) g *= t < silTo ? Math.max(0, (silFrom - t) / 0.06) : Math.min(1, (t - silTo) / 0.3);
  Lm[i] = Math.tanh(Lm[i] * 1.2) * g; Rm[i] = Math.tanh(Rm[i] * 1.2) * g;
}
const peak = Math.max(...[Lm, Rm].map((c) => c.reduce((m, x) => Math.max(m, Math.abs(x)), 0)));
for (const c of [Lm, Rm]) for (let i = 0; i < c.length; i++) c[i] *= 0.85 / (peak || 1);
await mkdir(dirname(out), { recursive: true });
await writeWav(out, [Lm, Rm]);
console.log(`Music ${out}  (${mood}, ${bpm} bpm, drop at ${drop.toFixed(2)} s, ${duration.toFixed(1)} s)`);
void normalize;
