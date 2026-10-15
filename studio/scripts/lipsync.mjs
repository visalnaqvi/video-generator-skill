#!/usr/bin/env node
// Lip-sync track for live universe characters: the voice-over's word timings + its loudness →
// one mouth shape per video frame (the 9 cartoon shapes, Rhubarb Lip Sync names).
//
//   node studio/scripts/lipsync.mjs <video-dir> [--timings audio/timings.json] [--out audio/lipsync.json] [--fps 30]
//
// Shapes: X rest · A M/B/P · B most consonants, EE · C EH/AE · D AA · E AO/ER/R · F OO/W · G F/V · H L
// Words are split into sounds with English spelling rules (Devanagari for Hindi), spread over the
// word's spoken time (vowels 3× a consonant), shown 1 frame early (animators lead the sound), then cleaned:
// soft frames close down, one-frame flickers merge, short pauses stay half-open, long ones rest.
// Output (compact; read by render.mjs → the rig):
//   { fps, frames, source, mouth: "XXBCDDA…" (1 char/frame), open: "0013579…" (loudness 0–9/frame),
//     lines: [{ id, speaker?, from, to }] (frames; speaker = dialogue line from `VO (Nox): …`) }

import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dir = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
if (!dir) { console.error('Usage: node studio/scripts/lipsync.mjs <video-dir> [--timings audio/timings.json] [--out audio/lipsync.json] [--fps 30]'); process.exit(1); }
const vdir = resolve(dir);
const timingsPath = resolve(vdir, opt('--timings', 'audio/timings.json'));
const outPath = resolve(vdir, opt('--out', 'audio/lipsync.json'));
const fps = Number(opt('--fps', 30));
const tm = JSON.parse(await readFile(timingsPath, 'utf8'));

// ---------- words → sounds ----------
// [pattern, shapes]; first match wins, longest patterns first. Vowel sounds get weight 2.
const EN = [
  ['tion', 'BCB'], ['sion', 'BCB'], ['ough', 'E'], ['augh', 'E'], ['igh', 'C'],
  ['th', 'B'], ['sh', 'B'], ['ch', 'B'], ['ph', 'G'], ['wh', 'F'], ['qu', 'BF'], ['ck', 'B'], ['ng', 'B'],
  ['ee', 'B'], ['ea', 'B'], ['ie', 'B'], ['ey', 'B'], ['oo', 'F'], ['ou', 'EF'], ['ow', 'EF'], ['oa', 'E'], ['oe', 'E'], ['oi', 'EB'], ['oy', 'EB'],
  ['ai', 'CB'], ['ay', 'CB'], ['au', 'E'], ['aw', 'E'], ['ew', 'F'],
  ['ar', 'DE'], ['or', 'E'], ['er', 'E'], ['ir', 'E'], ['ur', 'E'],
  ['a', 'C'], ['e', 'C'], ['i', 'C'], ['o', 'E'], ['u', 'C'], ['y', 'B'],
  ['m', 'A'], ['b', 'A'], ['p', 'A'], ['f', 'G'], ['v', 'G'], ['w', 'F'], ['l', 'H'], ['r', 'E'],
];
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function english(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '').replace(/(.)\1/g, '$1');
  if (w.length > 3 && w.endsWith('e') && !VOWELS.has(w.at(-2))) w = w.slice(0, -1); // silent e
  const out = [];
  for (let i = 0; i < w.length;) {
    const hit = EN.find(([p]) => w.startsWith(p, i));
    if (hit) {
      const vowel = VOWELS.has(hit[0][0]) || hit[0] === 'igh' || hit[0] === 'ough' || hit[0] === 'augh';
      for (const s of hit[1]) out.push({ s, w: vowel ? 3 : 1 });
      i += hit[0].length;
    } else { out.push({ s: 'B', w: 1 }); i += 1; }
  }
  return out;
}

// Devanagari: consonants carry an inherent 'a' unless a vowel sign or virama follows (dropped at word end).
const DV = { lips: 'पफबभम', fv: 'व', l: 'ल', open: 'अ', wide: 'आा', ee: 'इईिी', eh: 'एेऐै', oo: 'उऊुू', oh: 'ओोऔौ' };
function devanagari(word) {
  const ch = [...word.normalize('NFC')];
  const out = [];
  const isCons = (c) => c >= 'क' && c <= 'ह';
  const isSign = (c) => DV.wide.includes(c) || DV.ee.includes(c) || DV.eh.includes(c) || DV.oo.includes(c) || DV.oh.includes(c) || c === '्';
  ch.forEach((c, i) => {
    if (isCons(c)) {
      out.push({ s: DV.lips.includes(c) ? 'A' : DV.fv.includes(c) ? 'G' : DV.l.includes(c) ? 'H' : 'B', w: 1 });
      if (!isSign(ch[i + 1] ?? '') && i < ch.length - 1) out.push({ s: 'C', w: 3 });
    } else if (DV.open.includes(c)) out.push({ s: 'C', w: 3 });
    else if (DV.wide.includes(c)) out.push({ s: 'D', w: 3 });
    else if (DV.ee.includes(c)) out.push({ s: 'B', w: 3 });
    else if (DV.eh.includes(c)) out.push({ s: 'C', w: 3 });
    else if (DV.oo.includes(c)) out.push({ s: 'F', w: 3 });
    else if (DV.oh.includes(c)) out.push({ s: 'E', w: 3 });
    else if (c === 'ं') out.push({ s: 'B', w: 1 });
  });
  return out;
}

function sounds(word) {
  if (/[ऀ-ॿ]/.test(word)) return devanagari(word);
  const s = english(word);
  if (s.length) return s;
  // digits / symbols: open-close per character
  return [...word.replace(/\s/g, '')].map((_, i) => ({ s: i % 2 ? 'B' : 'C', w: 1 }));
}

// ---------- loudness per frame ----------
const ffmpeg = require('ffmpeg-static');
const audioPath = resolve(vdir, tm.audio ?? 'audio/voiceover.mp3');
const pcm = await new Promise((ok, fail) => {
  const p = spawn(ffmpeg, ['-v', 'error', '-i', audioPath, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-']);
  const chunks = [];
  p.stdout.on('data', (d) => chunks.push(d));
  p.on('error', fail);
  p.on('close', (code) => (code ? fail(new Error(`ffmpeg exited ${code} on ${audioPath}`)) : ok(Buffer.concat(chunks))));
});
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 4));
const per = 8000 / fps;
const frames = Math.ceil((tm.duration ?? samples.length / 8000) * fps) + 1;
const rms = Array.from({ length: frames }, (_, f) => {
  let s = 0, n = 0;
  for (let i = Math.floor(f * per); i < Math.min(samples.length, Math.floor((f + 1) * per)); i++, n++) s += samples[i] * samples[i];
  return n ? Math.sqrt(s / n) : 0;
});
const voiced = rms.filter((v) => v > 0.005).sort((a, b) => a - b);
const ref = voiced[Math.floor(voiced.length * 0.95)] || 1;
const env = rms.map((v) => Math.min(1, v / ref));

// ---------- sounds → timed units ----------
const LEAD = 1 / fps;
const units = [];
const lines = [];
for (const line of tm.lines) {
  lines.push({ id: line.id, ...(line.speaker ? { speaker: line.speaker } : {}), from: Math.max(0, Math.round((line.start - LEAD) * fps)), to: Math.round((line.end - LEAD) * fps) });
  for (const w of line.words ?? []) {
    const ss = sounds(w.text);
    const total = ss.reduce((a, x) => a + x.w, 0) || 1;
    let t = w.start - LEAD;
    for (const x of ss) {
      const d = ((w.end - w.start) * x.w) / total;
      units.push({ s: x.s, a: t, b: t + d, line: line.id });
      t += d;
    }
  }
}

// ---------- units → one shape per frame ----------
const mouth = Array(frames).fill('X');
let u = 0;
for (let f = 0; f < frames; f++) {
  const a = f / fps, b = (f + 1) / fps;
  while (u < units.length && units[u].b <= a) u++;
  let best = null, bestO = 0, closure = 0;
  for (let k = u; k < units.length && units[k].a < b; k++) {
    const o = Math.min(b, units[k].b) - Math.max(a, units[k].a);
    if (o <= 0) continue;
    if (units[k].s === 'A') closure = Math.max(closure, o);
    if (o > bestO) { bestO = o; best = units[k].s; }
  }
  if (closure >= 0.35 / fps) best = 'A';
  if (best) {
    if ('CDEH'.includes(best) && env[f] < 0.12) best = 'B';   // soft frames close down
    if (best === 'D' && env[f] < 0.35) best = 'C';             // quiet speech is never wide open
    if (best === 'C' && env[f] >= 0.72) best = 'D';            // loud open vowels open wide
    if (best === 'B' && env[f] >= 0.55) best = 'C';            // loud teeth sounds open up (spelling can't tell 'death' from 'heat')
  }
  mouth[f] = best ?? 'X';
}
// pauses inside a line: short ones stay half-open (B), long ones rest
for (const l of lines) {
  for (let f = l.from; f <= l.to && f < frames; f++) {
    if (mouth[f] !== 'X') continue;
    let e = f; while (e <= l.to && mouth[e] === 'X') e++;
    if ((e - f) / fps < 0.18) for (let k = f; k < e; k++) mouth[k] = 'B';
    f = e;
  }
}
// one-frame flickers between two equal neighbours merge (lip contacts stay: M/B/P closures, F/V)
for (let f = 1; f < frames - 1; f++) if (!'AG'.includes(mouth[f]) && mouth[f - 1] === mouth[f + 1] && mouth[f] !== mouth[f - 1]) mouth[f] = mouth[f - 1];

const out = {
  fps, frames, source: 'words+spelling', timings: timingsPath.slice(vdir.length + 1).replace(/\\/g, '/'),
  mouth: mouth.join(''), open: env.map((v) => Math.round(v * 9)).join(''), lines,
};
await writeFile(outPath, JSON.stringify(out));
const counts = Object.fromEntries([...'XABCDEFGH'].map((s) => [s, mouth.filter((m) => m === s).length]));
console.log(JSON.stringify({ out: outPath, frames, seconds: +(frames / fps).toFixed(2), lines: lines.length, shapes: counts }));
