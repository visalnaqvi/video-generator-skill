#!/usr/bin/env node
// Joins separately built parts of one video (e.g. a pre-hook cold open in <video>/prehook/ and the main board in
// <video>/) into <video>/master/: ONE storyboard, ONE voice track and ONE timings file, so music, SFX, captions and
// the final render run once over the whole video. Each part keeps its own script/voice/fit; edit the part, re-run.
//   node studio/scripts/master.mjs videos/<video> [--parts prehook,.]
// Each part must be fitted (storyboard.json with `audio`, audio/timings.json). Part 1's scenes get beat 0.
// An existing master/storyboard.json keeps its music / captions / sfxDb settings. Prints compact JSON.
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const dir = resolve(args[0]);
const parts = opt('parts', 'prehook,.').split(',').map((p) => join(dir, p));
const M = join(dir, 'master');
await mkdir(join(M, 'audio'), { recursive: true });
const tf = (s) => (s.transition && s.transition.type !== 'none' ? s.transition.durationInFrames ?? 10 : 0);
const prev = JSON.parse(await readFile(join(M, 'storyboard.json'), 'utf8').catch(() => '{}'));

let offset = 0, fps = 30, lines = [], scenes = [], base = null;
const voice = [];
for (const [pi, p] of parts.entries()) {
  const sb = JSON.parse(await readFile(join(p, 'storyboard.json'), 'utf8'));
  const tm = JSON.parse(await readFile(join(p, sb.timing?.fittedTo ?? 'audio/timings.json'), 'utf8'));
  if (!sb.audio) throw new Error(`${p}: not fitted to a voice-over yet`);
  fps = sb.fps ?? 30;
  const last = pi === parts.length - 1;
  const frames = sb.scenes.reduce((a, s) => a + s.durationInFrames - tf(s), 0) + (last ? tf(sb.scenes.at(-1)) : 0);
  const len = frames / fps;
  voice.push({ file: join(p, sb.audio), len: last ? null : len });
  const tag = pi < parts.length - 1 ? `P${pi + 1}_` : '';
  const sh = (v) => +(v + offset).toFixed(3);
  lines.push(...tm.lines.map((l) => ({ ...l, id: tag + l.id, start: sh(l.start), end: sh(l.end), words: l.words.map((w) => ({ ...w, start: sh(w.start), end: sh(w.end) })) })));
  scenes.push(...sb.scenes.map((s) => (last ? s : { ...s, beat: 0 })));
  if (last) base = sb;
  offset += len;
}

// voice: every part but the last padded/trimmed to exactly its picture length, then concatenated
const inputs = voice.flatMap((v) => ['-i', v.file]);
const fc = voice.map((v, i) => `[${i}:a]aresample=48000${v.len != null ? `,apad,atrim=0:${v.len.toFixed(3)}` : ''}[a${i}]`).join(';')
  + ';' + voice.map((_, i) => `[a${i}]`).join('') + `concat=n=${voice.length}:v=0:a=1[a]`;
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[a]', '-c:a', 'libmp3lame', '-q:a', '2', join(M, 'audio/voiceover.mp3')]);
const tMain = JSON.parse(await readFile(join(parts.at(-1), base.timing?.fittedTo ?? 'audio/timings.json'), 'utf8'));
const lastEnd = Math.max(...lines.map((l) => l.end));
await writeFile(join(M, 'audio/timings.json'), JSON.stringify({ ...tMain, audio: 'audio/voiceover.mp3', duration: +lastEnd.toFixed(3), lines }, null, 1));

const sb = {
  ...base, ...(prev.music?.file ? { music: prev.music } : {}), ...(prev.captions ? { captions: prev.captions } : {}), ...(prev.sfxDb != null ? { sfxDb: prev.sfxDb } : {}),
  status: base.status === 'final' ? 'final' : 'approved', audio: 'audio/voiceover.mp3',
  timing: { ...base.timing, fittedTo: 'audio/timings.json', voDuration: +lastEnd.toFixed(3), parts: parts.map((p) => p.slice(dir.length + 1) || '.') }, scenes,
  note: `Built by studio/scripts/master.mjs from ${parts.map((p) => p.slice(dir.length + 1) || '.').join(' + ')}. Edit those, then rebuild; music, SFX, captions and the final render run here.`,
};
if (prev.finalAudio) sb.finalAudio = prev.finalAudio; // the last mix — re-run mix.mjs after any part changes
await writeFile(join(M, 'storyboard.json'), JSON.stringify(sb, null, 1));
const total = scenes.reduce((a, s) => a + s.durationInFrames - tf(s), 0) + tf(scenes.at(-1));
console.log(JSON.stringify({ master: 'master/storyboard.json', parts: sb.timing.parts, shots: scenes.length, total_s: +(total / fps).toFixed(2), kept: Object.keys(prev).filter((k) => ['music', 'captions', 'sfxDb'].includes(k)) }));
