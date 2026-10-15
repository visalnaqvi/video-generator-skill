#!/usr/bin/env node
// Collects candidate images from a brand's website for its asset library.
// Finds the most relevant pages (about, team, services, products, reviews, gallery…),
// downloads usable images (largest available size), drops icons/duplicates/tiny files,
// guesses a kind from page/alt/context words, and makes one labelled contact sheet.
//
// Usage: node collect-assets.mjs <brandDir> <siteUrl> [--pages url1,url2] [--max-pages 10] [--max-images 60]
// Output: <brandDir>/assets/_candidates/cNN.ext, <brandDir>/source/candidates.json, <brandDir>/source/candidates-sheet.png

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const args = process.argv.slice(2);
const [brandDir, siteUrl] = args.filter((a) => !a.startsWith('--'));
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (!brandDir || !siteUrl) {
  console.error('Usage: node collect-assets.mjs <brandDir> <siteUrl> [--pages a,b] [--max-pages 10] [--max-images 60]');
  process.exit(1);
}
const MAX_PAGES = Number(opt('--max-pages') ?? 10);
const MAX_IMAGES = Number(opt('--max-images') ?? 60);
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36' };
const candDir = join(brandDir, 'assets', '_candidates');
const srcDir = join(brandDir, 'source');
await rm(candDir, { recursive: true, force: true });
await mkdir(candDir, { recursive: true });
await mkdir(srcDir, { recursive: true });

// Words that hint at what an image shows. Order = priority when several match.
const KINDS = [
  ['testimonial', /testimonial|review|feedback|client[- ]?say|what (our|people)|success stor|rank|result|student[- ]?(say|speak)|patient stor|happy (client|customer|student)/i],
  ['people', /team|founder|faculty|faculties|teacher|mentor|staff|doctor|dr\.|chef|expert|trainer|director|ceo|about[- ]?us|our people|leadership|member/i],
  ['offering', /course|product|service|menu|package|plan|pricing|shop|class(es)?\b|program|treatment|book|notes|batch|combo|paper|collection|item/i],
  ['work', /portfolio|gallery|project|case[- ]?stud|before|after|our work|showcase/i],
  ['proof', /award|certif|accredit|partner|press|featured|media|recogni|iso|trusted by/i],
  ['place', /campus|office|clinic|store|branch|location|classroom|studio|venue|interior|building|event/i],
];
const SKIP = /(logo|icon|favicon|sprite|spinner|loading|loader|placeholder|blank|pixel|arrow|bullet|pattern|bg-|background|divider|shape|emoji|flag|payment|visa|mastercard|paypal|whatsapp-icon|social)/i;
const PAGE_HINT = /about|team|faculty|faculties|staff|founder|doctor|testimonial|review|feedback|course|product|service|shop|menu|pricing|portfolio|gallery|work|project|award|clients|program/i;

const get = async (url) => {
  const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r;
};
const abs = (u, base) => { try { return new URL(u.replace(/&amp;/g, '&').trim(), base).href; } catch { return null; } };
const attr = (tag, n) => (tag.match(new RegExp(`\\b${n}\\s*=\\s*(["'])(.*?)\\1`, 'i')) || [])[2] ?? '';
const strip = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

// ---------- pages ----------
const home = await (await get(siteUrl)).text();
const bareHost = (u) => new URL(u).hostname.replace(/^www\./, '');
const siteHost = bareHost(siteUrl);
let pages = [siteUrl];
if (opt('--pages')) pages.push(...opt('--pages').split(',').map((u) => abs(u, siteUrl)).filter(Boolean));
else {
  const links = new Map();
  for (const m of home.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const u = abs(m[1], siteUrl);
    if (!u || bareHost(u) !== siteHost || /\.(pdf|jpe?g|png|zip)$/i.test(u) || /(cart|checkout|account|login|wp-admin|policy|terms|privacy|cancellation|refund|\?add-to-cart)/i.test(u)) continue;
    const text = strip(m[2]).slice(0, 60);
    const score = (PAGE_HINT.test(u) ? 2 : 0) + (PAGE_HINT.test(text) ? 1 : 0);
    if (score > 0 && (!links.has(u) || links.get(u).score < score)) links.set(u.split('?')[0], { score, text });
  }
  // Round-robin across page kinds so one kind (e.g. many shop pages) can't crowd out the rest.
  const GROUPS = [/about|team|faculty|faculties|staff|founder|doctor|leadership/i, /testimonial|review|feedback|clients|stories/i, /course|product|service|shop|menu|pricing|program/i, /portfolio|gallery|work|project/i, /award|press|media/i];
  const buckets = GROUPS.map(() => []);
  for (const [u, v] of [...links.entries()].sort((a, b) => b[1].score - a[1].score)) {
    const g = GROUPS.findIndex((re) => re.test(u) || re.test(v.text));
    if (g >= 0) buckets[g].push(u);
  }
  while (buckets.some((b) => b.length) && pages.length < MAX_PAGES) for (const b of buckets) if (b.length && pages.length < MAX_PAGES) pages.push(b.shift());
}
pages = [...new Set(pages)].slice(0, MAX_PAGES);

// ---------- image references ----------
const refs = new Map(); // url -> {alt, context, heading, page}
for (const page of pages) {
  let html;
  try { html = page === siteUrl ? home : await (await get(page)).text(); } catch { continue; }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    let src = attr(tag, 'data-src') || attr(tag, 'data-lazy-src') || attr(tag, 'src');
    const srcset = attr(tag, 'data-srcset') || attr(tag, 'srcset');
    if (srcset) {
      const best = srcset.split(',').map((s) => s.trim().split(/\s+/)).map(([u, w]) => ({ u, w: parseInt(w) || 0 })).sort((a, b) => b.w - a.w)[0];
      if (best?.u) src = best.u;
    }
    const url = src && !src.startsWith('data:') ? abs(src, page) : null;
    if (!url || SKIP.test(url.split('/').pop()) || /\.svg(\?|$)/i.test(url)) continue;
    const alt = attr(tag, 'alt');
    const before = html.slice(Math.max(0, m.index - 3000), m.index);
    const heading = strip((before.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>(?![\s\S]*<h[1-4]\b)/i) || [])[1] || '').slice(0, 80);
    // Text near the image (names, quotes, captions): cut on tag boundaries so attributes don't leak in.
    const win = html.slice(Math.max(0, m.index - 600), m.index + 900).replace(/^[^<]*>/, '').replace(/<[^>]*$/, '');
    const context = strip(win.replace(/<img[^>]*>/gi, ' ')).slice(0, 240);
    if (!refs.has(url)) refs.set(url, { alt, heading, context, page });
  }
}

// ---------- download ----------
const guessKind = (r) => {
  const hay = `${r.alt} ${r.heading} ${r.context} ${r.page} ${r.url}`;
  for (const [k, re] of KINDS) if (re.test(`${r.alt} ${r.heading}`)) return k;
  for (const [k, re] of KINDS) if (re.test(hay)) return k;
  return 'unknown';
};
const seen = new Set();
const out = [];
for (const [url, r] of refs) {
  if (out.length >= MAX_IMAGES) break;
  // Prefer the original upload over a resized variant (e.g. WordPress -768x768).
  const original = url.replace(/-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp)(\?|$))/i, '');
  let buf, used = url;
  for (const u of original !== url ? [original, url] : [url]) {
    try {
      const res = await get(u);
      if (!(res.headers.get('content-type') || '').startsWith('image/')) continue;
      buf = Buffer.from(await res.arrayBuffer());
      used = u;
      break;
    } catch {}
  }
  if (!buf || buf.length > 8_000_000) continue;
  const hash = createHash('sha1').update(buf).digest('hex');
  if (seen.has(hash)) continue;
  let meta;
  try { meta = await sharp(buf).metadata(); } catch { continue; }
  const short = Math.min(meta.width || 0, meta.height || 0);
  if (short < 64) continue;
  seen.add(hash);
  const id = `c${String(out.length + 1).padStart(2, '0')}`;
  const ext = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', avif: 'avif' }[meta.format] || 'img';
  const file = join(candDir, `${id}.${ext}`);
  await writeFile(file, buf);
  out.push({
    id, file: `assets/_candidates/${id}.${ext}`, url: used, page: r.page, size: `${meta.width}x${meta.height}`,
    quality: short >= 700 ? 'full' : short >= 300 ? 'card' : 'avatar-only',
    kindGuess: guessKind({ ...r, url: used }), alt: r.alt, heading: r.heading, context: r.context,
  });
}
await writeFile(join(srcDir, 'candidates.json'), JSON.stringify({ site: siteUrl, pages, collected: new Date().toISOString().slice(0, 10), candidates: out }, null, 2));

// ---------- contact sheet ----------
const T = 180, L = 24, G = 8, COLS = 6;
const rows = Math.ceil(out.length / COLS) || 1;
const comps = [];
for (const [i, c] of out.entries()) {
  const x = G + (i % COLS) * (T + G), y = G + Math.floor(i / COLS) * (T + L + G);
  const thumb = await sharp(join(brandDir, c.file)).resize(T, T, { fit: 'contain', background: '#d9d9d9' }).flatten({ background: '#d9d9d9' }).png().toBuffer();
  comps.push({ input: thumb, left: x, top: y });
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${L}"><text x="2" y="17" font-family="Segoe UI, Arial" font-size="14" fill="#111">${c.id} · ${c.size} · ${c.kindGuess}</text></svg>`), left: x, top: y + T });
}
await sharp({ create: { width: COLS * (T + G) + G, height: rows * (T + L + G) + G, channels: 3, background: '#ffffff' } }).composite(comps).png().toFile(join(srcDir, 'candidates-sheet.png'));

const byKind = out.reduce((a, c) => ((a[c.kindGuess] = (a[c.kindGuess] || 0) + 1), a), {});
console.log(`Pages scanned: ${pages.length}\n  ${pages.join('\n  ')}`);
console.log(`Candidates: ${out.length} · ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(`Sheet: ${join(srcDir, 'candidates-sheet.png')}\nIndex: ${join(srcDir, 'candidates.json')}`);
