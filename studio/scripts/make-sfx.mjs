#!/usr/bin/env node
// Generates the studio's sound-effect library in code (free, no licences): whooshes, pops,
// hits, pen strokes, chimes, risers, ticks… into studio/library/sfx/ with an index.json that
// maps the plain-word cues used in storyboards ("stamp hit", "pen tick", "whoosh") to files.
// Re-run any time; output is deterministic. Add your own .wav/.mp3 files to the folder and
// list them in index.json (keywords) to use them instead.
//
// Usage: node studio/scripts/make-sfx.mjs

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adsr, buf, drive, env, expDecay, gain, mixInto, noise, normalize, osc, room, svf, writeWav, SR } from './lib/synth.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'studio/library/sfx');
await mkdir(OUT, { recursive: true });

const stereoPan = (b, from = -0.6, to = 0.6) => {
  const L = new Float32Array(b.length), R = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) { const p = from + (to - from) * (i / b.length); L[i] = b[i] * Math.sqrt((1 - p) / 2); R[i] = b[i] * Math.sqrt((1 + p) / 2); }
  return [L, R];
};
const penStroke = (len, seed, rate = 38) => {
  // Scratchy nib on paper: band-passed noise with grainy amplitude modulation.
  const n = svf(noise(len, seed), (t) => 3200 + 1400 * Math.sin(t * 40), 'bp', 1.6);
  const g = noise(len, seed + 7);
  return env(n, (t) => adsr(0.01, 0.05, 0.8, 0.06, len)(t) * (0.55 + 0.45 * Math.abs(Math.sin(t * rate * Math.PI + g[Math.floor(t * SR)] * 0.6))));
};

const S = {};
S['whoosh'] = () => {
  const len = 0.6;
  const b = env(svf(noise(len, 3), (t) => 400 + 4200 * Math.sin(Math.PI * Math.min(1, t / len)), 'bp', 1.2), adsr(0.28, 0.1, 0.7, 0.22, len));
  return stereoPan(normalize(b, 0.8), -0.7, 0.7);
};
S['whoosh-up'] = () => {
  const len = 0.45;
  return stereoPan(normalize(env(svf(noise(len, 5), (t) => 500 + 7000 * (t / len) ** 1.6, 'bp', 1.3), adsr(0.3, 0.05, 0.6, 0.1, len)), 0.8), 0.3, -0.3);
};
S['pop'] = () => {
  const len = 0.14;
  const b = env(osc(len, (t) => 900 * Math.exp(-t * 28) + 260, 'sine'), expDecay(32));
  mixInto(b, env(svf(noise(0.01, 9), 4000, 'hp'), expDecay(400)), 0, 0.4);
  return normalize(b, 0.8);
};
S['stamp-hit'] = () => {
  const len = 0.5;
  const b = env(osc(len, (t) => 45 + 120 * Math.exp(-t * 30), 'sine'), expDecay(9));
  mixInto(b, env(svf(noise(0.08, 11), 900, 'lp'), expDecay(45)), 0, 0.9);
  mixInto(b, env(svf(noise(0.02, 12), 3500, 'hp'), expDecay(220)), 0, 0.5);
  return normalize(drive(b, 2.2), 0.95);
};
S['punch'] = () => {
  const len = 0.32;
  const b = env(osc(len, (t) => 55 + 160 * Math.exp(-t * 40), 'sine'), expDecay(13));
  mixInto(b, env(svf(noise(0.05, 13), 2200, 'bp', 1.2), expDecay(70)), 0, 0.8);
  return normalize(drive(b, 1.8), 0.95);
};
S['low-hit'] = () => {
  const len = 1.8;
  const b = env(osc(len, (t) => 52 - 6 * t, 'sine'), expDecay(2.2));
  mixInto(b, env(osc(len, 78, 'tri'), expDecay(3)), 0, 0.35);
  mixInto(b, env(svf(noise(len, 15), 220, 'lp'), expDecay(2.5)), 0, 1.2);
  mixInto(b, env(svf(noise(0.04, 16), 1500, 'bp'), expDecay(90)), 0, 0.5);
  return stereoPan(normalize(room(drive(b, 1.6), 70, 0.4, 0.3), 0.95), -0.2, 0.2);
};
S['drone'] = () => {
  const len = 3.2;
  const b = env(osc(len, (t) => 55 + 0.6 * Math.sin(t * 1.3), 'sine'), adsr(0.8, 0.2, 0.9, 1.2, len));
  mixInto(b, env(osc(len, 110.4, 'tri'), adsr(1, 0.2, 0.5, 1.2, len)), 0, 0.25);
  mixInto(b, env(svf(noise(len, 17), 300, 'lp'), adsr(1, 0.2, 0.8, 1.2, len)), 0, 0.5);
  return stereoPan(normalize(b, 0.6), -0.3, 0.3);
};
S['bright-impact'] = () => {
  const len = 1.6; const b = buf(len);
  for (const [f, g] of [[1046.5, 0.5], [1318.5, 0.35], [1568, 0.3], [2093, 0.2]]) mixInto(b, env(osc(len, f, 'sine'), expDecay(2.6)), 0, g);
  mixInto(b, env(svf(noise(0.3, 19), 5000, 'hp'), expDecay(14)), 0, 0.6);
  mixInto(b, env(osc(0.3, (t) => 60 + 100 * Math.exp(-t * 30), 'sine'), expDecay(14)), 0, 0.8);
  return stereoPan(normalize(room(b, 60, 0.45, 0.35), 0.85), -0.4, 0.4);
};
S['pen-scratch'] = () => normalize(penStroke(0.55, 21), 0.7);
S['pen-tick'] = () => {
  const b = buf(0.3);
  mixInto(b, penStroke(0.08, 23, 60), 0, 1);
  mixInto(b, penStroke(0.16, 24, 50), 0.1, 1);
  return normalize(b, 0.7);
};
S['pen-scribble'] = () => normalize(penStroke(0.7, 25, 70), 0.75);
S['marker-swipe'] = () => {
  const len = 0.35;
  return normalize(env(svf(noise(len, 27), (t) => 1400 + 1200 * (t / len), 'bp', 0.9), adsr(0.03, 0.05, 0.8, 0.12, len)), 0.65);
};
S['chime'] = () => {
  const len = 2; const b = buf(len);
  const bell = (f, at, g) => { for (const [m, a, k] of [[1, 1, 2.2], [2.76, 0.4, 3.5], [5.4, 0.2, 5], [8.9, 0.08, 7]]) mixInto(b, env(osc(len - at, f * m, 'sine'), expDecay(k)), at, g * a); };
  bell(1318.5, 0, 0.5); bell(1975.5, 0.09, 0.4);
  return stereoPan(normalize(room(b, 80, 0.4, 0.3), 0.75), -0.3, 0.3);
};
S['riser'] = () => {
  const len = 1.2;
  const b = env(svf(noise(len, 29), (t) => 300 + 6000 * (t / len) ** 2, 'bp', 1.5), (t) => (t / len) ** 2.2);
  mixInto(b, env(osc(len, (t) => 200 + 600 * (t / len) ** 2, 'saw'), (t) => 0.15 * (t / len) ** 3), 0, 1);
  return stereoPan(normalize(b, 0.8), -0.5, 0.5);
};
S['counter-ticks'] = () => {
  const len = 1; const b = buf(len);
  const tick = env(svf(noise(0.012, 31), 3000, 'bp', 2), expDecay(500));
  for (let i = 0, t = 0; t < 0.85; i++) { mixInto(b, tick, t, 0.9 - (t / 0.85) * 0.4); t += 0.035 + 0.05 * (t / 0.85) ** 2; }
  return normalize(b, 0.7);
};
S['card-flick'] = () => {
  const len = 0.18;
  const b = env(svf(noise(len, 33), (t) => 2500 + 3000 * (t / len), 'bp', 1.1), adsr(0.02, 0.04, 0.6, 0.08, len));
  mixInto(b, env(osc(0.06, 180, 'sine'), expDecay(60)), 0.03, 0.5);
  return normalize(b, 0.7);
};

S['door-knock'] = () => {
  // Two knuckle knocks on a wooden door: short low thud + woody mid click, small room.
  const len = 0.9; const b = buf(len);
  const knock = (at, g) => {
    mixInto(b, env(osc(0.25, (t) => 120 - 30 * t, 'sine'), expDecay(26)), at, g);
    mixInto(b, env(svf(noise(0.08, 51 + at * 100), 750, 'bp', 2.2), expDecay(55)), at, g * 1.1);
  };
  knock(0, 1); knock(0.24, 0.9);
  return stereoPan(normalize(room(drive(b, 1.4), 30, 0.35, 0.22), 0.95), 0.15, 0.15);
};
S['helicopter'] = () => {
  // Distant rotor chop (~9 Hz) over a low engine rumble, fading in and out.
  const len = 2.6;
  const chop = env(svf(noise(len, 53), 380, 'lp', 1.1), (t) => adsr(0.6, 0.2, 0.9, 0.8, len)(t) * (0.35 + 0.65 * Math.max(0, Math.sin(t * 9 * 2 * Math.PI)) ** 3));
  mixInto(chop, env(osc(len, 42, 'sine'), adsr(0.8, 0.2, 0.8, 0.8, len)), 0, 0.5);
  return stereoPan(normalize(room(chop, 90, 0.4, 0.3), 0.7), 0.5, -0.2);
};
S['tv-static'] = () => {
  // Short CRT static burst with flicker.
  const len = 0.9;
  return stereoPan(normalize(env(svf(noise(len, 55), 1800, 'hp'), (t) => adsr(0.02, 0.1, 0.7, 0.3, len)(t) * (0.6 + 0.4 * Math.sin(t * 60) ** 2)), 0.55), -0.2, 0.2);
};

// Phone + night-field sounds (added 2026-10-15 for The Last Call).
S['call-drop'] = () => {
  // Call disconnected: three short falling beeps, thin like a phone earpiece.
  const len = 1.1; const b = buf(len);
  [0, 0.3, 0.6].forEach((at, i) => mixInto(b, env(svf(osc(0.18, 480 - i * 40, 'square'), 2200, 'lp'), adsr(0.005, 0.02, 0.8, 0.03, 0.18)), at, 0.5));
  return stereoPan(normalize(svf(b, 300, 'hp'), 0.7), 0, 0);
};
S['phone-ring'] = () => {
  // US ringback heard down the line: 440+480 Hz, one 1.6 s ring.
  const len = 1.9; const b = buf(len);
  [0].forEach((at) => {
    const r = osc(1.6, 440, 'sine'); mixInto(r, osc(1.6, 480, 'sine'), 0, 1);
    mixInto(b, env(r, adsr(0.02, 0.05, 0.9, 0.05, 1.6)), at, 0.5);
  });
  return stereoPan(normalize(svf(svf(b, 350, 'hp'), 3000, 'lp'), 0.55), 0, 0);
};
S['night-wind'] = () => {
  // Open-field wind bed with a few crickets; long, soft in and out.
  const len = 6;
  const w = env(svf(noise(len, 61), (t) => 260 + 180 * Math.sin(t * 0.9) + 90 * Math.sin(t * 2.3), 'bp', 0.8), adsr(1.2, 0.3, 0.85, 1.6, len));
  for (let i = 0; i < 9; i++) {
    const at = 0.6 + i * 0.6 + (i % 3) * 0.13;
    mixInto(w, env(osc(0.09, 4300, 'sine'), (t) => Math.max(0, Math.sin(t * 2 * Math.PI * 40)) * expDecay(30)(t)), at, 0.05);
  }
  return stereoPan(normalize(w, 0.6), -0.4, 0.4);
};
S['night-crickets'] = () => {
  // Still night by a road: steady cricket chirps over a very faint, even air hiss (no swells, so it
  // never reads as waves).
  const len = 6; const b = buf(len);
  mixInto(b, env(svf(noise(len, 63), 2600, 'hp'), adsr(0.8, 0.2, 1, 1.2, len)), 0, 0.03);
  for (let i = 0; i < 26; i++) {
    const at = 0.3 + i * 0.22 + ((i * 7) % 5) * 0.012, f0 = 4200 + (i % 3) * 180;
    mixInto(b, env(osc(0.07, f0, 'sine'), (t) => Math.max(0, Math.sin(t * 2 * Math.PI * 45)) * expDecay(28)(t)), at, i % 2 ? 0.18 : 0.24);
  }
  return stereoPan(normalize(env(b, adsr(0.6, 0.2, 1, 1, len)), 0.45), -0.3, 0.3);
};
S['car-pass'] = () => {
  // Distant car approaching on gravel: low engine hum + tyre rumble swelling, then easing off.
  const len = 3.5;
  const swell = (t) => Math.sin(Math.PI * Math.min(1, t / len)) ** 1.5;
  const eng = env(osc(len, (t) => 52 + 10 * swell(t), 'saw'), swell);
  const tyre = env(svf(noise(len, 67), 420, 'lp', 0.9), (t) => swell(t) * 0.8);
  mixInto(tyre, svf(eng, 300, 'lp'), 0, 0.6);
  return stereoPan(normalize(tyre, 0.6), -0.5, 0.5);
};
S['footsteps-grass'] = () => {
  // Slow footsteps through dry grass: soft swishy crunches, ~1.5 steps per second.
  const len = 5; const b = buf(len);
  for (let i = 0; i < 7; i++) mixInto(b, env(svf(noise(0.28, 71 + i), 1800 + (i % 2) * 400, 'bp', 0.9), adsr(0.03, 0.08, 0.5, 0.15, 0.28)), 0.2 + i * 0.68, i % 2 ? 0.8 : 1);
  return stereoPan(normalize(svf(b, 500, 'hp'), 0.5), -0.15, 0.15);
};
S['river-water'] = () => {
  // Slow river bed: low rushing water with gentle gurgles.
  const len = 6;
  const w = env(svf(noise(len, 73), (t) => 650 + 220 * Math.sin(t * 1.7), 'lp', 0.9), adsr(1, 0.3, 0.9, 1.5, len));
  for (let i = 0; i < 14; i++) mixInto(w, env(osc(0.12, (t) => 300 + 500 * t + (i % 4) * 60, 'sine'), expDecay(22)), 0.3 + i * 0.4, 0.08);
  return stereoPan(normalize(w, 0.6), -0.3, 0.3);
};

// Cue words (as written in storyboards) → file. First match wins, so specific entries come first.
const INDEX = [
  { file: 'call-drop.wav', keywords: ['call drop', 'hang up', 'hang-up', 'disconnect', 'line dead'] },
  { file: 'phone-ring.wav', keywords: ['ringing', 'ring', 'phone dial', 'ringback'] },
  { file: 'night-crickets.wav', keywords: ['crickets', 'night crickets', 'night bed'] },
  { file: 'night-wind.wav', keywords: ['wind', 'field night'] },
  { file: 'car-pass.wav', keywords: ['engine', 'car passing', 'car pass'] },
  { file: 'footsteps-grass.wav', keywords: ['footsteps', 'footstep', 'walking'] },
  { file: 'river-water.wav', keywords: ['river', 'water', 'stream'] },
  { file: 'door-knock.wav', keywords: ['knock', 'door'] },
  { file: 'helicopter.wav', keywords: ['helicopter', 'rotor'] },
  { file: 'tv-static.wav', keywords: ['static', 'tv'] },
  { file: 'pen-scribble.wav', keywords: ['scribble'] },
  { file: 'pen-tick.wav', keywords: ['tick', 'check'] },
  { file: 'pen-scratch.wav', keywords: ['pen', 'scratch', 'write', 'draw'] },
  { file: 'marker-swipe.wav', keywords: ['marker', 'swipe', 'highlight', 'underline'] },
  { file: 'counter-ticks.wav', keywords: ['counter', 'count'] },
  { file: 'stamp-hit.wav', keywords: ['stamp', 'slam'] },
  { file: 'low-hit.wav', keywords: ['tension', 'low hit', 'boom', 'dread'] },
  { file: 'drone.wav', keywords: ['drone', 'ambience', 'ambient'] },
  { file: 'bright-impact.wav', keywords: ['bright', 'impact', 'reveal', 'sparkle'] },
  { file: 'punch.wav', keywords: ['punch', 'hit', 'thump'] },
  { file: 'riser.wav', keywords: ['riser', 'build'], alignEnd: true },
  { file: 'chime.wav', keywords: ['chime', 'ding', 'bell', 'success'] },
  { file: 'card-flick.wav', keywords: ['card', 'flick', 'paper', 'flip'] },
  { file: 'whoosh-up.wav', keywords: ['whoosh up', 'swoosh up'] },
  { file: 'whoosh.wav', keywords: ['whoosh', 'swoosh', 'transition'] },
  { file: 'pop.wav', keywords: ['pop', 'click', 'bubble'] },
];

for (const [name, make] of Object.entries(S)) {
  const out = make();
  await writeWav(join(OUT, `${name}.wav`), out);
}
const existing = JSON.parse(await readFile(join(OUT, 'index.json'), 'utf8').catch(() => '{"custom":[]}'));
await writeFile(join(OUT, 'index.json'), JSON.stringify({ note: 'Cue words → files. Put your own sounds in "custom" (checked first): { "file": "x.wav", "keywords": ["..."], "gain": 1 }.', custom: existing.custom ?? [], generated: INDEX }, null, 2));
console.log(`SFX library ${OUT}  (${Object.keys(S).length} sounds)`);
