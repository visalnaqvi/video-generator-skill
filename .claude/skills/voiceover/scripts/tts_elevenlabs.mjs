#!/usr/bin/env node
// PAID voice (ElevenLabs). Never runs without --approved, which the skill may pass only after
// the user explicitly approves the paid generation in chat (or explicitly asks for ElevenLabs).
//
//   --estimate     count characters / credits only (free, no API call)
//   --approved     actually generate (costs credits)
//
// Usage: node .claude/skills/voiceover/scripts/tts_elevenlabs.mjs <voice-script.json> --voice-id <id>
//          [--model eleven_multilingual_v2] [--out <dir>] [--only L01] (--estimate | --approved)
// Needs ELEVENLABS_API_KEY in the studio's .env (the user adds it; never typed by Claude).
// Output matches tts_edge.py: passage clips, word timings and original line segments.
// Dialogue lines (with a speaker) use voices.<speaker>.elevenId; --voice-id is the narrator.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPassages, alignPassage, spokenText } from './passages.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const vsPath = args.find((a) => a.endsWith('.json'));
const voiceId = opt('--voice-id');
const model = opt('--model', 'eleven_multilingual_v2');
const only = opt('--only') ? new Set(opt('--only').split(',')) : null;
if (!vsPath || (!args.includes('--estimate') && !voiceId)) {
  console.error('Usage: node tts_elevenlabs.mjs <voice-script.json> --voice-id <id> (--estimate | --approved)');
  process.exit(1);
}
const vs = JSON.parse(await readFile(vsPath, 'utf8'));
const passages = buildPassages(vs, only);
const chars = passages.reduce((s, p) => s + p.lines.map((l) => spokenText(l)).join(' ').length, 0);

if (!args.includes('--approved')) {
  console.log(`ElevenLabs estimate: ${passages.length} passages (${passages.reduce((n, p) => n + p.lines.length, 0)} lines), ${chars} characters ≈ ${chars} credits on ${model} (fewer on turbo/flash models).`);
  console.log('Nothing generated. Re-run with --approved only after the user approves this cost.');
  process.exit(0);
}

const env = await readFile(join(ROOT, '.env'), 'utf8').catch(() => '');
const key = process.env.ELEVENLABS_API_KEY ?? env.match(/^ELEVENLABS_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, '');
if (!key) { console.error('No ELEVENLABS_API_KEY in .env — ask the user to add it.'); process.exit(1); }
const out = resolve(opt('--out', join(dirname(vsPath), 'clips', `eleven-${voiceId}`)));
await mkdir(out, { recursive: true });

let failures = 0;
for (const passage of passages) {
  const text = passage.lines.map((l) => spokenText(l)).join(' ');
  // dialogue passages use the speaker's own ElevenLabs voice (voices.<speaker>.elevenId)
  const speaker = passage.lines[0].speaker;
  const vid = speaker ? vs.voices?.[speaker]?.elevenId : voiceId;
  if (!vid) { failures++; console.error(`${passage.id} · FAILED: no ElevenLabs voice for speaker "${speaker}" (set voices.${speaker}.elevenId)`); continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: model, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true } }),
  });
  if (!res.ok) { failures++; console.error(`${passage.id} · FAILED ${res.status}: ${(await res.text()).slice(0, 200)}`); continue; }
  const j = await res.json();
  // Character alignment → words.
  const al = j.alignment ?? j.normalized_alignment;
  const words = [];
  let cur = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
    if (!cur) cur = { text: '', start: al.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = al.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  try {
    const segments = alignPassage(passage, words);
    await writeFile(join(out, `${passage.id}.mp3`), Buffer.from(j.audio_base64, 'base64'));
    await writeFile(join(out, `${passage.id}.json`), JSON.stringify({ text, voice: vid, engine: 'elevenlabs', model, words, segments }, null, 1));
    console.log(`${passage.id} · ${words.length} words · ${passage.lines.length} lines`);
  } catch (error) {
    failures++;
    console.error(`${passage.id} · FAILED: ${error.message}`);
  }
}
console.log(`Clips ${out}`);
if (failures) process.exitCode = 1;
