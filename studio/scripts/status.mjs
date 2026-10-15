#!/usr/bin/env node
// Where is a video in the pipeline? Reads the video's files (no state of its own), reports each
// stage as done / awaiting approval / stale / not started, names the next action, and writes a
// readable videos/<video>/status.md. Without a folder, lists every video's current stage.
//
// Usage: node studio/scripts/status.mjs [videos/<video>]

import { readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderFingerprint } from './lib/fingerprint.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const target = process.argv[2];
const st = async (p) => { try { return await stat(p); } catch { return null; } };
const text = async (p) => (await readFile(p, 'utf8').catch(() => null))?.replace(/\r/g, '') ?? null;
const json = async (p) => { const t = await text(p); try { return t ? JSON.parse(t) : null; } catch { return null; } };
const fm = (t, k) => t?.match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim().replace(/^"|"$/g, '') ?? null;

async function status(dir) {
  const f = (p) => join(dir, p);
  const brief = await text(f('brief.md'));
  const brandSlug = fm(brief, 'brand');
  const brand = brandSlug ? await json(join(ROOT, 'studio/brands', brandSlug, 'brand.json')) : null;
  const assets = brandSlug ? await st(join(ROOT, 'studio/brands', brandSlug, 'assets.json')) : null;
  const script = await text(f('script.md'));
  const sb = await json(f('storyboard.json'));
  const concept = await text(f('concept/concept.md'));
  const vs = await json(f('audio/voice-script.json'));
  const qc = await json(f('render/qc.json'));
  const mt = async (p) => (await st(f(p)))?.mtimeMs ?? 0;

  const S = [];
  const add = (stage, state, detail, next) => S.push({ stage, state, detail, next });

  // 1 brand kit (a universe video without a client brand uses the universe's palette)
  const universe = fm(brief, 'universe');
  const uni = universe ? await json(join(ROOT, 'studio/library/universes', universe, 'universe.json')) : null;
  if (universe && !brandSlug) add('brand-kit', uni ? 'done' : 'not started', uni ? `universe ${uni.name} · characters: ${fm(brief, 'characters') ?? '—'}` : `no universe "${universe}" in studio/library/universes`, uni ? null : `Create universe ${universe} (universe skill) or fix brief`);
  else if (!brandSlug) add('brand-kit', brief ? 'skipped' : 'not started', brief ? 'brief names no brand (default palette)' : '', brief ? null : 'Run write (brief) first');
  else if (!brand) add('brand-kit', 'not started', `no kit for "${brandSlug}"`, `Run brand-kit for ${brandSlug}`);
  else add('brand-kit', brand.status === 'approved' ? (assets ? 'done' : 'partial') : 'awaiting approval', `${brand.name} v${brand.version ?? 1}${assets ? ' + asset library' : ' — no asset library'}`, brand.status !== 'approved' ? 'Approve the brand kit' : assets ? null : 'Run the brand-kit asset step (richer storyboards)');

  // 2 write
  const w = ['brief', 'hook', 'story', 'script'].map((k) => [k, fm(k === 'brief' ? brief : null, 'status')]);
  for (const k of ['hook', 'story', 'script']) w.find((x) => x[0] === k)[1] = fm(await text(f(`${k}.md`)), 'status');
  const firstOpen = w.find(([, s]) => s !== 'approved');
  add('write', !brief ? 'not started' : firstOpen ? (firstOpen[1] === 'stale' ? 'stale' : 'awaiting approval') : 'done', w.map(([k, s]) => `${k}: ${s ?? '—'}`).join(' · '), firstOpen ? `Write/approve ${firstOpen[0]}` : null);

  // 3 storyboard
  if (!sb) add('storyboard', 'not started', concept ? `concept: ${fm(concept, 'chosen') ?? 'draft'}` : '', script && fm(script, 'status') === 'approved' ? 'Run storyboard (concepts → style frames → shots)' : null);
  else {
    const staleBoard = sb.status === 'stale' || (await mt('script.md')) > (await mt('storyboard.json')) + 1000 && !sb.timing;
    const deck = await st(f('storyboard-deck.pdf'));
    // universe boards: the coverage/staging check (board-check.mjs) must pass before approval
    let check = '', checkNext = null;
    if (sb.universe && sb.status !== 'approved') {
      const rep = await json(f('storyboard-check.json'));
      const fresh = rep && (await mt('storyboard-check.json')) >= (await mt('storyboard.json'));
      if (!fresh) { check = ' · check not run'; checkNext = `Run node studio/scripts/board-check.mjs ${dir.replace(/\\/g, '/')}`; }
      else { check = rep.ok ? ` · check ✓ (${rep.warnings.length} warnings)` : ` · check ✗ ${rep.errors.length} errors`; if (!rep.ok) checkNext = 'Fix the board-check errors (storyboard-check.json), re-run the check'; }
    }
    add('storyboard', staleBoard ? 'stale' : sb.status === 'approved' ? 'done' : 'awaiting approval', `${sb.concept?.title ?? sb.style ?? ''} · ${sb.scenes?.length ?? 0} shots · v${sb.version ?? 1}${deck ? ' · deck' : ''}${check}`, staleBoard ? 'Script changed — update affected shots' : checkNext ?? (sb.status !== 'approved' ? 'Review contact sheet + deck, approve storyboard' : null));
  }

  // 4 voiceover
  if (!vs) add('voiceover', 'not started', '', sb?.status === 'approved' ? 'Run voiceover (audition → voice-over → fit → preview)' : null);
  else {
    const fitted = !!sb?.timing;
    const scriptNewer = (await mt('script.md')) > (await mt('audio/voiceover.mp3')) + 1000;
    const state = scriptNewer ? 'stale' : vs.status === 'approved' && fitted ? 'done' : 'awaiting approval';
    add('voiceover', state, `${vs.voice?.name ?? 'no voice'} ${vs.voice?.rate ?? ''}${fitted ? ` · fitted (${sb.timing.voDuration}s)` : ' · not fitted'}`, scriptNewer ? 'Script changed — regenerate changed lines, re-fit' : state === 'done' ? null : fitted ? 'Review preview, approve voice' : 'Fit storyboard to the voice');
  }

  // 5 render
  const final = await st(f('render/final.mp4'));
  if (!final) add('render', 'not started', sb?.finalAudio ? 'mix ready' : '', vs?.status === 'approved' ? 'Run render (music → SFX → captions → mix → final → QC)' : null);
  else {
    const passed = qc?.checks?.every((c) => c.status !== 'FAIL');
    const rec = await json(f('render/final.json'));
    const outdated = rec ? rec.fingerprint !== (await renderFingerprint(sb, dir)) : (await mt('audio/mix.wav')) > final.mtimeMs + 1000;
    const isFinal = sb?.render?.status === 'final';
    add('render', outdated ? 'stale' : isFinal ? 'done' : 'awaiting approval', `final.mp4 ${(final.size / 1048576).toFixed(1)} MB · QC ${qc ? (passed ? 'passed' : 'FAILED') : 'not run'}${isFinal ? ' · FINAL' : ''}`, outdated ? 'Storyboard/mix changed — re-render + QC' : isFinal ? null : 'Watch final, approve');
  }

  const next = S.find((s) => s.next)?.next ?? 'Done — video is final';
  return { video: dir.split(/[\\/]/).pop(), stages: S, next };
}

const ICON = { done: '✅', 'awaiting approval': '⏳', stale: '⚠️', partial: '◐', skipped: '–', 'not started': '○' };
if (target) {
  const dir = resolve(target);
  const r = await status(dir);
  const md = `# Status — ${r.video}\n\n_Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} by studio/scripts/status.mjs — don't edit._\n\n| Stage | State | Detail |\n|-------|-------|--------|\n${r.stages.map((s) => `| ${s.stage} | ${ICON[s.state] ?? ''} ${s.state} | ${s.detail} |`).join('\n')}\n\n**Next:** ${r.next}\n`;
  await writeFile(join(dir, 'status.md'), md);
  for (const s of r.stages) console.log(`${(ICON[s.state] ?? ' ').padEnd(2)} ${s.stage.padEnd(11)} ${s.state.padEnd(18)} ${s.detail}`);
  console.log(`Next: ${r.next}`);
} else {
  const vids = (await readdir(join(ROOT, 'videos'), { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
  if (!vids.length) console.log('No videos yet.');
  for (const v of vids) { const r = await status(join(ROOT, 'videos', v.name)); console.log(`${v.name.padEnd(36)} → ${r.next}`); }
}
