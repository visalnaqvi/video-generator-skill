#!/usr/bin/env node
// Reads an approved script.md and prints each beat's VO, on-screen text, word count and
// estimated duration (frames), so the storyboard can be planned without counting by hand.
//
// Usage: node .claude/skills/storyboard/scripts/beats.mjs <script.md> [--fps 30] [--pad 0.4]
//   --pad: seconds of breathing room added per beat (default 0.4)

import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : d; };
if (!file) { console.error('Usage: node beats.mjs <script.md> [--fps 30] [--pad 0.4]'); process.exit(1); }
const fps = opt('--fps', 30);
const pad = opt('--pad', 0.4);

const text = (await readFile(file, 'utf8')).replace(/\r/g, '');
const fm = Object.fromEntries([...(text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '').matchAll(/^(\w+):\s*"?([^"\n]*)"?$/gm)].map((m) => [m[1], m[2]]));
const wps = Number(fm.wps) || 2.5;
if (fm.status !== 'approved') console.warn(`! script status is "${fm.status}", not approved`);

const beats = [];
const re = /^## Beat (\d+)\s*[—-]\s*(.+?)(?:\s*\((\d+:\d+)\s*[–-]\s*(\d+:\d+)\))?\s*$/gm;
const heads = [...text.matchAll(re)];
heads.forEach((h, i) => {
  const body = text.slice(h.index + h[0].length, i + 1 < heads.length ? heads[i + 1].index : text.search(/^## (Pronunciations|Sources)/m) > h.index ? text.search(/^## (Pronunciations|Sources)/m) : undefined);
  // `VO (Nox): …` is that character's dialogue; `vo` keeps every spoken line in order
  const voLines = [...body.matchAll(/^VO(?:\s*\(([^)]+)\))?:\s*(.+)$/gm)].map((m) => ({ speaker: m[1]?.trim().toLowerCase() || null, text: m[2].trim() }));
  const vo = voLines.map((l) => l.text);
  const dialogue = voLines.filter((l) => l.speaker && l.speaker !== 'narrator');
  const onScreen = [...body.matchAll(/^ON-SCREEN:\s*(.+)$/gm)].flatMap((m) => m[1].split('|').map((s) => s.trim().replace(/^"|"$/g, ''))).filter((s) => s && s.toLowerCase() !== 'none');
  const delivery = (body.match(/^DELIVERY:\s*(.+)$/m) || [])[1]?.trim();
  const silence = vo.reduce((s, l) => s + Number((l.match(/\[SILENCE\s*([\d.]+)s\]/i) || [])[1] || 0), 0);
  const spoken = vo.map((l) => l.replace(/\[SILENCE[^\]]*\]/gi, '')).join(' ');
  const words = spoken.split(/[\s\-–]+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const seconds = words / wps + silence + pad;
  beats.push({ beat: Number(h[1]), name: h[2].trim(), scriptTime: h[3] ? `${h[3]}–${h[4]}` : null, words, seconds: +seconds.toFixed(2), frames: Math.round(seconds * fps), vo, ...(dialogue.length ? { dialogue } : {}), onScreen, delivery });
});

const total = beats.reduce((s, b) => s + b.seconds, 0);
console.log(JSON.stringify({ title: fm.title, type: fm.type, format: fm.format, language: fm.language, wps, fps, target_s: Number(fm.target_length_s) || null, estimated_s: +total.toFixed(1), beats }, null, 2));
