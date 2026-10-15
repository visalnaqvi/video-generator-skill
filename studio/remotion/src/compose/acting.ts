// Acting for live rigs: timed beats (usually synced to a spoken word) that change the pose or
// expression, move the eyes, or play a gesture — on top of the idle motion in rig.tsx.
//
// Animation principles built in (frames at 30 fps; scaled for other rates):
// - Pose changes: 4-frame anticipation (a small move the other way + squash), 6-frame main move
//   that starts ON the word and overshoots ~10 % (stretch mid-move), 8-frame settle.
// - Expression swaps hide inside a blink, the way 2D animators cut faces.
// - Eyes lead: on a look beat the eyes snap in 3 frames, the head follows 4 frames later, the
//   body leans last.
// - Gestures are short, eased and return to the pose; holds between them keep it readable.

import type { RigActBeat as ActBeat, RigGesture as Gesture } from './types';

export type RigPose = { arms?: string; face?: string; sweat?: boolean };

const easeOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - (1 - x) ** 3);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
export const LOOK: Record<string, [number, number]> = { center: [0, 0], left: [-8, 0], right: [8, 0], up: [0, -5], down: [0, 5] };

type Change = { start: number; at: number; from: RigPose; to: RigPose };
export type ActPlan = { changes: Change[]; gestures: { at: number; do: Gesture; hold: number }[]; looks: { at: number; look: [number, number] }[]; blinks: number[] };

/** Orders the beats and turns them into pose changes, gestures, look shifts and hiding blinks. */
export function planActing(beats: ActBeat[] | undefined, base: RigPose, bust: boolean, fps: number): ActPlan {
  const k = fps / 30, A = Math.round(4 * k);
  const plan: ActPlan = { changes: [], gestures: [], looks: [], blinks: [] };
  const timed = (beats ?? []).filter((b) => Number.isFinite(b.at)).sort((a, b) => (a.at as number) - (b.at as number));
  // temporary poses (point, shrug) become a change there and back
  const raw: { at: number; to: RigPose | ((cur: RigPose) => RigPose) }[] = [];
  for (const b of timed) {
    const at = b.at as number;
    if (b.pose || b.face || b.sweat != null) raw.push({ at, to: (cur) => ({ ...cur, ...(b.pose ?? {}), ...(b.face ? { face: b.face } : {}), ...(b.sweat != null ? { sweat: b.sweat } : {}) }) });
    if (b.look) plan.looks.push({ at, look: LOOK[b.look] ?? [0, 0] });
    if (b.do === 'point' || b.do === 'shrug') {
      const hold = b.hold ?? Math.round((b.do === 'point' ? 36 : 16) * k);
      if (!bust) {
        let before: string | undefined;
        raw.push({ at, to: (cur) => { before = cur.arms; return { ...cur, arms: b.do }; } });
        raw.push({ at: at + hold, to: (cur) => ({ ...cur, arms: before ?? 'down' }) });
      }
      plan.gestures.push({ at, do: b.do, hold });
    } else if (b.do) plan.gestures.push({ at, do: b.do, hold: b.hold ?? Math.round(24 * k) });
  }
  raw.sort((a, b) => a.at - b.at);
  let cur = base;
  for (const r of raw) {
    const to = typeof r.to === 'function' ? r.to(cur) : r.to;
    plan.changes.push({ start: r.at - A, at: r.at, from: cur, to });
    if (to.face !== cur.face) plan.blinks.push(r.at - 1); // the face swaps inside a blink
    cur = to;
  }
  return plan;
}

/** Anticipation → overshooting move → settle. p = blend 0..1 (overshoots), squash ± (+ = squash). */
function moveCurve(t: number, fps: number) {
  const k = fps / 30, A = 4 * k, M = 6 * k, S = 8 * k;
  if (t < 0) return { p: 0, squash: 0, done: false };
  if (t < A) { const u = easeOut(t / A); return { p: -0.1 * u, squash: 0.03 * u, done: false }; }
  if (t < A + M) { const u = (t - A) / M; return { p: -0.1 + 1.2 * smooth(u), squash: 0.03 * (1 - u) - 0.035 * Math.sin(Math.PI * u), done: false }; }
  if (t < A + M + S) { const u = (t - A - M) / S; return { p: 1 + 0.1 * (1 - easeOut(u)), squash: 0.015 * Math.sin(Math.PI * u) * (1 - u), done: false }; }
  return { p: 1, squash: 0, done: true };
}

/** Pose, arm blend and squash at a frame. */
export function poseAt(plan: ActPlan, base: RigPose, f: number, fps: number) {
  let c: Change | undefined;
  for (const x of plan.changes) { if (x.start > f) break; c = x; }
  if (!c) return { pose: base, tween: undefined as { from: string; p: number } | undefined, squash: 0 };
  const mv = moveCurve(f - c.start, fps);
  const pose = { ...c.to, face: f >= c.at ? c.to.face : c.from.face, sweat: f >= c.at ? c.to.sweat : c.from.sweat };
  const moving = !mv.done && (c.from.arms ?? 'down') !== (c.to.arms ?? 'down');
  return { pose, tween: moving ? { from: c.from.arms ?? 'down', p: mv.p } : undefined, squash: mv.done ? 0 : mv.squash };
}

/** Rest-gaze shift from look beats at frame f (eyes snap in `dur` frames). */
export function lookShift(plan: ActPlan, f: number, dur: number): [number, number] {
  let from: [number, number] = [0, 0], to: [number, number] = [0, 0], at = -Infinity;
  for (const x of plan.looks) { if (x.at > f) break; from = to; to = x.look; at = x.at; }
  if (at === -Infinity) return [0, 0];
  const p = smooth((f - at) / dur);
  return [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
}

export type GestureOut = { rot: number; dx: number; dy: number; brow: number; squash: number; shrug: number; look: [number, number]; blink: number; lean: number };

/** Sum of every gesture playing at frame f. */
export function gesturesAt(plan: ActPlan, f: number, fps: number): GestureOut {
  const k = fps / 30;
  const o: GestureOut = { rot: 0, dx: 0, dy: 0, brow: 0, squash: 0, shrug: 0, look: [0, 0], blink: 0, lean: 0 };
  // up over `a`, hold, down over `b` (frames at 30 fps)
  const env = (d: number, a: number, hold: number, b: number) => (d < 0 ? 0 : d < a * k ? easeOut(d / (a * k)) : d < a * k + hold ? 1 : 1 - smooth((d - a * k - hold) / (b * k)));
  for (const g of plan.gestures) {
    const d = f - g.at;
    if (d < 0 || d > g.hold + 60 * k) continue;
    switch (g.do) {
      case 'nod': { const v = env(d, 4, 0, 10); o.dy += 8 * v; o.rot += 1.2 * v; o.brow += 2 * v; break; }
      case 'shake': { if (d < 22 * k) { const v = Math.sin((Math.PI * 2 * d) / (8 * k)) * (1 - d / (22 * k)); o.rot += 5 * v; o.dx += 4 * v; } break; }
      case 'shrug': { const v = env(d, 6, g.hold, 10); o.shrug += v; o.rot += 3 * v; o.brow -= 5 * v; break; }
      case 'flinch': { const v = env(d, 2, 0, 14); o.squash += 0.06 * v; o.rot -= 4 * v; o.dy += 6 * v; o.brow += 3 * v; if (d < 5 * k) o.blink = Math.max(o.blink, 1); break; }
      case 'gulp': { const v = env(d, 5, 4 * k, 9); o.dy += 5 * v; o.squash += 0.02 * v; o.brow += 2 * v; o.look[1] += 3 * v; break; }
      case 'take': {
        // a startled double take: crouch, spring up tall with brows high, settle
        const a = 3 * k, b = 7 * k, c = 20 * k;
        const sq = d < a ? 0.05 * easeOut(d / a) : d < b ? 0.05 - 0.12 * smooth((d - a) / (b - a)) : d < c ? -0.07 * (1 - easeOut((d - b) / (c - b))) : 0;
        const up = d < a ? 0 : d < b ? smooth((d - a) / (b - a)) : 1 - smooth((d - b) / (c - b) * 0.6);
        o.squash += sq; o.dy -= 10 * Math.max(0, up); o.brow -= 8 * Math.max(0, up); break;
      }
      case 'lookBack': {
        const eyes = env(d, 3, g.hold, 12), head = env(d - 4 * k, 10, g.hold - 4 * k, 12);
        o.look[0] += 11 * eyes; o.look[1] -= 1 * eyes; o.rot += 8 * head; o.dx += 4 * head; o.lean += 0.6 * env(d - 8 * k, 12, g.hold - 8 * k, 12); break;
      }
      case 'point': { const v = env(d, 6, g.hold, 10); o.look[0] += 7 * v; o.rot += 3 * v; break; }
    }
  }
  return o;
}
