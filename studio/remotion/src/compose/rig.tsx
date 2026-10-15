// Live character rig: redraws a universe character every frame from its shared rig
// (studio/library/universes/<u>/rig-parts.mjs) so it breathes, blinks, glances and shifts its
// weight instead of sitting as a still PNG.
//
// Acting rules (what makes it read as animation rather than wobble):
// - Few things move at once. Breathing and a slow weight shift run all the time and are small;
//   blinks and glances are discrete events with holds between them.
// - Timing is asymmetric: blinks shut in 2 frames and open in 4; glances snap in 3 frames;
//   the inhale is quicker than the exhale.
// - Eyes lead, the head follows a few frames later, the arms and drawstrings trail the body.
// - Everything is a pure function of the frame and a seed: same input → same video.
//
// Talking (`talk`; true = only lines whose speaker is this character): the mouth follows the lip-sync track (audio/lipsync.json, one shape per
// frame); the head dips and the brows lift on stressed syllables, the eyes hold steadier, and
// he blinks as each line ends.
//
// Acting (`acting` beats, compose/acting.ts): pose and face changes, look shifts and gestures
// on spoken words, layered on top of the idle motion.

import React, { useId, useMemo } from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { useUnit } from '../ui';
import { useLipsync, useSceneStart } from '../timeline';
import { gesturesAt, LOOK, lookShift, planActing, poseAt, type RigPose } from './acting';
import type { LayerBase, RigIdle, RigLayer } from './types';
import type { SceneRole } from './layers';
import { stageRig } from './staging';
import { makeRig as noxverseRig, RIG_META as noxverseMeta, type RigState } from '../../../library/universes/noxverse/rig-parts.mjs';

// One entry per universe rig: its drawing function + staging facts (RIG_META). Add a universe = add a line.
type RigMeta = { feet: number; views?: boolean; walk?: { stride: number } };
const RIGS: Record<string, { make: typeof noxverseRig; meta: RigMeta }> = { noxverse: { make: noxverseRig, meta: noxverseMeta } };

type Mood = {
  breathS: number; breathAmp: number;   // breath cycle seconds, depth
  swayS: number; swayAmp: number;       // weight shift cycle seconds, degrees
  headAmp: number; tilt: number;        // head drift degrees, constant tilt
  blink: [number, number];              // seconds between blinks
  glance: [number, number];             // seconds between glances
  range: [number, number];              // glance range px (x, y)
  bias: [number, number];               // where the eyes rest px
  centre: number;                       // chance a glance returns to the rest point
  drip: number;                         // sweat drip cycle seconds
};

const MOODS: Record<Exclude<RigIdle, 'still'>, Mood> = {
  calm: { breathS: 4.2, breathAmp: 1, swayS: 6.5, swayAmp: 0.45, headAmp: 0.9, tilt: 0, blink: [2.4, 5.5], glance: [1.3, 3.4], range: [5, 2.5], bias: [0, 0], centre: 0.45, drip: 4.5 },
  nervous: { breathS: 2.7, breathAmp: 1.25, swayS: 4.6, swayAmp: 0.6, headAmp: 1.2, tilt: 0, blink: [1.5, 3.8], glance: [0.55, 1.6], range: [7, 3], bias: [0, 0], centre: 0.3, drip: 3.4 },
  smug: { breathS: 4.8, breathAmp: 0.9, swayS: 7.5, swayAmp: 0.7, headAmp: 1.1, tilt: 2.2, blink: [3, 6], glance: [2, 4], range: [2, 1], bias: [0, 0], centre: 0.5, drip: 5 },
  shock: { breathS: 1.9, breathAmp: 1.4, swayS: 5, swayAmp: 0.2, headAmp: 0.5, tilt: 0, blink: [3.5, 7], glance: [1.6, 3.5], range: [3, 2], bias: [0, 0], centre: 0.6, drip: 3 },
  focused: { breathS: 3.8, breathAmp: 0.9, swayS: 7, swayAmp: 0.3, headAmp: 0.7, tilt: -1.5, blink: [2.8, 6], glance: [1, 2.6], range: [5, 1.5], bias: [0, 2], centre: 0.4, drip: 4.5 },
};
const FACE_MOOD: Record<string, Exclude<RigIdle, 'still'>> = { worried: 'nervous', sideeye: 'nervous', smug: 'smug', shock: 'shock', focused: 'focused' };

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3);
const TAU = Math.PI * 2;

/** Seeded event times (frames) with gaps drawn from [min, max] seconds. */
function events(seed: string, fps: number, [min, max]: [number, number], horizon: number) {
  const out: number[] = [];
  let t = Math.round((0.3 + random(`${seed}-0`) * (min * 0.8)) * fps);
  for (let i = 1; t < horizon && i < 2000; i++) {
    out.push(t);
    t += Math.round((min + random(`${seed}-${i}`) * (max - min)) * fps);
  }
  return out;
}

/** Blink value 0..1 at `f` frames after a blink starts (2 shut, 1 hold, 4 open at 30 fps). */
function blinkCurve(f: number, fps: number) {
  const k = fps / 30, c = 2 * k, h = 1 * k, o = 4 * k;
  if (f < 0) return 0;
  if (f < c) return (f + 1) / (c + 1);
  if (f < c + h) return 1;
  if (f < c + h + o) return 1 - easeOut((f - c - h) / o);
  return 0;
}

/** Glance position at frame f: snap between seeded targets in `dur` frames, starting `delay` late. */
function gaze(f: number, times: number[], targets: [number, number][], dur: number, delay: number): [number, number] {
  const t = f - delay;
  let i = -1;
  while (i + 1 < times.length && times[i + 1] <= t) i++;
  if (i < 0) return targets[0];
  const from = targets[i], to = targets[i + 1], p = easeOut((t - times[i]) / dur);
  return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
}

/** Stressed syllables (global frames): loudness jumps to ≥ 7 of 9, at most one every ⅓ s. */
function accents(open: string, lines: { from: number; to: number }[], fps: number) {
  const out: number[] = [];
  for (const ln of lines) for (let f = ln.from + 2; f <= ln.to; f++) {
    const o = Number(open[f] ?? 0);
    const before = Math.max(...[1, 2, 3].map((k) => Number(open[f - k] ?? 0)));
    if (o >= 7 && before <= o - 4 && (!out.length || f - out[out.length - 1] >= fps / 3)) out.push(f);
  }
  return out;
}

/** The rig's animation state at a frame. */
function useRigState(l: RigLayer, face: string): { state: RigState; pose: RigPose } {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = useSceneStart();
  const lip = useLipsync();
  const idle = l.idle ?? FACE_MOOD[face] ?? 'calm';
  const seed = String(l.seed ?? `${l.rig}-${face}`);
  const m = idle === 'still' ? null : MOODS[idle];
  const talkKey = JSON.stringify(l.talk ?? false);
  const talk = useMemo(() => {
    if (!l.talk || !lip) return null;
    const tagged = lip.lines.some((x) => x.speaker);
    const lines = lip.lines.filter((x) => (Array.isArray(l.talk) ? l.talk.includes(x.id)
      : l.talk === 'all' || !tagged || x.speaker === l.character));
    return { lines, accents: accents(lip.open, lines, fps) };
  }, [lip, talkKey, fps]);
  const g = start + frame;
  const base: RigPose = l.bust ? { face: l.bust.face, sweat: l.bust.sweat ?? false } : l.pose ?? {};
  const actKey = JSON.stringify(l.acting ?? []);
  const act = useMemo(() => planActing(l.acting, base, !!l.bust, fps), [actKey, fps, !!l.bust, JSON.stringify(base)]);
  const cur = poseAt(act, base, frame, fps);
  const k = fps / 30;
  const gs = gesturesAt(act, frame, fps);
  const acted = { tween: cur.tween, squash: cur.squash + gs.squash, shrug: gs.shrug };
  const line = talk?.lines.find((x) => g >= x.from && g <= x.to);
  const mouth = line && lip ? lip.mouth[g] ?? 'X' : 'X';
  const mouthOpen = line && lip ? Number(lip.open[g] ?? 0) / 9 : 0;
  const plan = useMemo(() => {
    if (!m) return null;
    const horizon = fps * 180;
    const blinks = l.blink === false ? [] : events(`${seed}-blink`, fps, m.blink, horizon);
    // a blink as each spoken line ends, unless one is already close
    for (const x of talk?.lines ?? []) {
      const at = x.to - start + Math.round(fps * 0.07);
      if (l.blink !== false && !blinks.some((b) => Math.abs(b - at) < fps * 0.5)) blinks.push(at);
    }
    for (const b of act.blinks) if (l.blink !== false) blinks.push(b);
    blinks.sort((a, b) => a - b);
    // ~1 in 6 blinks is a double blink
    const allBlinks = blinks.flatMap((b, i) => (random(`${seed}-dbl-${i}`) < 0.17 ? [b, b + Math.round(fps * 0.27)] : [b]));
    const glances = events(`${seed}-look`, fps, m.glance, horizon);
    const base = LOOK[l.look ?? 'center'] ?? [0, 0];
    const rest: [number, number] = [base[0] + m.bias[0], base[1] + m.bias[1]];
    const targets: [number, number][] = [rest, ...glances.map((_, i): [number, number] => {
      if (random(`${seed}-c-${i}`) < m.centre) return rest;
      return [rest[0] + (random(`${seed}-x-${i}`) * 2 - 1) * m.range[0], rest[1] + (random(`${seed}-y-${i}`) * 2 - 1) * m.range[1]];
    })];
    const ph = [0, 1, 2, 3, 4, 5].map((i) => random(`${seed}-ph-${i}`) * TAU);
    return { blinks: allBlinks, glances, targets, rest, ph };
  }, [m, seed, fps, l.blink, l.look, talk, start, act]);
  if (!m || !plan) return { state: { mouth, mouthOpen, ...acted, head: { rot: gs.rot, dx: gs.dx, dy: gs.dy }, brow: gs.brow, blink: gs.blink, look: gs.look }, pose: cur.pose };

  const amt = l.amount ?? 1;
  const t = frame / fps;
  const { ph } = plan;

  // breath: quicker inhale (42% of the cycle), slower exhale
  const bp = ((t / m.breathS + ph[0] / TAU) % 1 + 1) % 1;
  const breathV = bp < 0.42 ? smooth(bp / 0.42) : 1 - smooth((bp - 0.42) / 0.58);
  const breath = (breathV * 2 - 1) * m.breathAmp * amt;

  // weight shift about the feet; arms and drawstrings trail it by ~0.35 s
  const sway = (tt: number) => m.swayAmp * amt * (Math.sin((TAU * tt) / m.swayS + ph[1]) * 0.8 + Math.sin((TAU * tt) / (m.swayS * 0.43) + ph[2]) * 0.2);
  const body = sway(t);
  const lag = sway(t - 0.35);

  // eyes snap to glance targets; the head follows later and slower
  let blink = 0;
  for (const b of plan.blinks) { if (b > frame) break; blink = Math.max(blink, blinkCurve(frame - b, fps)); }
  blink = Math.max(blink, gs.blink);
  // while talking the eyes hold closer to where they rest
  const steady = (p: [number, number]): [number, number] => (line ? [plan.rest[0] + (p[0] - plan.rest[0]) * 0.4, plan.rest[1] + (p[1] - plan.rest[1]) * 0.4] : p);
  // look beats move the rest point: eyes in 3 frames, head 4 frames later, body leans last
  const add = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]];
  const look = add(add(steady(gaze(frame, plan.glances, plan.targets, 3 * k, 0)), lookShift(act, frame, 3 * k)), gs.look);
  const headGaze = add(steady(gaze(frame, plan.glances, plan.targets, 14 * k, 4 * k)), lookShift(act, frame - 4 * k, 12 * k));
  const lean = lookShift(act, frame - 8 * k, 14 * k)[0] * 0.07 + gs.lean;
  const drift = m.headAmp * amt * (Math.sin((TAU * t) / 5.3 + ph[3]) * 0.65 + Math.sin((TAU * t) / 3.1 + ph[4]) * 0.35);
  // stressed syllables: the head dips (alternating a little left/right) and the brows lift
  let nod = 0, nodSide = 1;
  if (talk) for (const [i, a] of talk.accents.entries()) {
    const d = g - a;
    if (d < 0) break;
    if (d < 14 * (fps / 30)) { const r = 3 * (fps / 30); nod = d < r ? easeOut(d / r) : 1 - smooth((d - r) / (11 * (fps / 30))); nodSide = i % 2 ? -1 : 1; }
  }
  const head = {
    rot: m.tilt + drift + headGaze[0] * 0.12 - body * 0.5 + nod * 0.9 * nodSide + gs.rot,
    dx: headGaze[0] * 0.55 + gs.dx,
    dy: headGaze[1] * 0.4 + Math.sin((TAU * t) / 2.9 + ph[5]) * 0.8 * amt + nod * 4 + gs.dy,
  };

  // sweat drop: forms, hangs, slides down and fades, then forms again
  const q = ((t / m.drip + ph[5] / TAU) % 1 + 1) % 1;
  const sweat = q < 0.15
    ? { dy: 0, sx: 0.6 + 0.4 * easeOut(q / 0.15), sy: 0.6 + 0.4 * easeOut(q / 0.15), o: easeOut(q / 0.15) }
    : q < 0.6 ? { dy: Math.sin((q - 0.15) * 14) * 0.6, sx: 1, sy: 1, o: 1 }
      : { dy: 24 * smooth((q - 0.6) / 0.4) ** 1.6, sx: 0.92, sy: 1.12, o: 1 - smooth((q - 0.82) / 0.18) };

  return { pose: cur.pose, state: {
    blink, look, brow: blink * 3 - nod * 4 + gs.brow, breath, head, body: body + lean, mouth, mouthOpen, ...acted,
    armL: -lag * 1.5 + Math.sin(TAU * t / 4.1 + ph[2]) * 0.5 * amt,
    armR: -lag * 1.5 + Math.sin(TAU * t / 4.7 + ph[3]) * 0.5 * amt,
    strings: -lag * 2.4,
    sweat,
  } };
}

type PlaceFC = React.FC<{ l: LayerBase; w?: number; h?: number; children: React.ReactNode; role?: SceneRole }>;

export const RigL: React.FC<{ l: RigLayer; Place: PlaceFC }> = ({ l, Place }) => {
  const u = useUnit();
  const uid = 'r' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const make = RIGS[l.rig]?.make;
  const meta = RIGS[l.rig]?.meta ?? { feet: 93 };
  const face = l.bust?.face ?? l.pose?.face ?? 'worried';
  const { state: idleState, pose } = useRigState(l, face);
  const rig = useMemo(() => (make ? make(l.colors ?? {}, { uid }) : null), [make, l.colors, uid]);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!rig) return null;
  // views, turns and walks (only when the layer asks for them; otherwise the original front view)
  const stg = stageRig(l, frame, fps, meta, l.bust ? 700 : 780);
  const state = stg.active ? { ...idleState, yaw: stg.yaw, headYaw: stg.headYaw, ...(stg.walk ? { walk: stg.walk, body: (idleState.body ?? 0) * (1 - stg.walk.amount) } : {}) } : idleState;
  const placed = stg.active ? { ...l, x: stg.x, y: stg.y } : l;
  const h = (stg.active ? stg.h : undefined) ?? l.h ?? (l.bust ? 700 : 780);
  const w = l.w ?? Math.round(l.bust ? (h * 680) / 640 : h * 0.64);
  const svg = l.bust ? rig.bust(pose.face ?? l.bust.face, pose.sweat ?? false, state) : rig.pose(pose, state);
  return (
    <Place l={placed} w={w * u} h={h * u} role={{ scene: true, litDefault: true, feetDefault: l.bust ? undefined : meta.feet }}>
      <div style={{ width: '100%', height: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </Place>
  );
};

/** Where a rig layer's box is at a frame (centre in % of frame, size in px at 1080 wide) — used by the camera to frame it. */
export function rigBoxAt(l: RigLayer, frame: number, fps: number) {
  const meta = RIGS[l.rig]?.meta ?? { feet: 93 };
  const stg = stageRig(l, frame, fps, meta, l.bust ? 700 : 780);
  const h = (stg.active ? stg.h : undefined) ?? l.h ?? (l.bust ? 700 : 780);
  const w = l.w ?? Math.round(l.bust ? (h * 680) / 640 : h * 0.64);
  return { x: stg.x, y: stg.y, w, h, z: l.z ?? 0.5, bust: !!l.bust };
}
