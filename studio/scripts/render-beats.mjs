#!/usr/bin/env node
// Renders a fitted storyboard one script beat at a time, so a change to one beat re-renders only that beat,
// then stitches the clips (optionally after other clips, e.g. a pre-hook) into one preview.
//   node studio/scripts/render-beats.mjs videos/<video> [--beats 3,5] [--scale 0.4]
//   node studio/scripts/render-beats.mjs videos/<video> --stitch [--before prehook/render/prehook-432p.mp4] [--out render/stitched.mp4]
// Per beat: render/beats/beatNN.json (its shots, the last one's outgoing transition dropped) + audio/beatNN.mp3
// (that beat's slice of the voice-over) → render/beats/beatNN.mp4. Prints compact JSON.
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const dir = resolve(args[0]);
const outDir = join(dir, 'render', 'beats');
const run = (cmd, a) => { const r = spawnSync(cmd, a, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`${cmd}: ${(r.stderr || r.stdout).slice(-600)}`); return r.stdout; };
const pad = (n) => String(n).padStart(2, '0');

if (args.includes('--stitch')) {
  const sb = JSON.parse(await readFile(join(dir, 'storyboard.json'), 'utf8'));
  const beats = [...new Set(sb.scenes.map((s) => s.beat))];
  const clips = [...(opt('before') ? opt('before').split(',').map((p) => resolve(dir, p)) : []), ...beats.map((b) => join(outDir, `beat${pad(b)}.mp4`))];
  for (const c of clips) await stat(c).catch(() => { throw new Error(`missing clip ${relative(dir, c)} — render it first`); });
  const out = resolve(dir, opt('out', 'render/stitched-preview.mp4'));
  // re-encode on join: clips can differ in audio layout (a clip without music, a silent pre-hook)
  const inputs = clips.flatMap((c) => ['-i', c]);
  const fc = clips.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('') + `concat=n=${clips.length}:v=1:a=1[v][a]`;
  run(ffmpeg, ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast', '-c:a', 'aac', '-b:a', '128k', out]);
  console.log(JSON.stringify({ stitched: relative(process.cwd(), out), clips: clips.map((c) => relative(dir, c)) }));
  process.exit(0);
}

const sb = JSON.parse(await readFile(join(dir, 'storyboard.json'), 'utf8'));
if (!sb.audio) throw new Error('storyboard has no audio — run the voiceover fit first');
const fps = sb.fps ?? 30;
const tf = (s) => (s.transition && s.transition.type !== 'none' ? s.transition.durationInFrames ?? 10 : 0);
const want = opt('beats') ? opt('beats').split(',').map(Number) : null;
const scale = opt('scale', '0.4');
await mkdir(join(outDir, 'audio'), { recursive: true });

let start = 0;
const made = [];
const beats = [...new Set(sb.scenes.map((s) => s.beat))];
for (const b of beats) {
  const shots = sb.scenes.filter((s) => s.beat === b);
  const visible = shots.reduce((a, s) => a + s.durationInFrames - tf(s), 0);
  if (!want || want.includes(b)) {
    const scenes = shots.map((s, i) => (i === shots.length - 1 ? { ...s, durationInFrames: s.durationInFrames - tf(s), transition: { type: 'none' } } : s));
    const audio = join(outDir, 'audio', `beat${pad(b)}.mp3`);
    run(ffmpeg, ['-y', '-loglevel', 'error', '-ss', (start / fps).toFixed(3), '-t', (visible / fps).toFixed(3), '-i', join(dir, sb.audio), '-c:a', 'libmp3lame', '-q:a', '4', audio]);
    const json = join(outDir, `beat${pad(b)}.json`);
    await writeFile(json, JSON.stringify({ ...sb, audio: `audio/beat${pad(b)}.mp3`, scenes }, null, 1));
    const mp4 = join(outDir, `beat${pad(b)}.mp4`);
    run(process.execPath, [join(process.cwd(), 'studio/scripts/render.mjs'), json, '--preview', '--scale', scale, '--out', mp4]);
    made.push({ beat: b, shots: shots.length, s: +(visible / fps).toFixed(2), clip: relative(process.cwd(), mp4) });
    process.stdout.write(`\rbeat ${b} done`);
  }
  start += visible;
}
console.log('\n' + JSON.stringify({ rendered: made, total_s: +(start / fps).toFixed(2) }));
