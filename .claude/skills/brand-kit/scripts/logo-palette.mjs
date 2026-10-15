#!/usr/bin/env node
// Saves logo/image files (from URLs or local paths) into a folder and reports each
// one's real colours by pixel share, ignoring transparent pixels.
//
// Usage: node logo-palette.mjs <outDir> <url-or-path> [<url-or-path> ...]

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';
import { formatHex, differenceCiede2000, converter } from 'culori';

const [outDir, ...inputs] = process.argv.slice(2);
if (!outDir || !inputs.length) {
  console.error('Usage: node logo-palette.mjs <outDir> <url-or-path> [...]');
  process.exit(1);
}
await mkdir(outDir, { recursive: true });

const EXT = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif', 'image/x-icon': '.ico', 'image/vnd.microsoft.icon': '.ico', 'image/avif': '.avif' };
const deltaE = differenceCiede2000();
const oklch = converter('oklch');

async function load(input, i) {
  if (!/^https?:\/\//i.test(input)) return { buf: await readFile(input), file: input };
  const res = await fetch(input, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim();
  if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'unknown type'})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 5_000_000) throw new Error('larger than 5 MB');
  const name = basename(new URL(input).pathname).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').slice(0, 40) || `image-${i}`;
  const file = join(outDir, name + (EXT[type] || extname(new URL(input).pathname) || '.img'));
  await writeFile(file, buf);
  return { buf, file };
}

async function palette(buf) {
  const img = sharp(buf, { density: 300 });
  const meta = await img.metadata();
  const { data, info } = await img.ensureAlpha().resize(160, 160, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map();
  let opaque = 0, total = 0;
  for (let p = 0; p < data.length; p += 4) {
    total++;
    if (data[p + 3] < 128) continue;
    opaque++;
    const key = ((data[p] >> 4) << 8) | ((data[p + 1] >> 4) << 4) | (data[p + 2] >> 4);
    const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    b.r += data[p]; b.g += data[p + 1]; b.b += data[p + 2]; b.n++;
    buckets.set(key, b);
  }
  // merge perceptually close buckets, biggest first
  const merged = [];
  for (const b of [...buckets.values()].sort((a, z) => z.n - a.n)) {
    const c = { mode: 'rgb', r: b.r / b.n / 255, g: b.g / b.n / 255, b: b.b / b.n / 255 };
    const hit = merged.find((m) => deltaE(m.c, c) < 10);
    if (hit) hit.n += b.n; else merged.push({ c, n: b.n });
  }
  const colors = merged.sort((a, z) => z.n - a.n).slice(0, 8).filter((m) => m.n / opaque >= 0.01).map((m) => {
    const o = oklch(m.c);
    return { hex: formatHex(m.c), share: Math.round((m.n / opaque) * 100), lightness: +o.l.toFixed(2), chroma: +(o.c ?? 0).toFixed(3) };
  });
  const avgL = colors.reduce((s, c) => s + c.lightness * c.share, 0) / 100;
  return {
    format: meta.format, size: `${meta.width}x${meta.height}`,
    transparentShare: Math.round(((total - opaque) / total) * 100),
    tone: avgL > 0.75 ? 'light (needs dark background)' : avgL < 0.35 ? 'dark (needs light background)' : 'mid',
    colors,
  };
}

const results = [];
for (const [i, input] of inputs.entries()) {
  try {
    const { buf, file } = await load(input, i);
    const p = await palette(buf);
    results.push({ input, file, ...p });
    console.log(`${file} · ${p.format} ${p.size} · transparent ${p.transparentShare}% · ${p.tone}`);
    console.log(`  ${p.colors.map((c) => `${c.hex} ${c.share}%`).join('  ')}`);
  } catch (e) {
    results.push({ input, error: e.message });
    console.log(`${input} · FAILED: ${e.message}`);
  }
}
await writeFile(join(outDir, 'logo-palette.json'), JSON.stringify(results, null, 2));
console.log(`Saved ${join(outDir, 'logo-palette.json')}`);
