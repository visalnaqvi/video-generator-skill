#!/usr/bin/env node
// Automatic quality check of a rendered video against its storyboard: format, length,
// loudness (social: -14 LUFS ±1.5, true peak ≤ -1 dBTP), silent gaps, black frames.
// Prints PASS/WARN/FAIL lines and writes render/qc.json.
//
// Usage: node studio/scripts/qc.mjs <video-folder> [--file render/final.mp4]

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;
const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? '');
const fileRel = (() => { const i = args.indexOf('--file'); return i >= 0 ? args[i + 1] : 'render/final.mp4'; })();
const file = join(dir, fileRel);
const sb = JSON.parse(await readFile(join(dir, 'storyboard.json'), 'utf8'));

const probe = JSON.parse(execFileSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
const duration = Number(probe.format.duration);
const [num, den] = (v?.r_frame_rate ?? '0/1').split('/').map(Number);
const fps = num / den;

const fps0 = sb.fps ?? 30;
const tf = (s, last) => (last || !s.transition || s.transition.type === 'none' ? 0 : s.transition.durationInFrames ?? 10);
const expected = sb.scenes.reduce((t, s, i) => t + s.durationInFrames - tf(s, i === sb.scenes.length - 1), 0) / fps0;
const [ew, eh] = { '9:16': [1080, 1920], '16:9': [1920, 1080], '1:1': [1080, 1080], '4:5': [1080, 1350] }[sb.format ?? '9:16'];

const run = (filter, extra = []) => spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', file, ...extra, '-filter_complex', filter, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
const loud = run('[0:a]ebur128=peak=true', ['-vn']);
const lufs = Number(loud.match(/Integrated loudness:\s*I:\s*(-?[\d.]+)/)?.[1]);
const tp = Number(loud.match(/True peak:\s*Peak:\s*(-?[\d.]+)/)?.[1]);
const sil = run('[0:a]silencedetect=noise=-45dB:d=0.8', ['-vn']);
const silences = [...sil.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]).filter(([s]) => s < duration - 1);
const blk = run('[0:v]blackdetect=d=0.3:pix_th=0.06', ['-an']);
const blacks = [...blk.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

const checks = [];
const check = (name, ok, detail, warnOnly = false) => checks.push({ name, status: ok ? 'PASS' : warnOnly ? 'WARN' : 'FAIL', detail });
check('Resolution', v?.width === ew && v?.height === eh, `${v?.width}x${v?.height} (expected ${ew}x${eh})`);
check('Frame rate', Math.abs(fps - fps0) < 0.01, `${fps.toFixed(2)} fps`);
check('Codecs', v?.codec_name === 'h264' && a?.codec_name === 'aac', `${v?.codec_name} + ${a?.codec_name ?? 'no audio'}`);
check('Length', Math.abs(duration - expected) < 0.25, `${duration.toFixed(2)} s (storyboard ${expected.toFixed(2)} s)`);
check('Loudness', Math.abs(lufs + 14) <= 1.5, `${lufs} LUFS (target -14 ±1.5)`);
check('True peak', tp <= -1, `${tp} dBTP (≤ -1)`, true);
check('Silent gaps', silences.length === 0, silences.length ? silences.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)} s`).join(', ') : 'none over 0.8 s', true);
check('Black frames', blacks.length === 0, blacks.length ? blacks.map(([s, e]) => `${s.toFixed(1)}–${e.toFixed(1)} s`).join(', ') : 'none', true);
check('Audio track', !!a && (sb.finalAudio ? true : false), sb.finalAudio ? `final mix (${sb.finalAudio})` : 'voice-over only — no music/SFX mix', true);

const size = (await stat(file)).size;
await writeFile(join(dir, 'render', 'qc.json'), JSON.stringify({ file: fileRel, sizeMB: +(size / 1048576).toFixed(1), duration, lufs, truePeak: tp, checks }, null, 1));
for (const c of checks) console.log(`${c.status.padEnd(4)}  ${c.name.padEnd(13)} ${c.detail}`);
console.log(`File  ${fileRel} · ${(size / 1048576).toFixed(1)} MB`);
const fails = checks.filter((c) => c.status === 'FAIL').length;
console.log(fails ? `${fails} check(s) failed` : 'All required checks passed');
process.exitCode = fails ? 1 : 0;
