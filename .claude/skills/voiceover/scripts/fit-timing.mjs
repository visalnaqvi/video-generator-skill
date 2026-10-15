#!/usr/bin/env node
// Fits the storyboard to the real voice-over: each shot starts when its first words are
// spoken and lasts until the next shot's words begin; the last shot holds after the VO.
// Layers, sfx, effects and camera shakes marked with `"sync": "<word>"` land on that word
// (+ `syncOffset` frames). `"syncNth": 2` picks the 2nd time the word is spoken in the shot.
// `"exitSync": "<word>"` (+ `exitSyncOffset`, `exitSyncNth`) starts a layer's exit on that word.
// A shot with `"leadIn": <seconds>` starts that much before its first word (e.g. a shot that opens on
// the script's [SILENCE] after the previous line).
// Writes the fitted storyboard.json (audio set, version bumped) and prints a report.
//
// Usage: node .claude/skills/voiceover/scripts/fit-timing.mjs <video-folder> [--timings audio/timings.json] [--hold 2] [--dry]
//          [--storyboard storyboard.json]   another storyboard file in the folder (e.g. a variant)

import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const dir = resolve(args.find((a) => !a.startsWith('--')) ?? '');
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const dry = args.includes('--dry');
const timingsRel = opt('--timings', 'audio/timings.json');
const timings = JSON.parse(await readFile(join(dir, timingsRel), 'utf8'));
const sbPath = join(dir, opt('--storyboard', 'storyboard.json'));
const sb = JSON.parse(await readFile(sbPath, 'utf8'));
const fps = sb.fps ?? 30;
const hold = Number(opt('--hold', sb.holdAfterVO ?? 2));
const LEAD = 0.12; // cut slightly before the first word so the shot is settled when it's spoken
const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const tf = (s, last) => (last || !s.transition || s.transition.type === 'none' ? 0 : s.transition.durationInFrames ?? 10);

// A split starts at word w when the spoken words from w spell its words (compared as joined letters,
// so "Forty-seven" spoken as one token matches the split words "forty", "seven").
const startsSplit = (words, w, split) => {
  const target = split.map(norm).join('');
  if (!target || !target.startsWith(norm(words[w].text))) return false;
  let got = '';
  for (let k = w; k < words.length && got.length < target.length; k++) got += norm(words[k].text);
  return got === target;
};

// Words spoken during each shot (lines map to shots; `splits` hand later words to later shots).
const shotWords = new Map(sb.scenes.map((s) => [s.id, []]));
for (const line of timings.lines) {
  let current = line.shot;
  const splits = (line.splits ?? []).filter((sp) => sp.shot !== line.shot);
  let si = 0;
  for (let w = 0; w < line.words.length; w++) {
    const sp = splits[si];
    if (sp && startsSplit(line.words, w, sp.words)) { current = sp.shot; si++; }
    shotWords.get(current)?.push(line.words[w]);
  }
}

// Shot start times.
const n = sb.scenes.length;
const starts = [];
sb.scenes.forEach((s, i) => {
  const ws = shotWords.get(s.id) ?? [];
  if (i === 0) starts.push(0);
  else if (ws.length) starts.push(Math.max(starts[i - 1] + 0.5, ws[0].start - LEAD - (s.leadIn ?? 0)));
  else starts.push(null);
});
// Shots without words keep their previous visible length.
for (let i = 1; i < n; i++) if (starts[i] === null) starts[i] = starts[i - 1] + (sb.scenes[i - 1].durationInFrames - tf(sb.scenes[i - 1], false)) / fps;

const report = [];
const warnings = [];
sb.scenes.forEach((s, i) => {
  const last = i === n - 1;
  const ws = shotWords.get(s.id) ?? [];
  const visibleEnd = last ? Math.max((ws.at(-1)?.end ?? timings.duration) + hold, starts[i] + 2) : starts[i + 1];
  const visible = visibleEnd - starts[i];
  const old = s.durationInFrames;
  s.durationInFrames = Math.round(visible * fps) + tf(s, last);
  const anchors = [];
  const resolveSync = (obj, kind) => {
    if (!obj?.sync) return;
    const hits = ws.filter((x) => norm(x.text) === norm(obj.sync));
    const pool = hits.length ? hits : ws.filter((x) => norm(x.text).startsWith(norm(obj.sync)));
    const w = pool[(obj.syncNth ?? 1) - 1];
    if (!w) { warnings.push(`${s.id}: sync word "${obj.sync}" not spoken in this shot`); return; }
    // Layers/effects/shakes run on template frames (offset by startFrom); sfx cues count from the shot's first visible frame.
    const at = Math.max(0, Math.round((w.start - starts[i]) * fps) + (obj.syncOffset ?? 0) + (kind === 'cue' ? 0 : s.startFrom ?? 0));
    if (kind === 'layer') obj.enter = { ...(obj.enter ?? { preset: 'fade' }), at };
    else obj.at = at;
    anchors.push(`${obj.sync}@${at}`);
  };
  // `exitSync` (+ `exitSyncOffset`, `exitSyncNth`): the layer's exit starts on that word.
  const resolveExit = (l) => {
    if (!l?.exitSync) return;
    const tmp = { sync: l.exitSync, syncOffset: l.exitSyncOffset, syncNth: l.exitSyncNth };
    resolveSync(tmp, 'sfx');
    if (tmp.at != null) l.exit = { ...(l.exit ?? { preset: 'fade', dur: 8 }), at: tmp.at };
  };
  // Library components keep timed moments inside props as `{ sync }` objects → they get `at`.
  const walkProps = (v) => { if (Array.isArray(v)) v.forEach(walkProps); else if (v && typeof v === 'object') { if (typeof v.sync === 'string') resolveSync(v, 'sfx'); Object.values(v).forEach(walkProps); } };
  const walk = (layers) => (layers ?? []).forEach((l) => { resolveSync(l, 'layer'); resolveExit(l); if (l.type === 'group') walk(l.layers); if (l.type === 'component') walkProps(l.props); });
  walk(s.props?.layers);
  (s.sfx ?? []).forEach((x) => resolveSync(x, 'cue'));
  (s.props?.effects ?? []).forEach((x) => resolveSync(x, 'sfx'));
  (s.props?.camera?.shake ?? []).forEach((x) => resolveSync(x, 'sfx'));
  // Contact sheet / deck still: after the last anchored moment has landed (~0.8 s), inside the shot.
  const lastAt = Math.max(-1, ...anchors.map((x) => Number(x.split('@')[1])));
  const visibleFrames = s.durationInFrames - tf(s, last);
  if (lastAt >= 0) s.sheetFrame = Math.max(s.sheetFrame ?? 0, lastAt - (s.startFrom ?? 0) + Math.round(0.8 * fps));
  if (!s.sheetFrame || s.sheetFrame >= visibleFrames) s.sheetFrame = Math.max(1, visibleFrames - Math.round(0.15 * fps));
  if (visible < 1.2) warnings.push(`${s.id}: only ${visible.toFixed(1)} s on screen — consider merging with a neighbour`);
  report.push(`${String(i + 1).padStart(2, '0')} ${s.id.padEnd(18)} ${starts[i].toFixed(2).padStart(6)}s  ${(old / fps).toFixed(2)}s → ${(s.durationInFrames / fps).toFixed(2)}s  ${anchors.join(' ')}`);
});

const total = starts[n - 1] + (sb.scenes[n - 1].durationInFrames) / fps;
sb.audio = timingsRel.replace('timings-draft.json', 'voiceover-draft.mp3').replace('timings.json', 'voiceover.mp3');
sb.timing = { fittedTo: timingsRel, voice: timings.voice, engine: timings.engine, voDuration: timings.duration, fitted: new Date().toISOString().slice(0, 10) };
if (!dry) { sb.version = (sb.version ?? 1) + 1; await writeFile(sbPath, JSON.stringify(sb, null, 2)); }
console.log(`Fitted ${n} shots to ${timingsRel} (VO ${timings.duration.toFixed(1)} s) → video ${total.toFixed(1)} s${dry ? ' (dry run, not saved)' : ''}`);
console.log(report.join('\n'));
if (warnings.length) console.log(`Warnings:\n- ${warnings.join('\n- ')}`);
