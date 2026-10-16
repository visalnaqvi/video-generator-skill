#!/usr/bin/env node
// Renders a storyboard.json with the studio's Remotion templates.
//
//   node studio/scripts/render.mjs <storyboard.json> --sheet     one small still per scene, tiled → storyboard-sheet.png
//   node studio/scripts/render.mjs <storyboard.json> --frames    one still per scene → frames/NN-id.png (for the PDF deck)
//   node studio/scripts/render.mjs <storyboard.json> --preview   half-res MP4 → render/preview.mp4
//   node studio/scripts/render.mjs <storyboard.json> --final     full-res MP4 → render/final.mp4
//   node studio/scripts/render.mjs <storyboard.json> --cover     full-res still of the first shot → render/cover.png
//   Audio: storyboard.finalAudio (the mix) if set, else storyboard.audio (voice-over).
//   Captions: storyboard.captions { enabled, y, size, skipLines } — built from the word timings.
//   Lip-sync: storyboard.lipsync (default audio/lipsync.json, from studio/scripts/lipsync.mjs) drives talking characters.
//   node studio/scripts/render.mjs <storyboard.json> --styles a,b,c [--scene <id|index>]
//                                                              one scene in several styles → style-options.png
//   options: --out <path>  --scale <n>
//
// storyboard.style names studio/styles/<id>.json; storyboard.styleOverrides tweaks single tokens.
//
// The brand kit (storyboard.brand → studio/brands/<slug>/brand.json), the logo, audio and
// any asset paths in scene props (relative to the storyboard's folder, or `brand:<path>` for
// the brand kit's asset library) are staged into a
// per-video public dir, so templates load them with staticFile().

import { readFile, mkdir, cp, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, basename, extname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { writeFile } from 'node:fs/promises';
import { renderFingerprint } from './lib/fingerprint.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const sbPath = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
const mode = ['--sheet', '--frames', '--preview', '--final', '--cover', '--styles'].find((m) => args.includes(m));
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
if (!sbPath || !mode) {
  console.error('Usage: node studio/scripts/render.mjs <storyboard.json> --sheet|--preview|--final|--styles a,b,c [--scene id] [--out path] [--scale n]');
  process.exit(1);
}

const sbFile = resolve(sbPath);
const sbDir = dirname(sbFile);
const sb = JSON.parse(await readFile(sbFile, 'utf8'));
const MEDIA = /\.(png|jpe?g|webp|gif|svg|avif|mp4|mov|webm|mp3|wav|m4a|aac|ogg)$/i;

// ---------- stage assets ----------
const stage = join(ROOT, 'studio/.stage', basename(sbDir));
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
const exists = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };

// One copy per destination: shots that share an asset stage it in parallel, and two concurrent copies
// to the same file fail on Windows (EBUSY).
const staged = new Map();
async function stageFile(src, sub) {
  const dest = join(stage, sub, basename(src));
  if (!staged.has(dest)) staged.set(dest, mkdir(dirname(dest), { recursive: true }).then(() => cp(src, dest)));
  await staged.get(dest);
  return relative(stage, dest).replace(/\\/g, '/');
}
async function stageProps(v) {
  if (typeof v === 'string' && v.startsWith('lib:')) {
    // shared studio library (studio/library/<path>): characters, scene art, …
    const rel = v.slice(4);
    const p = join(ROOT, 'studio/library', rel);
    if (await exists(p)) return stageFile(p, join('library', dirname(rel)));
    console.warn(`! library asset not found: ${v}`);
    return v;
  }
  if (typeof v === 'string' && v.startsWith('brand:')) {
    if (!sb.brand) { console.warn(`! ${v}: storyboard has no brand`); return v; }
    const p = join(ROOT, 'studio/brands', sb.brand, 'assets', v.slice(6));
    if (await exists(p)) return stageFile(p, 'brand-assets');
    console.warn(`! brand asset not found: ${v}`);
    return v;
  }
  if (typeof v === 'string' && MEDIA.test(v) && !/^https?:/.test(v)) {
    const p = resolve(sbDir, v);
    if (await exists(p)) return stageFile(p, 'assets');
    console.warn(`! asset not found: ${v}`);
    return v;
  }
  if (Array.isArray(v)) return Promise.all(v.map(stageProps));
  if (v && typeof v === 'object') return Object.fromEntries(await Promise.all(Object.entries(v).map(async ([k, x]) => [k, await stageProps(x)])));
  return v;
}

let brand;
if (sb.brand) {
  const brandDir = join(ROOT, 'studio/brands', sb.brand);
  brand = JSON.parse(await readFile(join(brandDir, 'brand.json'), 'utf8'));
  if (brand.status !== 'approved') console.warn(`! brand kit "${sb.brand}" is ${brand.status}, not approved`);
  if (brand.logo?.primary) brand.logo.src = await stageFile(join(brandDir, brand.logo.primary), 'brand');
} else if (sb.universe) {
  // a universe used without a client brand brings its own palette + fonts
  brand = JSON.parse(await readFile(join(ROOT, 'studio/library/universes', sb.universe, 'brand.json'), 'utf8'));
} else console.warn('! storyboard has no "brand" — using the fallback palette');

const loadStyle = async (id) => JSON.parse(await readFile(join(ROOT, 'studio/styles', `${id}.json`), 'utf8'));
const style = sb.style ? { ...(await loadStyle(sb.style)), ...(sb.styleOverrides ?? {}) } : undefined;
if (!sb.style && mode !== '--styles') console.warn('! storyboard has no "style" — using default tokens');

// `{ "type": "component", "use": "<universe>/<name>", "props": {…} }` layers expand into universe components.
const { expandScene } = await import(pathToFileURL(join(ROOT, 'studio/scripts/lib/components.mjs')).href);
const scenes = await Promise.all(sb.scenes.map(async (s) => ({ ...s, props: await stageProps(await expandScene(s.props ?? {}, sb.format ?? '9:16')) })));
const audioRel = sb.finalAudio ?? sb.audio;
const audio = audioRel ? await stageProps(audioRel) : undefined;

// Captions from the voice-over's word timings: short phrases (≤ 4 words, split on pauses).
let captions;
if (sb.captions?.enabled && sb.timing?.fittedTo) {
  const tm = JSON.parse(await readFile(join(sbDir, sb.timing.fittedTo), 'utf8'));
  const skip = new Set(sb.captions.skipLines ?? []);
  const clean = (w) => (/^([A-Za-z]\.){2,}$/.test(w) ? w.replace(/\./g, '') : w).replace(/[.,;:!]+$/, '');
  const phrases = [];
  for (const line of tm.lines) {
    if (skip.has(line.id)) continue;
    // Split at pauses first, then into balanced chunks of ≤ 4 words (no one-word orphans).
    const runs = [[]];
    for (const w of line.words) {
      const prev = runs.at(-1).at(-1);
      if (prev && w.start - prev.end > 0.35) runs.push([]);
      runs.at(-1).push({ text: clean(w.text), start: w.start, end: w.end });
    }
    for (const run of runs.filter((r) => r.length)) {
      const n = Math.ceil(run.length / 4), size = Math.ceil(run.length / n);
      for (let k = 0; k < run.length; k += size) { const ws = run.slice(k, k + size); phrases.push({ start: ws[0].start, end: ws.at(-1).end, words: ws, ...(line.speaker ? { speaker: line.speaker } : {}) }); }
    }
  }
  captions = { phrases, y: sb.captions.y, size: sb.captions.size };
}
if (mode === '--frames' || mode === '--styles') captions = undefined; // deck/style stills show the design, not captions
// Lip-sync track for talking characters (studio/scripts/lipsync.mjs): storyboard.lipsync, else audio/lipsync.json.
let lipsync;
const lipPath = sb.lipsync ? resolve(sbDir, sb.lipsync) : join(sbDir, 'audio/lipsync.json');
if (await exists(lipPath)) {
  const { fps: lfps, frames, mouth, open, lines } = JSON.parse(await readFile(lipPath, 'utf8'));
  if (lfps !== (sb.fps ?? 30)) console.warn(`! lip-sync track is ${lfps} fps, video is ${sb.fps ?? 30} — re-run lipsync.mjs --fps ${sb.fps ?? 30}`);
  lipsync = { fps: lfps, frames, mouth, open, lines };
} else if (sb.lipsync) console.warn(`! lip-sync track not found: ${sb.lipsync}`);
const inputProps = { brand, style, format: sb.format ?? '9:16', fps: sb.fps ?? 30, scenes, audio, audioVolume: sb.audioVolume, captions, lipsync };


// Tile stills into one labelled sheet.
async function tileSheet(tiles, tw, th, cols, outPath) {
  const labelH = 34, gap = 12;
  const rows = Math.ceil(tiles.length / cols);
  const W = cols * tw + (cols + 1) * gap, H = rows * (th + labelH) + (rows + 1) * gap;
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const comps = [];
  tiles.forEach((tile, i) => {
    const x = gap + (i % cols) * (tw + gap), y = gap + Math.floor(i / cols) * (th + labelH + gap);
    comps.push({ input: tile.file, left: x, top: y });
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${labelH}"><text x="2" y="23" font-family="Segoe UI, Arial" font-size="17" fill="#222">${esc(tile.label)}</text></svg>`), left: x, top: y + th });
  });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#f2f2f2' } }).composite(comps).png().toFile(outPath);
}

// ---------- bundle + compose ----------
process.stdout.write('Bundling… ');
const serveUrl = await bundle({ entryPoint: join(ROOT, 'studio/remotion/src/index.ts'), publicDir: stage });
console.log('done');
const browser = await openBrowser('chrome');
const composition = await selectComposition({ serveUrl, id: 'Video', inputProps, puppeteerInstance: browser });
const fps = composition.fps;

try {
  if (mode === '--styles') {
    const ids = (opt('--styles') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    const key = opt('--scene') ?? '0';
    const scene = scenes.find((s) => s.id === key) ?? scenes[Number(key)] ?? scenes[0];
    const scale = Number(opt('--scale') ?? 0.3);
    const tiles = [];
    for (const [i, id] of ids.entries()) {
      const props = { ...inputProps, style: { ...(await loadStyle(id)), ...(sb.styleOverrides ?? {}) }, scenes: [{ ...scene, transition: undefined }] };
      const comp = await selectComposition({ serveUrl, id: 'Video', inputProps: props, puppeteerInstance: browser });
      const out = join(stage, `_style_${i}.png`);
      await renderStill({ composition: comp, serveUrl, inputProps: props, frame: Math.min(comp.durationInFrames - 1, scene.sheetFrame ?? Math.round(scene.durationInFrames * 0.7)), output: out, scale, puppeteerInstance: browser });
      tiles.push({ file: out, label: `${String.fromCharCode(65 + i)} · ${id}` });
      process.stdout.write(`
Styles ${i + 1}/${ids.length}`);
    }
    console.log();
    const outPath = resolve(opt('--out') ?? join(sbDir, 'style-options.png'));
    await tileSheet(tiles, Math.round(composition.width * scale), Math.round(composition.height * scale), Math.min(ids.length, composition.width >= composition.height ? 2 : 4), outPath);
    console.log(`Styles ${outPath}  (scene "${scene.id ?? scene.template}" in ${ids.join(', ')})`);
  } else if (mode === '--cover') {
    const s0 = scenes[0];
    const outPath = resolve(opt('--out') ?? join(sbDir, 'render', 'cover.png'));
    await mkdir(dirname(outPath), { recursive: true });
    const coverProps = { ...inputProps, captions: undefined };
    await renderStill({ composition, serveUrl, inputProps: coverProps, frame: Math.min(composition.durationInFrames - 1, s0.sheetFrame ?? Math.round(s0.durationInFrames * 0.7)), output: outPath, scale: Number(opt('--scale') ?? 1), puppeteerInstance: browser });
    console.log(`Cover ${outPath}`);
  } else if (mode === '--sheet' || mode === '--frames') {
    // scene start frames (mirror of sceneStarts() in Video.tsx)
    const starts = [];
    let t = 0;
    scenes.forEach((s, i) => {
      starts.push(t);
      const last = i === scenes.length - 1;
      t += s.durationInFrames - (last || !s.transition || s.transition.type === 'none' ? 0 : s.transition.durationInFrames ?? 10);
    });
    const scale = Number(opt('--scale') ?? (mode === '--frames' ? 0.5 : 0.25));
    const tiles = [];
    for (const [i, s] of scenes.entries()) {
      const frame = Math.min(composition.durationInFrames - 1, starts[i] + (s.sheetFrame ?? Math.round(s.durationInFrames * 0.7)));
      const out = join(stage, `_sheet_${i}.png`);
      await renderStill({ composition, serveUrl, inputProps, frame, output: out, scale, puppeteerInstance: browser });
      tiles.push({ file: out, label: `${i + 1} · ${s.id ?? s.template} · ${(starts[i] / fps).toFixed(1)}s +${(s.durationInFrames / fps).toFixed(1)}s` });
      process.stdout.write(`\rStills ${i + 1}/${scenes.length}`);
    }
    console.log();
    if (mode === '--frames') {
      const dir = resolve(opt('--out') ?? join(sbDir, 'frames'));
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      for (const [i, s] of scenes.entries()) await cp(tiles[i].file, join(dir, `${String(i + 1).padStart(2, '0')}-${s.id ?? s.template}.png`));
      console.log(`Frames ${dir}  (${scenes.length} stills at scale ${scale})`);
    } else {
    const tw = Math.round(composition.width * scale), th = Math.round(composition.height * scale);
    const outPath = resolve(opt('--out') ?? join(sbDir, 'storyboard-sheet.png'));
    await tileSheet(tiles, tw, th, Math.min(tiles.length, composition.width >= composition.height ? 3 : 4), outPath);
    console.log(`Sheet ${outPath}  (${scenes.length} scenes, ${(composition.durationInFrames / fps).toFixed(1)}s total)`);
    }
  } else {
    const final = mode === '--final';
    const outPath = resolve(opt('--out') ?? join(sbDir, 'render', final ? 'final.mp4' : 'preview.mp4'));
    await mkdir(dirname(outPath), { recursive: true });
    let last = -1;
    await renderMedia({
      composition, serveUrl, inputProps, codec: 'h264', outputLocation: outPath, puppeteerInstance: browser,
      scale: Number(opt('--scale') ?? (final ? 1 : 0.5)), crf: final ? 18 : 28,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`\rRendering ${p * 10}%`); } },
    });
    if (final) await writeFile(join(dirname(outPath), 'final.json'), JSON.stringify({ rendered: new Date().toISOString(), fingerprint: await renderFingerprint(sb, sbDir) }, null, 1));
    console.log(`\nVideo ${outPath}  (${(composition.durationInFrames / fps).toFixed(1)}s, ${composition.width}x${composition.height} @ scale ${opt('--scale') ?? (final ? 1 : 0.5)})`);
  }
} finally {
  await browser.close({ silent: true });
  await rm(stage, { recursive: true, force: true });
}
