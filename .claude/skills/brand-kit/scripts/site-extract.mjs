#!/usr/bin/env node
// Static brand scan of a website: colours (from CSS), fonts, logo candidates,
// meta, contact links and headings. No browser needed. Writes compact JSON.
//
// Usage: node site-extract.mjs <url> <out.json>

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parse, formatHex, converter } from 'culori';

const [pageUrl, outPath] = process.argv.slice(2);
if (!pageUrl || !outPath) {
  console.error('Usage: node site-extract.mjs <url> <out.json>');
  process.exit(1);
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const MAX_CSS_FILES = 25;
const MAX_BYTES = 1_500_000;
// Third-party CSS whose colours are not the brand's.
const FRAMEWORK = /(wp-includes|\/plugins\/|bootstrap|font-?awesome|elementor\/assets|woocommerce|jquery|slick|swiper|owl\.carousel|animate(\.min)?\.css|dashicons|gutenberg|block-library)/i;
const ICON_FONTS = /(awesome|dashicons|eicons|icomoon|icons?$|glyph|material symbols|material icons|elementskit|themify|ionicons|feather|swiper-icons|star|wc|woocommerce)/i;
const GENERIC_FONTS = new Set(['inherit', 'initial', 'unset', 'serif', 'sans-serif', 'monospace', 'cursive', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'arial', 'helvetica', 'helvetica neue', 'times new roman', 'roboto', 'ui-sans-serif', 'ui-serif', 'var']);

const oklch = converter('oklch');

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { text: (await res.text()).slice(0, MAX_BYTES), url: res.url };
}

const abs = (u, base) => { try { return new URL(u.replace(/&amp;/g, '&'), base).href; } catch { return null; } };
const attr = (tag, name) => (tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')) || [])[2] ?? null;
const stripTags = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();

// ---------- fetch page + CSS ----------
const page = await get(pageUrl);
const html = page.text;
const base = page.url;

const cssSources = []; // { name, framework, text }
for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) cssSources.push({ name: 'inline <style>', framework: false, text: m[1] });
const inlineStyles = [...html.matchAll(/\bstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1]).join(';\n');
if (inlineStyles) cssSources.push({ name: 'style attributes', framework: false, text: inlineStyles });

const cssLinks = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0])
  .filter((t) => /rel\s*=\s*["'][^"']*stylesheet/i.test(t) || (/rel\s*=\s*["']preload/i.test(t) && /as\s*=\s*["']style/i.test(t)))
  .map((t) => abs(attr(t, 'href') || '', base)).filter(Boolean)
  .filter((u) => !/fonts\.googleapis\.com/.test(u));
const uniqueLinks = [...new Set(cssLinks)].slice(0, MAX_CSS_FILES);

const fetched = await Promise.allSettled(uniqueLinks.map(get));
const failedCss = [];
for (const [i, r] of fetched.entries()) {
  if (r.status !== 'fulfilled') { failedCss.push(uniqueLinks[i]); continue; }
  cssSources.push({ name: uniqueLinks[i].split('?')[0].split('/').slice(-2).join('/'), framework: FRAMEWORK.test(uniqueLinks[i]), text: r.value.text });
  // one level of @import
  for (const im of r.value.text.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/gi)) {
    const u = abs(im[1], r.value.url);
    if (u && !/fonts\.googleapis/.test(u) && cssSources.length < MAX_CSS_FILES + 10) {
      try { const c = await get(u); cssSources.push({ name: u.split('/').slice(-2).join('/'), framework: FRAMEWORK.test(u), text: c.text }); } catch {}
    }
  }
}

// ---------- colours ----------
const COLOR_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;
const colors = new Map(); // hex -> {site, framework, bg, text, border, other, vars:Set}
const customProps = new Map(); // --name -> hex

function toHex(str) {
  const c = parse(str);
  if (!c || (c.alpha !== undefined && c.alpha < 0.5)) return null;
  return formatHex(c);
}
function bucket(prop) {
  if (prop.startsWith('background')) return 'bg';
  if (prop === 'color') return 'text';
  if (/^(border|outline|box-shadow|text-decoration)/.test(prop)) return 'border';
  if (prop === 'fill' || prop === 'stroke') return 'svg';
  return 'other';
}

for (const src of cssSources) {
  for (const d of src.text.matchAll(/(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const prop = d[1].toLowerCase();
    const value = d[2];
    for (const cm of value.matchAll(COLOR_RE)) {
      const hex = toHex(cm[0]);
      if (!hex) continue;
      if (prop.startsWith('--')) { if (!customProps.has(prop)) customProps.set(prop, hex); }
      const e = colors.get(hex) || { site: 0, framework: 0, bg: 0, text: 0, border: 0, svg: 0, other: 0 };
      e[src.framework ? 'framework' : 'site']++;
      e[bucket(prop)]++;
      colors.set(hex, e);
    }
  }
}

const describe = (hex) => {
  const c = oklch(hex);
  const chroma = c.c ?? 0;
  return { lightness: +c.l.toFixed(2), chroma: +chroma.toFixed(3), neutral: chroma < 0.03 };
};
const colorList = [...colors.entries()]
  .map(([hex, e]) => ({ hex, ...e, ...describe(hex) }))
  .sort((a, b) => b.site - a.site || (b.site + b.framework) - (a.site + a.framework));

const brandVars = [...customProps.entries()]
  .filter(([k]) => /(primary|secondary|accent|brand|theme|main|global-color|text|heading|link|button|btn|bg|background)/i.test(k))
  .slice(0, 30).map(([name, hex]) => ({ name, hex }));

// ---------- fonts ----------
const fontCount = new Map();
const fontFace = new Set();
for (const src of cssSources) {
  for (const m of src.text.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
    const first = m[1].split(',')[0].replace(/["']/g, '').replace(/!important/, '').trim();
    const key = first.toLowerCase();
    if (!first || GENERIC_FONTS.has(key) || key.startsWith('var(') || ICON_FONTS.test(first)) continue;
    fontCount.set(first, (fontCount.get(first) || 0) + (src.framework ? 1 : 3));
  }
  for (const m of src.text.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*["']?([^;"'}]+)/gi)) {
    if (!ICON_FONTS.test(m[1])) fontFace.add(m[1].trim());
  }
}
const googleFonts = new Set();
for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/gi)) {
  const q = m[1].replace(/&amp;/g, '&');
  for (const f of q.matchAll(/family=([^&]+)/g)) {
    for (const fam of decodeURIComponent(f[1]).split('|')) googleFonts.add(fam.split(':')[0].replace(/\+/g, ' ').trim());
  }
}

// ---------- logos ----------
const headerStart = html.search(/<header\b/i);
const headerEnd = headerStart >= 0 ? html.indexOf('</header>', headerStart) : -1;
const logos = [];
let imgIndex = 0;
for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
  const tag = m[0];
  const src = attr(tag, 'data-src') || attr(tag, 'data-lazy-src') || attr(tag, 'src');
  if (!src || src.startsWith('data:')) { imgIndex++; continue; }
  const hay = `${src} ${attr(tag, 'alt') || ''} ${attr(tag, 'class') || ''} ${attr(tag, 'id') || ''}`.toLowerCase();
  let score = 0;
  if (hay.includes('logo')) score += 3;
  if (headerStart >= 0 && m.index > headerStart && (headerEnd < 0 || m.index < headerEnd)) score += 2;
  if (imgIndex < 3) score += 1;
  if (score > 0) logos.push({ url: abs(src, base), alt: attr(tag, 'alt'), score });
  imgIndex++;
}
for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
  const rel = (attr(m[0], 'rel') || '').toLowerCase();
  if (/icon/.test(rel)) logos.push({ url: abs(attr(m[0], 'href') || '', base), alt: rel, score: rel.includes('apple') ? 1.5 : 1 });
}
const ogImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i) || [])[0];
if (ogImage) logos.push({ url: abs(attr(ogImage, 'content') || '', base), alt: 'og:image', score: 0.5 });
const seen = new Set();
const logoList = logos.filter((l) => l.url && !seen.has(l.url) && seen.add(l.url)).sort((a, b) => b.score - a.score).slice(0, 6);

// ---------- meta, contacts, headings ----------
const meta = (sel) => { const t = (html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${sel}["'][^>]*>`, 'i')) || [])[0]; return t ? attr(t, 'content') : null; };
const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
const uniq = (a) => [...new Set(a)];
const contacts = {
  phones: uniq(hrefs.filter((h) => h.startsWith('tel:')).map((h) => h.slice(4).trim())),
  emails: uniq(hrefs.filter((h) => h.startsWith('mailto:')).map((h) => h.slice(7).split('?')[0])),
  whatsapp: uniq(hrefs.filter((h) => /wa\.me|whatsapp\.com/.test(h))),
  social: uniq(hrefs.filter((h) => /(instagram|facebook|youtube|linkedin|twitter|x\.com|t\.me|threads)\.(com|net|me)/i.test(h)).map((h) => h.split('?')[0])),
};
const headings = uniq([...html.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => stripTags(m[2])).filter((t) => t && t.length <= 140)).slice(0, 25);

const result = {
  url: base,
  scanned: new Date().toISOString().slice(0, 10),
  meta: { title: stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ''), description: meta('description'), siteName: meta('og:site_name'), themeColor: meta('theme-color') },
  colors: {
    note: 'site = count in the site\'s own CSS; framework = plugin/library CSS (usually not brand). bg/text/border = where it is used.',
    brandVariables: brandVars,
    top: colorList.slice(0, 20),
  },
  fonts: {
    googleFontsLoaded: [...googleFonts],
    fontFace: [...fontFace].slice(0, 15),
    byUsage: [...fontCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([family, weight]) => ({ family, weight })),
  },
  logoCandidates: logoList,
  contacts,
  headings,
  cssFiles: { read: cssSources.length, failed: failedCss.length },
};

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, JSON.stringify(result, null, 2));

const topSite = colorList.filter((c) => c.site > 0).slice(0, 8).map((c) => `${c.hex}${c.neutral ? '(n)' : ''}×${c.site}`).join(' ');
console.log(`Saved ${outPath}`);
console.log(`CSS read: ${cssSources.length} (failed ${failedCss.length}) · colours: ${colorList.length} · brand vars: ${brandVars.length}`);
console.log(`Top site colours: ${topSite || '(none)'}`);
console.log(`Fonts: ${result.fonts.byUsage.slice(0, 4).map((f) => f.family).join(', ') || '(none)'} · Google: ${result.fonts.googleFontsLoaded.join(', ') || '(none)'}`);
console.log(`Logo candidates: ${logoList.length} · phones: ${contacts.phones.length} · social: ${contacts.social.length}`);
