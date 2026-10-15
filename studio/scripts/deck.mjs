#!/usr/bin/env node
// Builds a client-ready storyboard deck (PDF, A4 landscape) for a video:
// cover → concept → style frames → shot-by-shot panels → approval page.
//
// Usage: node studio/scripts/deck.mjs <video-folder> [--no-render]
// Reads:  storyboard.json (scenes + concept), concept/style-frames.json (optional),
//         script.md (title), the brand kit named in storyboard.brand.
// Writes: <video>/storyboard-deck.pdf  (+ <video>/deck/ with index.html and frames)
// --no-render reuses frames already in deck/ (after text-only edits).

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const videoDir = resolve(args.find((a) => !a.startsWith('--')) ?? '');
if (!args.length) { console.error('Usage: node studio/scripts/deck.mjs <video-folder> [--no-render]'); process.exit(1); }
const reuse = args.includes('--no-render');
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };

const sbPath = join(videoDir, 'storyboard.json');
const sb = JSON.parse(await readFile(sbPath, 'utf8'));
// client brand kit, else the universe's palette (universe videos without a client brand)
const brandDir = sb.brand ? join(ROOT, 'studio/brands', sb.brand) : sb.universe ? join(ROOT, 'studio/library/universes', sb.universe) : null;
const brand = brandDir ? JSON.parse(await readFile(join(brandDir, 'brand.json'), 'utf8')) : null;
const script = (await readFile(join(videoDir, 'script.md'), 'utf8').catch(() => '')).replace(/\r/g, '');
const title = (script.match(/^title:\s*(.+)$/m)?.[1] ?? sb.video ?? 'Storyboard').replace(/^"|"$/g, '');
const deckDir = join(videoDir, 'deck');
await mkdir(deckDir, { recursive: true });

// ---------- frames ----------
const render = (sbFile, out) => execFileSync(process.execPath, [join(ROOT, 'studio/scripts/render.mjs'), sbFile, '--frames', '--scale', '0.5', '--out', out], { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim().split('\n').pop();
const styleFile = join(videoDir, 'concept', 'style-frames.json');
const hasStyle = await exists(styleFile);
if (!reuse) {
  console.log(render(sbPath, join(deckDir, 'frames')));
  if (hasStyle) console.log(render(styleFile, join(deckDir, 'style-frames')));
}
const styleSb = hasStyle ? JSON.parse(await readFile(styleFile, 'utf8')) : null;

// ---------- data ----------
const fps = sb.fps ?? 30;
const starts = [];
let t = 0;
sb.scenes.forEach((s, i) => {
  starts.push(t);
  const last = i === sb.scenes.length - 1;
  t += s.durationInFrames - (last || !s.transition || s.transition.type === 'none' ? 0 : s.transition.durationInFrames ?? 10);
});
const total = t / fps;
const sec = (f) => (f / fps).toFixed(1);
const C = brand?.colors ?? {};
const col = (r, d) => C[r]?.hex ?? d;
const primary = col('primary', '#3b57a4'), dark = col('secondary', '#101828'), accent = col('accent', '#ff9635'), ink = col('ink', '#1f2937'), muted = col('muted', '#6b7280'), surface = col('surface', '#f3f4f6');
const onAccent = brand?.computed?.on?.accent ?? ink;
const headFont = brand?.fonts?.heading?.family ?? 'Montserrat';
const bodyFont = brand?.fonts?.body?.family ?? headFont;
const logo = brand?.logo?.primary ? pathToFileURL(join(brandDir, brand.logo.primary)).href : null;
const esc = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const lines = (x) => (Array.isArray(x) ? x : x ? [x] : []).map(esc).join('<br>');
const wide = sb.format === '16:9';
const perPage = wide ? 2 : 3;
const concept = sb.concept ?? {};
const today = new Date().toISOString().slice(0, 10);
const frameUrl = (dir, i, s) => `${dir}/${String(i + 1).padStart(2, '0')}-${s.id ?? s.template}.png`;
const transitionLabel = (tr) => (!tr || tr.type === 'none' ? 'Cut' : `${tr.type}${tr.direction ? ` ${tr.direction}` : ''} · ${sec(tr.durationInFrames ?? 10)}s`);

// ---------- pages ----------
const pages = [];
pages.push(`
<section class="page cover">
  <div class="cover-left">
    ${logo ? `<div class="logo-badge"><img src="${logo}"></div>` : ''}
    <div class="kicker">Storyboard · v${esc(sb.version ?? 1)}${sb.status === 'approved' ? ' · Approved' : ' · For review'}</div>
    <h1>${esc(title)}</h1>
    <div class="meta">${esc(brand?.name ?? '')}</div>
    <div class="chips"><span>${esc(sb.format ?? '9:16')}</span><span>${total.toFixed(0)} s</span><span>${sb.scenes.length} shots</span><span>${esc(concept.title ?? sb.style ?? '')}</span></div>
  </div>
  <div class="cover-right">${hasStyle ? `<img src="style-frames/01-${esc(styleSb.scenes[0].id ?? 'Composed')}.png">` : `<img src="${frameUrl('frames', 0, sb.scenes[0])}">`}</div>
  <div class="date">${today}</div>
</section>`);

if (concept.bigIdea || concept.title) {
  const swatch = (r) => (C[r] ? `<div class="sw"><i style="background:${C[r].hex}"></i><b>${esc(C[r].name ?? r)}</b><small>${C[r].hex.toUpperCase()}</small></div>` : '');
  pages.push(`
<section class="page concept">
  <div class="kicker">The concept</div>
  <h2>${esc(concept.title ?? '')}</h2>
  <p class="big">${esc(concept.bigIdea ?? '')}</p>
  <div class="grid3">
    <div><h4>Visual motif</h4><p>${esc(concept.motif ?? '')}</p></div>
    <div><h4>Look &amp; feel</h4><p>${esc(concept.look ?? '')}</p></div>
    <div><h4>Motion language</h4><p>${esc(concept.motion ?? '')}</p></div>
    <div><h4>Story arc</h4><p>${esc(concept.arc ?? '')}</p></div>
    <div><h4>Sound</h4><p>${esc(concept.sound ?? sb.music?.mood ?? '')}</p></div>
    <div><h4>Typography</h4><p class="type" style="font-family:'${headFont}'">${esc(headFont)}</p><p>${esc(concept.typography ?? `Headlines in ${headFont}; body in ${bodyFont}.`)}</p></div>
  </div>
  <div class="swatches">${['secondary', 'primary', 'accent', 'highlight', 'background', 'ink'].map(swatch).join('')}</div>
</section>`);
}

if (hasStyle) {
  pages.push(`
<section class="page frames">
  <div class="kicker">Style frames</div>
  <h2>How it looks</h2>
  <div class="sf">${styleSb.scenes.map((s, i) => `<figure><img src="${frameUrl('style-frames', i, s)}"><figcaption>${esc(s.caption ?? s.id ?? '')}</figcaption></figure>`).join('')}</div>
</section>`);
}

for (let p = 0; p < sb.scenes.length; p += perPage) {
  const shots = sb.scenes.slice(p, p + perPage).map((s, k) => {
    const i = p + k;
    const end = starts[i] + s.durationInFrames - (s.transition && s.transition.type !== 'none' && i < sb.scenes.length - 1 ? s.transition.durationInFrames ?? 10 : 0);
    return `
    <article class="shot">
      <img src="${frameUrl('frames', i, s)}">
      <div class="info">
        <div class="num"><b>${String(i + 1).padStart(2, '0')}</b><span>${sec(starts[i])}–${sec(end)} s · Beat ${esc(s.beat ?? '')}</span></div>
        ${s.vo ? `<h5>Voice-over</h5><p class="vo">${lines(s.vo)}</p>` : ''}
        ${s.onScreen ? `<h5>On screen</h5><p>${lines(s.onScreen)}</p>` : ''}
        ${s.visual ? `<h5>Visual</h5><p>${esc(s.visual)}</p>` : ''}
        ${s.motion ? `<h5>Motion</h5><p>${esc(s.motion)}</p>` : ''}
        <h5>Transition · Sound</h5><p>${esc(transitionLabel(s.transition))}${s.sfx?.length ? ` · ${esc(s.sfx.map((x) => x.cue).join(', '))}` : ''}</p>
      </div>
    </article>`;
  }).join('');
  pages.push(`<section class="page shots"><div class="kicker">Shot by shot · ${Math.floor(p / perPage) + 1}/${Math.ceil(sb.scenes.length / perPage)}</div><div class="row">${shots}</div></section>`);
}

pages.push(`
<section class="page approve">
  <div class="kicker">Next steps</div>
  <h2>Approval</h2>
  <table>${sb.scenes.map((s, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td><td>${esc(s.id ?? s.template)}</td><td>${sec(starts[i])} s</td><td>${esc((Array.isArray(s.onScreen) ? s.onScreen.join(' · ') : s.onScreen) ?? '')}</td></tr>`).join('')}</table>
  <div class="sign">
    <div><span>Approved by</span><i></i></div><div><span>Date</span><i></i></div><div><span>Notes</span><i></i></div>
  </div>
  <p class="foot">After approval: voice-over recording → timing lock → music &amp; sound design → final render (${esc(sb.format ?? '9:16')}, ${total.toFixed(0)} s).</p>
</section>`);

// ---------- html ----------
const fontQ = [...new Set([headFont, bodyFont])].map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;700;800;900`).join('&');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontQ}&display=block">
<style>
@page { size: 297mm 210mm; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: '${bodyFont}', sans-serif; color: ${ink}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 297mm; height: 210mm; padding: 16mm 18mm; position: relative; overflow: hidden; page-break-after: always; background: #fff; }
h1, h2, h4, h5, .num b { font-family: '${headFont}', sans-serif; }
.kicker { font-size: 9pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${primary}; margin-bottom: 4mm; }
h2 { font-size: 26pt; font-weight: 800; color: ${dark}; margin-bottom: 6mm; }
.cover { background: ${dark}; color: #fff; display: flex; gap: 14mm; }
.cover-left { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.cover .kicker { color: ${accent}; }
.cover h1 { font-size: 34pt; line-height: 1.08; font-weight: 900; margin: 2mm 0 6mm; }
.cover .meta { font-size: 13pt; opacity: .8; }
.chips { display: flex; gap: 3mm; margin-top: 10mm; flex-wrap: wrap; }
.chips span { border: 1px solid rgba(255,255,255,.35); border-radius: 99px; padding: 2mm 5mm; font-size: 9pt; }
.logo-badge { width: 28mm; height: 28mm; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 10mm; }
.logo-badge img { width: 20mm; height: 20mm; object-fit: contain; }
.cover-right { width: ${wide ? '150mm' : '100mm'}; display: flex; align-items: center; }
.cover-right img { width: 100%; border-radius: 4mm; box-shadow: 0 10mm 30mm rgba(0,0,0,.5); }
.date { position: absolute; bottom: 10mm; left: 18mm; font-size: 8pt; opacity: .6; }
.concept .big { font-size: 15pt; line-height: 1.45; max-width: 230mm; margin-bottom: 8mm; color: ${ink}; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm 10mm; }
.grid3 h4 { font-size: 10pt; color: ${primary}; margin-bottom: 1.5mm; text-transform: uppercase; letter-spacing: .08em; }
.grid3 p { font-size: 9.5pt; line-height: 1.45; color: ${muted}; }
.grid3 .type { font-size: 18pt; font-weight: 800; color: ${dark}; }
.swatches { position: absolute; bottom: 14mm; left: 18mm; right: 18mm; display: flex; gap: 4mm; }
.sw { flex: 1; font-size: 8pt; }
.sw i { display: block; height: 12mm; border-radius: 2mm; border: 1px solid rgba(0,0,0,.08); margin-bottom: 1.5mm; }
.sw b { display: block; } .sw small { color: ${muted}; }
.sf { display: flex; gap: 8mm; justify-content: center; }
.sf figure { width: ${wide ? '125mm' : '72mm'}; }
.sf img { width: 100%; border-radius: 3mm; box-shadow: 0 4mm 12mm rgba(0,0,0,.18); }
.sf figcaption { font-size: 9pt; color: ${muted}; margin-top: 2mm; text-align: center; }
.shots .row { display: flex; gap: 7mm; height: 170mm; }
.shot { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3mm; background: ${surface}; border-radius: 3mm; padding: 4mm; overflow: hidden; }
.shot img { ${wide ? 'width: 100%; height: auto;' : 'height: 90mm; width: auto;'} border-radius: 2mm; align-self: center; box-shadow: 0 2mm 6mm rgba(0,0,0,.15); }
.info { flex: 1; font-size: 7pt; line-height: 1.3; overflow: hidden; column-count: ${wide ? 3 : 2}; column-gap: 4mm; }
.info .num { column-span: all; }
.info h5:first-of-type { margin-top: 0; }
.num { display: flex; align-items: baseline; gap: 2mm; border-bottom: 2px solid ${accent}; padding-bottom: 1.5mm; margin-bottom: 2mm; }
.num b { font-size: 16pt; color: ${dark}; } .num span { font-size: 7.5pt; color: ${muted}; }
.info h5 { break-after: avoid; font-size: 6.2pt; letter-spacing: .12em; text-transform: uppercase; color: ${primary}; margin: 2.2mm 0 .6mm; }
.info p { color: ${ink}; } .info .vo { font-style: italic; }
.approve table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 8mm; }
.approve td { padding: 1.4mm 2mm; border-bottom: 1px solid #e5e7eb; } .approve td:first-child { font-weight: 700; color: ${primary}; width: 10mm; }
.sign { display: flex; gap: 10mm; } .sign div { flex: 1; } .sign span { font-size: 8pt; color: ${muted}; } .sign i { display: block; border-bottom: 1.5px solid ${ink}; height: 12mm; }
.foot { margin-top: 8mm; font-size: 9pt; color: ${muted}; }
</style></head><body>${pages.join('\n')}</body></html>`;
const htmlPath = join(deckDir, 'index.html');
await writeFile(htmlPath, html);

// ---------- pdf ----------
const chrome = join(ROOT, 'node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe');
const pdfPath = join(videoDir, 'storyboard-deck.pdf');
execFileSync(chrome, ['--headless', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw', '--virtual-time-budget=8000', `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href], { stdio: 'ignore' });
console.log(`Deck ${pdfPath}  (${pages.length} pages)`);
