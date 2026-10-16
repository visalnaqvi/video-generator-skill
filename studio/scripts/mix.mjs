#!/usr/bin/env node
// Mixes a video's final soundtrack: voice-over + music (ducked under the voice) + every
// storyboard sound cue on its frame (+ a soft whoosh on moving transitions), mastered to
// social-media loudness (-14 LUFS, -1.5 dBTP). Writes audio/mix.wav and audio/mix.json
// (the event list, for QC) and sets storyboard.finalAudio.
//
// Usage: node studio/scripts/mix.mjs <video-folder> [--music audio/music.wav]
//          [--music-db -16] [--sfx-db -12] [--auto-whoosh] [--dry]
// Keep sound design restrained: signature moments only; transition whooshes are opt-in.
// Music path defaults to storyboard.music.file. SFX come from studio/library/sfx (index.json).

import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? '');
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const exists = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };

const sbPath = join(dir, 'storyboard.json');
const sb = JSON.parse(await readFile(sbPath, 'utf8'));
const fps = sb.fps ?? 30;
const voRel = sb.audio;
if (!voRel) { console.error('storyboard.json has no "audio" (voice-over) — run the voiceover stage first'); process.exit(1); }
const timings = JSON.parse(await readFile(join(dir, sb.timing?.fittedTo ?? 'audio/timings.json'), 'utf8'));
const musicRel = opt('--music', sb.music?.file);
const musicDb = Number(opt('--music-db', sb.music?.db ?? -16));
const sfxDb = Number(opt('--sfx-db', sb.sfxDb ?? -12));

// ---------- scene timeline (mirrors Video.tsx) ----------
const tf = (s, last) => (last || !s.transition || s.transition.type === 'none' ? 0 : s.transition.durationInFrames ?? 10);
const starts = [];
let t = 0;
sb.scenes.forEach((s, i) => { starts.push(t / fps); t += s.durationInFrames - tf(s, i === sb.scenes.length - 1); });
const total = t / fps;

// ---------- sfx events ----------
const lib = JSON.parse(await readFile(join(ROOT, 'studio/library/sfx/index.json'), 'utf8'));
const entries = [...(lib.custom ?? []), ...lib.generated];
// a keyword matches at the start of a word ("whoosh" ⊂ "whooshes", but "ping" ⊄ "scraping", "pin" ⊄ "spinning")
const esc = (k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (cue) => entries.find((e) => e.keywords.some((k) => new RegExp(`(^|[^a-z0-9])${esc(k.toLowerCase())}`).test(cue.toLowerCase())));
const events = [];
const missing = [];
sb.scenes.forEach((s, i) => {
  const last = i === sb.scenes.length - 1;
  const sceneEnd = starts[i] + (s.durationInFrames - tf(s, last)) / fps;
  for (const c of s.sfx ?? []) {
    const e = pick(c.cue);
    if (!e) { missing.push(`${s.id}: "${c.cue}"`); continue; }
    const at = c.syncEnd ? sceneEnd - 0.25 : starts[i] + (c.at ?? 0) / fps;
    for (let r = 0; r < (c.repeat ?? 1); r++) events.push({ shot: s.id, cue: c.cue, file: e.file, t: at + (r * (c.every ?? 4)) / fps, gain: (c.gain ?? 1) * (e.gain ?? 1), alignEnd: !!e.alignEnd });
  }
  // Soft whoosh on moving transitions unless the shot already has one near its end.
  if (args.includes('--auto-whoosh') && !last && ['slide', 'wipe', 'pushCut', 'iris', 'flip'].includes(s.transition?.type)) {
    const tt = starts[i + 1];
    if (!events.some((ev) => /whoosh/.test(ev.file) && Math.abs(ev.t - tt) < 0.4)) events.push({ shot: s.id, cue: 'transition whoosh', file: 'whoosh.wav', t: tt - 0.25, gain: 0.45, alignEnd: false });
  }
});

// alignEnd sounds (risers) end on their cue time instead of starting there.
const durOf = new Map();
for (const ev of events) {
  if (!ev.alignEnd) continue;
  if (!durOf.has(ev.file)) durOf.set(ev.file, Number(execFileSync(require('ffprobe-static').path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(ROOT, 'studio/library/sfx', ev.file)]).toString()));
  ev.t -= durOf.get(ev.file);
}
for (const ev of events) ev.t = Math.max(0, +ev.t.toFixed(3));
events.sort((a, b) => a.t - b.t);

// ---------- ffmpeg graph ----------
const inputs = ['-i', join(dir, voRel)];
const f = [];
const db = (x) => (10 ** (x / 20)).toFixed(4);
f.push(`[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${total.toFixed(3)},asplit=2[vo][vokey]`);
const mixIn = ['[vo]'];
let musicNote = 'none';
if (musicRel && (await exists(join(dir, musicRel)))) {
  inputs.push('-stream_loop', '-1', '-i', join(dir, musicRel));
  const mi = inputs.filter((x) => x === '-i').length - 1;
  // Ducking: the voice drives a compressor on the music (smooth, follows every word).
  f.push(`[${mi}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${total.toFixed(3)},afade=t=out:st=${Math.max(0, total - 1.2).toFixed(3)}:d=1.2,volume=${db(musicDb)}[mus]`);
  f.push(`[mus][vokey]sidechaincompress=threshold=0.025:ratio=6:attack=15:release=350:makeup=1[duck]`);
  mixIn.push('[duck]');
  musicNote = `${musicRel} at ${musicDb} dB, ducked under VO`;
} else {
  f.push('[vokey]anullsink');
  if (musicRel) console.warn(`! music file not found: ${musicRel}`);
}
for (const [k, ev] of events.entries()) {
  inputs.push('-i', join(ROOT, 'studio/library/sfx', ev.file));
  const ii = inputs.filter((x) => x === '-i').length - 1;
  const ms = Math.round(ev.t * 1000);
  f.push(`[${ii}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${db(sfxDb)}*${ev.gain},adelay=${ms}|${ms}[s${k}]`);
  mixIn.push(`[s${k}]`);
}
f.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:dropout_transition=0,atrim=0:${total.toFixed(3)},alimiter=limit=0.89:level=false,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]`);

const outRel = 'audio/mix.wav';
if (!args.includes('--dry')) {
  execFileSync(ffmpeg, ['-y', '-v', 'error', ...inputs, '-filter_complex', f.join(';'), '-map', '[out]', '-ac', '2', '-c:a', 'pcm_s16le', join(dir, outRel)], { maxBuffer: 1 << 26 });
  await writeFile(join(dir, 'audio/mix.json'), JSON.stringify({ duration: +total.toFixed(3), voice: voRel, music: musicNote, sfxDb, events }, null, 1));
  sb.finalAudio = outRel;
  await writeFile(sbPath, JSON.stringify(sb, null, 2));
}
console.log(`Mix ${join(dir, outRel)}${args.includes('--dry') ? ' (dry run)' : ''}  (${total.toFixed(1)} s · voice + music: ${musicNote} · ${events.length} sound events)`);
const perShot = sb.scenes.map((s) => `${s.id}:${events.filter((e) => e.shot === s.id).length}`).join(' ');
console.log(`Events per shot: ${perShot}`);
if (missing.length) console.log(`No sound matched (add keywords or a custom sound):\n- ${missing.join('\n- ')}`);
