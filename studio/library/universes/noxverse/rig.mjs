// Noxverse character rig — builds the still PNGs of the shared body (drawn in rig-parts.mjs) every Noxverse character is drawn with, so all of them
// share outline weight, proportions, poses and expressions (and animate the same way).
// A character = characters/<id>/character.json: `colors` (overrides of RIG_COLORS), `poses`
// ({id: {arms, face, sweat}}) and `heads` ([face ids]). Build:
//   node studio/library/universes/noxverse/rig.mjs <character-id>
// Writes characters/<id>/poses/<pose>.png (640x1000, feet at ~92%), heads/<face>.png, sheet.png.
// The live, animated version of the same drawing is studio/remotion/src/compose/rig.tsx.
// Extend additively (in rig-parts.mjs): new ARMS / FACE_PARTS entries, or new optional parts with defaults that keep
// existing characters' output unchanged (finished videos re-render from these files).
import sharp from 'sharp';
import { mkdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRig } from './rig-parts.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));

export { RIG_COLORS, ARMS, FACES, FACE_PARTS, makeRig } from './rig-parts.mjs';

async function png(svg, file, width) {
  await mkdir(dirname(file), { recursive: true });
  let s = sharp(Buffer.from(svg), { density: 144 });
  if (width) s = s.resize({ width });
  await s.png().toFile(file);
  return file;
}

async function sheet(files, out, w, h) {
  const t = await Promise.all(files.map((f) => sharp(f).resize({ width: w, height: h, fit: 'contain', background: '#8a8f99' }).png().toBuffer()));
  await sharp({ create: { width: w * t.length, height: h, channels: 3, background: '#8a8f99' } }).composite(t.map((input, i) => ({ input, left: i * w, top: 0 }))).png().toFile(out);
}

export async function build(id) {
  const dir = join(ROOT, 'characters', id);
  const ch = JSON.parse(await readFile(join(dir, 'character.json'), 'utf8'));
  const rig = makeRig(ch.colors);
  const poses = [], heads = [];
  for (const [p, cfg] of Object.entries(ch.poses)) poses.push(await png(rig.pose(cfg), join(dir, 'poses', `${p}.png`), 900));
  for (const [f, cfg] of Object.entries(ch.heads)) heads.push(await png(rig.bust(f, cfg.sweat ?? false), join(dir, 'heads', `${f}.png`), 1000));
  await sheet([...poses, ...heads], join(dir, 'sheet.png'), 300, 480);
  return { character: id, poses: Object.keys(ch.poses), heads: Object.keys(ch.heads) };
}

/** Review sheet of the talking mouths: one row per face, one column per mouth shape (X = rest). */
export async function mouths(id) {
  const dir = join(ROOT, 'characters', id);
  const ch = JSON.parse(await readFile(join(dir, 'character.json'), 'utf8'));
  const rig = makeRig(ch.colors, { uid: 'm' });
  const faces = ['worried', 'smug', 'shock', 'focused', 'sideeye'], shapes = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const W = 234, H = 153, lab = 26;
  const comps = [];
  for (const [r, face] of faces.entries()) for (const [c, shape] of shapes.entries()) {
    const svg = rig.bust(face, false, { mouth: shape, mouthOpen: 0.6 }).replace('width="100%" height="100%" viewBox="-40 40 680 640"', `width="${W}" height="${H}" viewBox="170 262 260 170"`);
    comps.push({ input: await sharp(Buffer.from(svg)).png().toBuffer(), left: 60 + c * W, top: lab + r * H });
  }
  const text = (s, x, y) => `<text x="${x}" y="${y}" font-family="Consolas, monospace" font-size="18" fill="#222">${s}</text>`;
  const labels = shapes.map((s, c) => text(s, 60 + c * W + W / 2 - 5, 19)).join('') + faces.map((f, r) => text(f.slice(0, 5), 2, lab + r * H + H / 2)).join('');
  const out = join(dir, 'mouths.png');
  await sharp({ create: { width: 60 + shapes.length * W, height: lab + faces.length * H, channels: 3, background: '#8a8f99' } })
    .composite([...comps, { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${60 + shapes.length * W}" height="${lab + faces.length * H}">${labels}</svg>`), left: 0, top: 0 }])
    .png().toFile(out);
  return out;
}

/** Review sheet of the turnable live body: a turnaround (yaw), turned poses, a head-only turn and the walk
 *  cycle in profile (8 frames) and from the front (4 frames). Writes characters/<id>/views.png. */
export async function views(id) {
  const dir = join(ROOT, 'characters', id);
  const ch = JSON.parse(await readFile(join(dir, 'character.json'), 'utf8'));
  const rig = makeRig(ch.colors, { uid: 'v' });
  const W = 240, H = 375, lab = 24;
  const down = { arms: 'down', face: 'worried' };
  const cells = [];
  for (const yaw of [0, 30, 60, 90, 135, 180, -45, -90]) cells.push([`yaw ${yaw}`, rig.pose(down, { yaw })]);
  for (const yaw of [0, 45, 90]) cells.push([`phone ${yaw}`, rig.pose({ arms: 'phone', face: 'worried' }, { yaw })]);
  cells.push(['point 40', rig.pose({ arms: 'point', face: 'shock' }, { yaw: 40 })]);
  cells.push(['smug -40', rig.pose({ arms: 'down', face: 'smug' }, { yaw: -40 })]);
  cells.push(['head 70', rig.pose(down, { yaw: 0, headYaw: 70 })]);
  for (let i = 0; i < 8; i++) cells.push([`walk ${i}/8`, rig.pose(down, { yaw: 90, walk: { phase: i / 8, stride: 70 } })]);
  for (let i = 0; i < 4; i++) cells.push([`walk front ${i}/4`, rig.pose(down, { yaw: 0, walk: { phase: i / 4, stride: 70 } })]);
  const cols = 8, rows = Math.ceil(cells.length / cols);
  const comps = [];
  for (const [i, [label, svg]] of cells.entries()) {
    const x = (i % cols) * W, y = Math.floor(i / cols) * (H + lab);
    comps.push({ input: await sharp(Buffer.from(svg.replace('width="100%" height="100%"', `width="${W}" height="${H}"`))).png().toBuffer(), left: x, top: y + lab });
    comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${lab}"><text x="6" y="18" font-family="Consolas, monospace" font-size="16" fill="#222">${label}</text></svg>`), left: x, top: y });
  }
  const out = join(dir, 'views.png');
  await sharp({ create: { width: cols * W, height: rows * (H + lab), channels: 3, background: '#8a93a8' } }).composite(comps).png().toFile(out);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const id = process.argv[2];
  if (!id) { console.error('Usage: node rig.mjs <character-id> [--mouths | --views]'); process.exit(1); }
  if (process.argv.includes('--mouths')) console.log(await mouths(id));
  else if (process.argv.includes('--views')) console.log(await views(id));
  else console.log(JSON.stringify(await build(id)));
}
