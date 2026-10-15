#!/usr/bin/env node
// Builds audio/voice-script.json from an approved script.md + storyboard.json: one entry per
// VO line with its beat and storyboard shot; connected lines are generated as passages.
// Keeps edited pronunciation, passage, rate/pitch and explicit pause controls.
// Dialogue: `VO (Nox): …` is spoken by that character (speaker "nox") in its own voice —
// `voices.<speaker>`, seeded from the universe character's saved `voice`; plain `VO:` is the narrator.
//
// Usage: node .claude/skills/voiceover/scripts/voice-script.mjs <video-folder>

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const dir = resolve(process.argv[2] ?? '');
if (!process.argv[2]) { console.error('Usage: node voice-script.mjs <video-folder>'); process.exit(1); }
const script = (await readFile(join(dir, 'script.md'), 'utf8')).replace(/\r/g, '');
const sb = JSON.parse(await readFile(join(dir, 'storyboard.json'), 'utf8').catch(() => '{"scenes":[]}'));
const outPath = join(dir, 'audio', 'voice-script.json');
const prev = JSON.parse(await readFile(outPath, 'utf8').catch(() => '{"lines":[]}'));
const prevByText = new Map();
for (const line of prev.lines) {
  if (!prevByText.has(line.text)) prevByText.set(line.text, []);
  prevByText.get(line.text).push(line);
}

// Apostrophes join (won't → wont) so split words match the TTS word timings one-to-one.
const norm = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// `VO (Nox):` → "nox"; `VO:` / `VO (Narrator):` → the narrator (no speaker)
const speakerId = (name) => {
  const id = (name ?? '').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return !id || id === 'narrator' || id === 'vo' ? null : id;
};
const heads = [...script.matchAll(/^## Beat (\d+)\s*[—-]\s*(.+?)(?:\s*\(.*\))?\s*$/gm)];
const end = script.search(/^## (Pronunciations|Sources)/m);
const lines = [];
heads.forEach((h, i) => {
  const body = script.slice(h.index + h[0].length, i + 1 < heads.length ? heads[i + 1].index : end > h.index ? end : undefined);
  const delivery = (body.match(/^DELIVERY:\s*(.+)$/m) || [])[1]?.trim() ?? '';
  const beat = Number(h[1]);
  for (const m of body.matchAll(/^VO(?:\s*\(([^)]+)\))?:\s*(.+)$/gm)) {
    const text = m[2].trim();
    const speaker = speakerId(m[1]);
    if (/^\[SILENCE/i.test(text)) { if (lines.length) lines.at(-1).pauseAfter = Number(text.match(/([\d.]+)/)?.[1] ?? 1); continue; }
    // Which storyboard shot speaks this line: exact match in a shot's `vo`, else a shot whose vo contains it, else the beat's first shot.
    const shot = sb.scenes.find((s) => (s.vo ?? []).some((v) => norm(v) === norm(text)))
      ?? sb.scenes.find((s) => (s.vo ?? []).some((v) => norm(v).includes(norm(text)) || norm(text).includes(norm(v))))
      ?? sb.scenes.find((s) => s.beat === beat);
    const old = prevByText.get(text)?.shift() ?? {};
    const controls = Object.fromEntries(['ttsDeva', 'passage', 'rate', 'pitch'].filter((k) => old[k] != null).map((k) => [k, old[k]]));
    lines.push({ id: `L${String(lines.length + 1).padStart(2, '0')}`, beat, shot: shot?.id ?? null, ...(speaker ? { speaker } : {}), text, tts: old.tts ?? text, ...controls, pauseAfter: old.pauseAfter ?? null, delivery });
  }
});

// Lines a single storyboard shot speaks in several parts (e.g. "CA Sanjay Aggarwal aur" / "CA Manoj Batra.")
// are split across shots: map partial matches so each shot gets its own words.
for (const s of sb.scenes) {
  for (const v of s.vo ?? []) {
    if (lines.some((l) => norm(l.text) === norm(v))) continue;
    const parent = lines.find((l) => norm(l.text).includes(norm(v)));
    if (parent) (parent.splits ??= []).push({ shot: s.id, words: norm(v).split(' ') });
  }
}

// A voice per dialogue speaker: kept from the previous voice script, else the universe character's saved voice.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const brief = (await readFile(join(dir, 'brief.md'), 'utf8').catch(() => '')).replace(/\r/g, '');
const universe = sb.universe ?? brief.match(/^universe:\s*"?([\w-]+)/m)?.[1] ?? null;
const voices = {};
for (const sp of [...new Set(lines.map((l) => l.speaker).filter(Boolean))]) {
  const ch = universe ? JSON.parse(await readFile(join(ROOT, 'studio/library/universes', universe, 'characters', sp, 'character.json'), 'utf8').catch(() => '{}')) : {};
  voices[sp] = prev.voices?.[sp]?.name ? prev.voices[sp] : (ch.voice ? { engine: ch.voice.engine ?? 'edge', name: ch.voice.name, rate: ch.voice.rate ?? '+0%', pitch: ch.voice.pitch ?? '+0Hz' } : { engine: 'edge', name: null, rate: '+0%', pitch: '+0Hz' });
}

const pron = [...(script.slice(end).matchAll(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm))].map((m) => ({ word: m[1], sayAs: m[2] })).filter((p) => !/^(Word|-+)$/.test(p.word));
const out = {
  schemaVersion: 2,
  video: sb.video ?? null,
  language: script.match(/^language:\s*(.+)$/m)?.[1]?.trim() ?? null,
  voice: prev.voice ?? { engine: 'edge', name: null, rate: '+0%', pitch: '+0Hz' },
  ...(Object.keys(voices).length ? { voices } : {}),
  narration: prev.narration ?? { groupBy: 'beat' },
  gaps: { line: 0.12, beat: 0.18, lead: 0.15, tail: 0.3, turn: 0.28, ...prev.gaps },
  pronunciations: pron,
  lines,
};
out.status = prev.status === 'approved' && prev.narration && isDeepStrictEqual(prev.lines, lines) && isDeepStrictEqual(prev.pronunciations, pron) && isDeepStrictEqual(prev.voices ?? {}, voices) ? 'approved' : 'draft';
await mkdir(join(dir, 'audio'), { recursive: true });
await writeFile(outPath, JSON.stringify(out, null, 2));
console.log(`Voice script ${outPath}`);
for (const [sp, v] of Object.entries(voices)) console.log(`Voice for ${sp}: ${v.name ?? '(none yet — audition and set voices.' + sp + '.name)'}`);
for (const l of lines) console.log(`${l.id} · beat ${l.beat} · ${l.speaker ? l.speaker.toUpperCase() + ' · ' : ''}${l.shot ?? '(no shot)'}${l.splits ? ` + splits ${l.splits.map((s) => s.shot).join(',')}` : ''} · ${l.text}`);
console.log(`Pronunciations: ${pron.map((p) => p.word).join(', ') || 'none'}`);
