#!/usr/bin/env node
// Storyboard check for illustrated scenes with characters (universe videos) — coverage and staging QC that
// the contact sheet alone misses. Run it before showing a board (storyboard skill → Step 4).
//
//   node studio/scripts/board-check.mjs <video-folder | storyboard.json> [--quiet] [--no-write]
//
// Expands sets/components exactly like render.mjs, then checks every shot that has a character:
//   errors    flat-character (no set and no lights → pasted on) · pose-png-in-set (use the live rig) ·
//             above-horizon (feet above the set's horizon → floating)
//   warnings  same-coverage (two shots in a row at the same size, view and angle) · front-only (most shots
//             face front) · opens-close (a location's first shot is close) · no-foreground (nothing overlaps
//             the character) · screen-direction (walks flip direction between shots in one place) ·
//             little-life (< 2 ambient layers in a set shot) · static (no camera move) · hud-zooms (overlay
//             not `fixed` in a framed or zoomed shot)
// Prints compact JSON; writes storyboard-check.json next to the storyboard; exit code 1 when there are errors.

import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
let target = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
if (!(await stat(target)).isFile()) target = join(target, 'storyboard.json');
const sb = JSON.parse(await readFile(target, 'utf8'));
const { expandScene, loadSet } = await import(pathToFileURL(join(ROOT, 'studio/scripts/lib/components.mjs')).href);
const RIG_FEET = 93; // % of the box (rig RIG_META.feet; every current rig draws feet there)
const H = { '9:16': 1920, '16:9': 1080, '1:1': 1080, '4:5': 1350 }[sb.format ?? '9:16'] ?? 1920;

const VIEWS = { front: 0, '3/4-right': 45, 'profile-right': 90, 'back-3/4-right': 135, back: 180, 'back-3/4-left': -135, 'profile-left': -90, '3/4-left': -45 };
const yaw = (v) => (v === undefined ? 0 : typeof v === 'number' ? v : VIEWS[v] ?? 0);
const SIZES = ['extreme-wide', 'wide', 'full', 'medium', 'medium-close', 'close', 'extreme-close'];
const sizeOf = (frac) => (frac > 1.6 ? 'extreme-close' : frac > 1.05 ? 'close' : frac > 0.78 ? 'medium-close' : frac > 0.56 ? 'medium' : frac > 0.34 ? 'full' : frac > 0.17 ? 'wide' : 'extreme-wide');
const isPosePng = (l) => l.type === 'image' && /\/characters\/[^/]+\/(poses|heads)\//.test(l.src ?? '');
const STAGE = new Set(['image', 'rig', 'ambient']);

function walkLayers(layers, fn, inGroup = false) {
  for (const l of layers ?? []) { fn(l, inGroup); if (l.type === 'group') walkLayers(l.layers, fn, true); }
}

const errors = [], warnings = [], shots = [];
const err = (shot, code, msg) => errors.push({ shot, code, msg });
const warn = (shot, code, msg) => warnings.push({ shot, code, msg });

for (const [i, s] of sb.scenes.entries()) {
  if (s.template !== 'Composed') continue;
  const raw = s.props ?? {};
  const set = raw.set ? await loadSet(raw.set).catch(() => null) : null;
  const props = await expandScene(raw, sb.format ?? '9:16');
  const id = `${i + 1}·${s.id ?? ''}`;
  const layers = props.layers ?? [];
  const rigs = [], poses = [];
  // a pose PNG inside a component (the photo on an ID card, a TV still) is a deliberate still, not a character on stage
walkLayers(layers, (l, inGroup) => { if (l.type === 'rig') rigs.push({ l, inGroup }); else if (isPosePng(l) && !inGroup) poses.push(l); });
  if (!rigs.length && !poses.length) continue;
  const lit = (props.lights ?? []).length > 0;
  const cam = props.camera ?? {};
  const z1 = cam.to?.zoom ?? cam.from?.zoom ?? 1;

  // --- errors ---
  if (!set && !lit) err(id, 'flat-character', 'character on a flat background with no set and no lights — use a set (or lights + ambient)');
  if (set && poses.length) err(id, 'pose-png-in-set', 'still pose PNG inside a set — use the live rig (lit, shadowed, can turn and walk)');
  const main = rigs.find((r) => !r.inGroup && !r.l.bust)?.l ?? rigs[0]?.l;
  const feetAt = (l, y, h) => y - (h / H) * 50 + (h / H) * RIG_FEET; // % of frame
  if (main && !main.bust && set?.stage?.horizon > 0) {
    const h = main.h ?? 780;
    const pts = [[main.y ?? 50, h]];
    for (const w of [].concat(main.walk ?? [])) pts.push([w.to[1], w.h ?? h]);
    if (pts.some(([y, hh]) => feetAt(main, y, hh) < set.stage.horizon)) err(id, 'above-horizon', `feet above the set's horizon (${set.stage.horizon} %) — the character floats; read the set's stage notes`);
  }

  // --- coverage facts for this shot ---
  let size;
  if (cam.target && cam.shot) size = [].concat(cam.shot).at(-1);
  else if (main) {
    const depth = ((main.z ?? 0.5) - 0.5) * (cam.parallax ?? 1);
    const walkH = [].concat(main.walk ?? []).at(-1)?.h;
    const h = walkH ?? main.h ?? (main.bust ? 700 : 780);
    size = sizeOf(((main.bust ? h * 1.6 : h) * z1 * (1 + (z1 - 1) * depth)) / H);
  } else size = 'full';
  const turns = (main?.acting ?? []).some((b) => b.turn !== undefined || b.turnHead !== undefined);
  const walks = [].concat(main?.walk ?? []);
  const view = main ? (walks.length ? 'walking' : turns ? 'turning' : Math.abs(yaw(main.view)) < 20 ? 'front' : Math.abs(yaw(main.view)) > 120 ? 'back' : 'side') : 'front';
  const angle = cam.angle ?? ((cam.to?.tiltX ?? cam.from?.tiltX ?? 0) > 3 ? 'low' : (cam.to?.tiltX ?? cam.from?.tiltX ?? 0) < -3 ? 'high' : 'eye');
  const dirX = walks.length ? Math.sign(walks.at(-1).to[0] - (main.x ?? 50)) : 0;
  shots.push({ id, set: raw.set ?? null, size, view, angle, dirX });

  // --- warnings ---
  const moving = !!(cam.target || cam.handheld || cam.from || cam.to || cam.shake?.length);
  if (!moving) warn(id, 'static', 'no camera move — add a slow push, a follow or a little hand-held');
  if (set) {
    const life = layers.filter((l) => l.type === 'ambient').length, need = set.stage?.horizon === 0 ? 1 : 2; // interiors: 1 (dust, flicker)
    if (life < need) warn(id, 'little-life', `only ${life} ambient-life layer(s) — fog, grass, stars, dust, flicker…`);
  }
  if (main && !main.inGroup) {
    const idx = layers.indexOf(main);
    const after = layers.slice(idx + 1).filter((l) => STAGE.has(l.type) && !l.fixed && (l.z ?? 0.5) >= (main.z ?? 0.5));
    if (!after.length) warn(id, 'no-foreground', 'nothing in front of the character (grass, fence, counter, a door frame) — depth comes from overlap');
  }
  if ((cam.target || z1 > 1.25)) {
    const loose = (raw.layers ?? []).filter((l) => (l.type === 'text' || l.type === 'component') && !l.fixed);
    if (loose.length) warn(id, 'hud-zooms', `${loose.length} overlay layer(s) zoom with the camera — give titles/HUDs \`fixed: true\``);
  }
}

// --- board-level coverage ---
for (let k = 1; k < shots.length; k++) {
  const a = shots[k - 1], b = shots[k];
  if (a.size === b.size && a.view === b.view && a.angle === b.angle) warn(b.id, 'same-coverage', `same size (${b.size}), view (${b.view}) and angle (${b.angle}) as the shot before — change the size, side or angle`);
  if (a.set && a.set === b.set && a.dirX && b.dirX && a.dirX !== b.dirX) warn(b.id, 'screen-direction', 'the character walks the other way than in the shot before, in the same place — keep screen direction (180° rule) or show the turn');
}
const seen = new Set();
for (const s of shots) {
  if (!s.set || seen.has(s.set)) continue;
  seen.add(s.set);
  if (SIZES.indexOf(s.size) >= SIZES.indexOf('medium-close')) warn(s.id, 'opens-close', `first shot in ${s.set} is ${s.size} — open a location wide or full, then go closer`);
}
const front = shots.filter((s) => s.view === 'front').length;
if (shots.length >= 4 && front / shots.length > 0.7) warn('board', 'front-only', `${front} of ${shots.length} character shots face front — use profile, three-quarter, back views, turns and walks`);

const count = (k) => Object.fromEntries([...new Set(shots.map((s) => s[k]))].map((v) => [v, shots.filter((s) => s[k] === v).length]));
const report = { storyboard: target.replace(/\\/g, '/'), ok: errors.length === 0, characterShots: shots.length, sizes: count('size'), views: count('view'), angles: count('angle'), sets: count('set'), errors, warnings };
if (!args.includes('--no-write')) await writeFile(join(dirname(target), 'storyboard-check.json'), JSON.stringify(report, null, 1));
if (!args.includes('--quiet')) console.log(JSON.stringify(report));
process.exit(errors.length ? 1 : 0);
