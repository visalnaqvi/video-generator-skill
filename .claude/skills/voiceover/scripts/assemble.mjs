#!/usr/bin/env node
// Joins passage clips (or legacy per-line clips): trims at passage edges, inserts
// designed pauses, levels loudness (-16 LUFS, broadcast-style for social), and writes
// timings.json with every line's and word's start/end on the final track.
// Dialogue passages (another speaker) sit in the same clips folder; a change of speaker gets
// the `gaps.turn` pause and timings.json lists each line's speaker and the voices used.
//
// Usage: node .claude/skills/voiceover/scripts/assemble.mjs <voice-script.json> <clips-dir> [--out audio/voiceover.mp3] [--only L01,L03]
//   Output paths are relative to the video folder (the voice-script's parent's parent).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildPassages, validateSegments } from './passages.mjs';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;

const args = process.argv.slice(2);
const [vsPath, clipsDir] = args.filter((a) => !a.startsWith('--'));
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (!vsPath || !clipsDir) { console.error('Usage: node assemble.mjs <voice-script.json> <clips-dir> [--out audio/voiceover.mp3]'); process.exit(1); }
const vs = JSON.parse(await readFile(vsPath, 'utf8'));
const passages = buildPassages(vs, opt('--only') ? new Set(opt('--only').split(',')) : null);
if (!passages.length) throw new Error('No narration passages selected');
const videoDir = resolve(dirname(vsPath), '..');
const outRel = opt('--out') ?? 'audio/voiceover.mp3';
const outPath = join(videoDir, outRel);
const timingsPath = join(dirname(outPath), outRel.includes('draft') ? 'timings-draft.json' : 'timings.json');
const g = { line: vs.narration ? 0.12 : 0.22, beat: vs.narration ? 0.18 : 0.4, lead: 0.15, tail: 0.3, ...vs.gaps };

const dur = (f) => Number(execFileSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

const inputs = [];
const filters = [];
const labels = [];
const lines = [];
const speakerVoices = {};
let t = g.lead;
if (g.lead > 0) { filters.push(`anullsrc=r=48000:cl=mono,atrim=0:${g.lead}[lead]`); labels.push('[lead]'); }
for (const [i, passage] of passages.entries()) {
  const clip = join(clipsDir, `${passage.id}.mp3`);
  const meta = JSON.parse(await readFile(join(clipsDir, `${passage.id}.json`), 'utf8'));
  const segments = validateSegments(passage, meta);
  const total = dur(clip);
  const words = meta.words ?? [];
  // Trim to speech: from just before the first word to just after the last one.
  const a = words.length ? Math.max(0, words[0].start - 0.04) : 0;
  const b = words.length ? Math.min(total, words.at(-1).end + 0.12) : total;
  inputs.push('-i', clip);
  filters.push(`[${inputs.length / 2 - 1}:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=mono[c${i}]`);
  labels.push(`[c${i}]`);
  for (const [j, line] of passage.lines.entries()) {
    const ws = segments[j].words;
    lines.push({
      id: line.id, beat: line.beat, shot: line.shot, splits: line.splits, ...(line.speaker ? { speaker: line.speaker } : {}), text: line.text,
      passage: passage.id,
      start: +(t + (ws[0]?.start ?? a) - a).toFixed(3),
      end: +(t + (ws.at(-1)?.end ?? b) - a).toFixed(3),
      words: ws.map((w) => ({ text: w.text, start: +(t + w.start - a).toFixed(3), end: +(t + w.end - a).toFixed(3) })),
    });
  }
  t += b - a;
  const line = passage.lines.at(-1);
  const next = passages[i + 1]?.lines[0];
  // a change of speaker gets a turn-taking pause (at least the beat/line gap)
  const turn = next && (next.speaker ?? null) !== (line.speaker ?? null) ? g.turn ?? 0.28 : 0;
  const gap = line.pauseAfter ?? (next ? Math.max(turn, next.beat !== line.beat ? g.beat : g.line) : g.tail);
  if (meta.voice) speakerVoices[line.speaker ?? 'narrator'] = meta.voice;
  if (gap > 0) { filters.push(`anullsrc=r=48000:cl=mono,atrim=0:${gap}[g${i}]`); labels.push(`[g${i}]`); t += gap; }
}
filters.push(`${labels.join('')}concat=n=${labels.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[out]`);
await mkdir(dirname(outPath), { recursive: true });
execFileSync(ffmpeg, ['-y', '-v', 'error', ...inputs, '-filter_complex', filters.join(';'), '-map', '[out]', '-ac', '1', '-b:a', '160k', outPath]);

const final = dur(outPath);
const first = passages.find((p) => !p.lines[0].speaker) ?? passages[0];
const voice = JSON.parse(await readFile(join(clipsDir, `${first.id}.json`), 'utf8'));
const cast = Object.keys(speakerVoices).some((k) => k !== 'narrator') ? { voices: speakerVoices } : {};
await writeFile(timingsPath, JSON.stringify({ audio: outRel, voice: voice.voice, engine: voice.engine ?? 'edge', ...cast, duration: +final.toFixed(3), lines }, null, 1));
console.log(`Voice-over ${outPath}  (${final.toFixed(1)} s, ${lines.length} lines)`);
console.log(`Timings   ${timingsPath}`);
