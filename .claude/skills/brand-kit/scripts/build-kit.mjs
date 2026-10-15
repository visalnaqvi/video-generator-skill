#!/usr/bin/env node
// Completes a brand kit: reads <brandDir>/brand.json (colour roles, fonts, logo chosen
// by Claude), computes on-colours, tint scales, contrast checks and Google Font
// availability, writes them back under "computed", and renders swatch.png for review.
//
// Usage: node build-kit.mjs <brandDir> [--offline]

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { converter, formatHex, wcagContrast, clampChroma } from 'culori';

const [dir, flag] = process.argv.slice(2);
if (!dir) { console.error('Usage: node build-kit.mjs <brandDir> [--offline]'); process.exit(1); }
const offline = flag === '--offline';
const file = join(dir, 'brand.json');
const brand = JSON.parse(await readFile(file, 'utf8'));
const oklch = converter('oklch');
const warnings = [];

// ---------- colours ----------
const ROLE_ORDER = ['primary', 'secondary', 'accent', 'highlight', 'background', 'surface', 'ink', 'muted'];
const REQUIRED = ['primary', 'accent', 'background', 'surface', 'ink', 'muted'];
const colors = brand.colors || {};
for (const r of REQUIRED) if (!colors[r]?.hex) { console.error(`brand.json: colors.${r}.hex is required`); process.exit(1); }
for (const [r, v] of Object.entries(colors)) v.hex = formatHex(v.hex);

const ratio = (a, b) => +wcagContrast(a, b).toFixed(2);
const ink = colors.ink.hex;
const onColor = (bg) => (ratio('#ffffff', bg) >= ratio(ink, bg) ? '#ffffff' : ink);
const on = {};
for (const r of ['primary', 'secondary', 'accent', 'highlight']) if (colors[r]) on[r] = onColor(colors[r].hex);

const STEPS = { 50: 0.97, 100: 0.93, 200: 0.86, 300: 0.77, 400: 0.68, 500: 0.59, 600: 0.5, 700: 0.42, 800: 0.33, 900: 0.24 };
const scale = (hex) => {
  const base = oklch(hex);
  const out = {};
  for (const [k, L] of Object.entries(STEPS)) {
    const c = (base.c ?? 0) * Math.max(0.25, 1 - Math.abs(L - 0.6) * 1.1);
    out[k] = formatHex(clampChroma({ mode: 'oklch', l: L, c, h: base.h ?? 0 }, 'oklch'));
  }
  return out;
};
const scales = {};
for (const r of ['primary', 'secondary', 'accent']) if (colors[r]) scales[r] = scale(colors[r].hex);

const checks = [
  ['ink', 'background', ink, colors.background.hex, 4.5],
  ['muted', 'background', colors.muted.hex, colors.background.hex, 4.5],
  ['ink', 'surface', ink, colors.surface.hex, 4.5],
  ...['primary', 'secondary', 'accent'].filter((r) => colors[r]).map((r) => [`on-${r}`, r, on[r], colors[r].hex, 4.5]),
  ['primary', 'background', colors.primary.hex, colors.background.hex, 3],
  ['accent', 'background', colors.accent.hex, colors.background.hex, 3],
  ...(colors.highlight ? [['ink', 'highlight', ink, colors.highlight.hex, 4.5]] : []),
];
const contrast = checks.map(([fg, bg, a, b, need]) => {
  const r = ratio(a, b);
  const ok = r >= need;
  if (!ok) warnings.push(`${fg} on ${bg}: contrast ${r} < ${need}${need === 4.5 && r >= 3 ? ' (OK only for large/bold text)' : ''}`);
  return { pair: `${fg} on ${bg}`, ratio: r, need, ok };
});

// ---------- fonts ----------
const fontStatus = {};
for (const role of ['heading', 'body']) {
  const f = brand.fonts?.[role];
  if (!f?.family) { warnings.push(`fonts.${role}.family missing`); continue; }
  if (offline) { fontStatus[role] = { family: f.family, google: 'unchecked' }; continue; }
  const fam = encodeURIComponent(f.family).replace(/%20/g, '+');
  const weights = (f.weights || []).slice().sort((a, b) => a - b);
  const ok = async (q) => { try { return (await fetch(`https://fonts.googleapis.com/css2?family=${q}`, { signal: AbortSignal.timeout(10000) })).ok; } catch { return null; } };
  const famOk = await ok(fam);
  const wOk = famOk && weights.length ? await ok(`${fam}:wght@${weights.join(';')}`) : famOk;
  fontStatus[role] = { family: f.family, google: famOk, weightsAvailable: wOk };
  if (famOk === false) warnings.push(`${role} font "${f.family}" is not on Google Fonts; choose the closest Google Font and keep the original in fonts.${role}.original`);
  else if (wOk === false) warnings.push(`${role} font "${f.family}" lacks one of weights ${weights.join(', ')} on Google Fonts`);
  else if (famOk === null) warnings.push(`could not reach Google Fonts to check "${f.family}"`);
}

// ---------- logo ----------
let logoData = null;
if (brand.logo?.primary) {
  try {
    const png = await sharp(join(dir, brand.logo.primary), { density: 300 }).resize(480, 200, { fit: 'inside' }).png().toBuffer();
    const m = await sharp(png).metadata();
    logoData = { uri: `data:image/png;base64,${png.toString('base64')}`, w: m.width, h: m.height };
  } catch (e) { warnings.push(`logo.primary could not be read: ${e.message}`); }
} else warnings.push('logo.primary not set');

// ---------- swatch ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const W = 1080, H = 1350, P = 56;
const bgHex = colors.background.hex;
const FONT = "Segoe UI, Arial, sans-serif";
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${bgHex}"/>`;
svg += `<text x="${P}" y="${P + 40}" font-family="${FONT}" font-size="44" font-weight="700" fill="${ink}">${esc(brand.name)}</text>`;
svg += `<text x="${P}" y="${P + 82}" font-family="${FONT}" font-size="24" fill="${colors.muted.hex}">Brand kit v${esc(brand.version ?? 1)} · ${esc(brand.status ?? 'draft')}</text>`;
if (logoData) {
  const s = Math.min(320 / logoData.w, 130 / logoData.h);
  const lw = logoData.w * s, lh = logoData.h * s;
  const box = brand.logo.safeBackground === 'dark' ? ink : '#ffffff';
  svg += `<rect x="${W - P - lw - 24}" y="${P - 10}" width="${lw + 24}" height="${lh + 20}" rx="12" fill="${box}" stroke="${colors.muted.hex}" stroke-opacity="0.3"/>`;
  svg += `<image x="${W - P - lw - 12}" y="${P}" width="${lw}" height="${lh}" href="${logoData.uri}"/>`;
}
// role tiles
const roles = ROLE_ORDER.filter((r) => colors[r]);
const tileW = (W - 2 * P - 3 * 16) / 4, tileH = 190;
roles.forEach((r, i) => {
  const x = P + (i % 4) * (tileW + 16), y = 220 + Math.floor(i / 4) * (tileH + 16);
  const hx = colors[r].hex, fg = on[r] || onColor(hx);
  svg += `<rect x="${x}" y="${y}" width="${tileW}" height="${tileH}" rx="14" fill="${hx}" stroke="${ink}" stroke-opacity="0.15"/>`;
  svg += `<text x="${x + 18}" y="${y + 40}" font-family="${FONT}" font-size="26" font-weight="700" fill="${fg}">${r}</text>`;
  svg += `<text x="${x + 18}" y="${y + 74}" font-family="${FONT}" font-size="22" fill="${fg}">${hx.toUpperCase()}</text>`;
  svg += `<text x="${x + 18}" y="${y + tileH - 20}" font-family="${FONT}" font-size="18" fill="${fg}" opacity="0.85">${esc((colors[r].name || '').slice(0, 22))}</text>`;
});
// scales
let y = 220 + Math.ceil(roles.length / 4) * (tileH + 16) + 24;
for (const [r, sc] of Object.entries(scales)) {
  svg += `<text x="${P}" y="${y + 30}" font-family="${FONT}" font-size="20" fill="${colors.muted.hex}">${r}</text>`;
  const cw = (W - 2 * P - 130) / 10;
  Object.values(sc).forEach((hx, i) => { svg += `<rect x="${P + 130 + i * cw}" y="${y}" width="${cw}" height="44" fill="${hx}"/>`; });
  y += 56;
}
// sample card
y += 16;
const cardH = 250;
svg += `<rect x="${P}" y="${y}" width="${W - 2 * P}" height="${cardH}" rx="22" fill="${colors.primary.hex}"/>`;
if (colors.highlight) svg += `<rect x="${P + 36}" y="${y + 40}" width="230" height="64" fill="${colors.highlight.hex}"/>`;
svg += `<text x="${P + 44}" y="${y + 90}" font-family="${FONT}" font-size="54" font-weight="800" fill="${colors.highlight ? onColor(colors.highlight.hex) : on.primary}">Headline</text>`;
svg += `<text x="${P + 44}" y="${y + 140}" font-family="${FONT}" font-size="26" fill="${on.primary}">Body copy on primary · ${esc(brand.fonts?.heading?.family)} / ${esc(brand.fonts?.body?.family)}</text>`;
svg += `<rect x="${P + 44}" y="${y + 168}" width="300" height="56" rx="28" fill="${colors.accent.hex}"/>`;
svg += `<text x="${P + 194}" y="${y + 205}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="${on.accent}">Call to action</text>`;
y += cardH + 30;
// contrast list
const cols = 2, lineH = 34;
contrast.forEach((c, i) => {
  const x = P + (i % cols) * ((W - 2 * P) / cols), yy = y + Math.floor(i / cols) * lineH;
  svg += `<text x="${x}" y="${yy}" font-family="${FONT}" font-size="21" fill="${c.ok ? ink : '#c62828'}">${c.ok ? '✓' : '✗'} ${esc(c.pair)} ${c.ratio}</text>`;
});
svg += `<text x="${P}" y="${H - 30}" font-family="${FONT}" font-size="18" fill="${colors.muted.hex}">Fonts shown in a system fallback; names above are the brand fonts.</text>`;
svg += '</svg>';
const swatch = join(dir, 'swatch.png');
await sharp(Buffer.from(svg)).resize(810).png().toFile(swatch);

// ---------- save ----------
brand.computed = { on, scales, contrast, fonts: fontStatus, warnings, built: new Date().toISOString().slice(0, 10) };
await writeFile(file, JSON.stringify(brand, null, 2));

console.log(`Updated ${file}`);
console.log(`Swatch  ${swatch}`);
console.log(`On-colours: ${Object.entries(on).map(([k, v]) => `${k}→${v}`).join(' ')}`);
console.log(`Contrast: ${contrast.filter((c) => c.ok).length}/${contrast.length} pass`);
console.log(warnings.length ? `Warnings:\n- ${warnings.join('\n- ')}` : 'Warnings: none');
