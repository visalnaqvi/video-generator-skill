// Staging for live rigs — which way a character faces and where it walks, frame by frame. Universe-neutral:
// any rig whose RIG_META says `views: true` draws the result (state.yaw / headYaw / walk, see rig-parts.mjs).
//
//   view       the resting facing (front, 3/4, profile, back or degrees; + = facing screen right)
//   turn beats the head leads (turns over `dur` frames), the body follows 4 frames later and a little slower
//   turnHead   head only (a look over the shoulder), "body" brings it back
//   walk       moves the layer to `to` with an ease in/out; the stride phase comes from the distance
//              covered, so stance feet stay planted; the body turns to face the way it walks first and
//              to `end` afterwards; stride fades in and out so it starts and stops on both feet.

import type { RigActBeat, RigLayer, RigView, RigWalk } from './types';

export const VIEWS: Record<string, number> = {
  front: 0, '3/4-right': 45, 'profile-right': 90, 'back-3/4-right': 135, back: 180,
  'back-3/4-left': -135, 'profile-left': -90, '3/4-left': -45,
};
export const yawOf = (v: RigView | undefined, fallback = 0): number => (v === undefined ? fallback : typeof v === 'number' ? v : VIEWS[v] ?? fallback);

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const easeInOut = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

type Ev = { at: number; to: number; dur: number };
/** Value of a stepped-and-eased timeline at frame f. */
function track(start: number, evs: Ev[], f: number) {
  let v = start;
  for (const e of evs) {
    if (e.at > f) break;
    const p = smooth((f - e.at) / Math.max(1, e.dur));
    v = v + (e.to - v) * p;
  }
  return v;
}

export type Staging = {
  /** Present only when the layer uses views or walks (otherwise the rig draws its original front view). */
  active: boolean;
  x: number; y: number; h?: number;
  yaw: number; headYaw: number;
  walk?: { phase: number; stride: number; lift: number; amount: number };
};

/** Facing of a walk from its screen direction: across → profile, down (toward camera) → front-ish, up → back-ish. */
function walkYaw(dx: number, dy: number) {
  if (Math.abs(dx) >= Math.abs(dy) * 0.8) return dx >= 0 ? 90 : -90;
  if (dy > 0) return Math.max(-35, Math.min(35, (dx / Math.abs(dy)) * 40));
  return dx >= 0 ? 160 : -160;
}

export function stageRig(l: RigLayer, frame: number, fps: number, meta: { views?: boolean; walk?: { stride: number } }, baseH: number): Staging {
  const walks: RigWalk[] = l.walk ? (Array.isArray(l.walk) ? l.walk : [l.walk]) : [];
  const turns = (l.acting ?? []).filter((b: RigActBeat) => b.turn !== undefined || b.turnHead !== undefined);
  const active = !!meta.views && (l.view !== undefined || walks.length > 0 || turns.length > 0);
  const x0 = l.x ?? 50, y0 = l.y ?? 50;
  if (!active) return { active: false, x: x0, y: y0, yaw: 0, headYaw: 0 };
  const k = fps / 30;

  // ---- position along the walks ----
  let x = x0, y = y0, h = l.h ?? baseH;
  let px = x0, py = y0, ph = h, dist = 0, amount = 0;
  const bodyEv: Ev[] = [], headEv: (Ev & { kind: 'turn' | 'head' | 'free' })[] = [];
  for (const w of walks) {
    const at = w.at ?? 0, dur = Math.max(1, w.dur ?? 60), [tx, ty] = w.to, th = w.h ?? ph;
    const dir = w.view !== undefined ? yawOf(w.view) : walkYaw(tx - px, ty - py);
    bodyEv.push({ at: at - 6 * k, to: dir, dur: 8 * k });
    const end = w.end !== undefined ? yawOf(w.end) : dir;
    if (end !== dir) bodyEv.push({ at: at + dur, to: end, dur: 10 * k });
    const p = easeInOut((frame - at) / dur);
    // planted feet: phase follows the ground distance covered (screen px → rig units at the current size)
    const seg = (q: number) => {
      const cx = px + (tx - px) * q, cy = py + (ty - py) * q, ch = ph + (th - ph) * q;
      return { cx, cy, ch };
    };
    if (frame >= at) {
      const steps = 24;
      for (let i = 0; i < steps; i++) {
        const q0 = easeInOut(Math.min(frame - at, dur) * (i / steps) / dur), q1 = easeInOut(Math.min(frame - at, dur) * ((i + 1) / steps) / dur);
        const a = seg(q0), b = seg(q1);
        const dpx = Math.hypot(((b.cx - a.cx) / 100) * 1080, ((b.cy - a.cy) / 100) * 1920 * 2.2);
        dist += dpx / (((a.ch + b.ch) / 2) / 1000);
      }
      const s = seg(p);
      x = s.cx; y = s.cy; h = s.ch;
      if (frame <= at + dur) amount = Math.max(amount, Math.min(smooth((frame - at) / (6 * k)), smooth((at + dur - frame) / (6 * k))));
    }
    px = tx; py = ty; ph = th;
  }

  // ---- turns ----
  for (const b of turns) {
    const at = b.at ?? 0, dur = (b.dur ?? 10) * (fps / 30);
    if (b.turn !== undefined) { bodyEv.push({ at: at + 4 * k, to: yawOf(b.turn), dur: dur * 1.4 }); headEv.push({ at, to: yawOf(b.turn), dur, kind: 'turn' }); }
    if (b.turnHead !== undefined) headEv.push(b.turnHead === 'body' ? { at, to: NaN, dur, kind: 'free' } : { at, to: yawOf(b.turnHead), dur, kind: 'head' });
  }
  bodyEv.sort((a, b) => a.at - b.at);
  headEv.sort((a, b) => a.at - b.at);
  const start = yawOf(l.view);
  const bodyAt = (f: number) => track(start, bodyEv, f);
  const yaw = bodyAt(frame);
  // head: leads the body by 4 frames unless a head-only turn holds it; "body" eases back to the body
  let headYaw = bodyAt(frame + 4 * k);
  let held: number | null = null, heldFrom = 0, heldAt = -Infinity, heldDur = 1, released = false;
  for (const e of headEv) {
    if (e.at > frame) break;
    const cur = held !== null ? heldFrom + (held - heldFrom) * smooth((e.at - heldAt) / heldDur) : bodyAt(e.at + 4 * k);
    if (e.kind === 'free') { released = true; heldFrom = cur; heldAt = e.at; heldDur = e.dur; held = null; continue; }
    if (e.kind === 'turn') { held = null; released = false; continue; } // the head leads the body's own turn
    heldFrom = cur; held = e.to; heldAt = e.at; heldDur = e.dur; released = false;
  }
  if (held !== null) headYaw = heldFrom + (held - heldFrom) * smooth((frame - heldAt) / heldDur);
  else if (released) headYaw = heldFrom + (headYaw - heldFrom) * smooth((frame - heldAt) / heldDur);

  const stride = l.walk && !Array.isArray(l.walk) && l.walk.stride ? l.walk.stride : meta.walk?.stride ?? 70;
  const walk = walks.length ? { phase: dist / (4 * stride), stride: stride * amount, lift: stride * 0.5 * amount, amount } : undefined;
  return { active: true, x, y, h, yaw, headYaw, walk };
}
