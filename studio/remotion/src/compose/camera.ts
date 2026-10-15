// Camera language for composed scenes — shot sizes that frame a layer (and follow it while it walks),
// camera angles and hand-held drift. Universe-neutral: works on any layer with an id and a box.
//
// A shot size names how much of the subject fills the frame, measured on its box (a full-body rig's box is
// head-to-toe): wide → full → medium (waist up) → medium-close (chest up) → close (head and shoulders) →
// extreme-close (face). `shot: ["full", "close"]` pushes in over the scene with the camera's ease.

import { noise2D } from '@remotion/noise';
import type { Camera, CameraState, Layer, ShotSize } from './types';
import { rigBoxAt } from './rig';

/** Part of the subject's box each size frames (fractions of its height) and how much of the frame height it fills. */
const SHOTS: Record<ShotSize, { top: number; bottom: number; fill: number; at: number }> = {
  'extreme-wide': { top: 0, bottom: 1, fill: 0.16, at: 0.6 },
  wide: { top: 0, bottom: 1, fill: 0.3, at: 0.58 },
  full: { top: 0, bottom: 1, fill: 0.6, at: 0.52 },
  medium: { top: 0, bottom: 0.62, fill: 0.66, at: 0.46 },
  'medium-close': { top: 0, bottom: 0.48, fill: 0.56, at: 0.44 },
  close: { top: 0.02, bottom: 0.42, fill: 0.46, at: 0.42 },
  'extreme-close': { top: 0.14, bottom: 0.36, fill: 0.3, at: 0.42 },
};
const ANGLES: Record<string, { tiltX: number; rotate: number; dy: number }> = {
  eye: { tiltX: 0, rotate: 0, dy: 0 }, low: { tiltX: 7, rotate: 0, dy: -5 }, high: { tiltX: -7, rotate: 0, dy: 5 },
  dutch: { tiltX: 0, rotate: 6, dy: 0 }, 'dutch-left': { tiltX: 0, rotate: -6, dy: 0 },
};

type Box = { x: number; y: number; w: number; h: number; z: number };
function boxOf(l: Layer, frame: number, fps: number): Box | null {
  if (l.type === 'rig') return rigBoxAt(l, frame, fps);
  const w = (l as { w?: number }).w, h = (l as { h?: number }).h;
  if (!w || !h) return null;
  return { x: l.x ?? 50, y: l.y ?? 50, w, h, z: l.z ?? 0.5 };
}

/** Camera state (zoom, pan %, rotate, tilt) that frames the target at this frame. Null = no target. */
export function shotCamera(cam: Camera | undefined, layers: Layer[], frame: number, t: number, fps: number, W: number, H: number, u: number): Required<CameraState> | null {
  if (!cam?.target || !cam.shot) return null;
  const layer = layers.find((l) => l.id === cam.target);
  if (!layer) return null;
  const box = boxOf(layer, frame, fps);
  if (!box) return null;
  const [s0, s1] = Array.isArray(cam.shot) ? cam.shot : [cam.shot, cam.shot];
  const a = SHOTS[s0] ?? SHOTS.full, b = SHOTS[s1] ?? SHOTS.full;
  const mix = (k: 'top' | 'bottom' | 'fill' | 'at') => a[k] + (b[k] - a[k]) * t;
  const bh = box.h * u;
  const regionH = (mix('bottom') - mix('top')) * bh;
  const ang = ANGLES[cam.angle ?? 'eye'] ?? ANGLES.eye;
  // a near layer also grows by its parallax scale (1 + (zoom − 1) × depth): solve zoom so the region fills the frame
  const depth = (box.z - 0.5) * (cam.parallax ?? 1);
  const F = (mix('fill') * H) / regionH;
  const zoom = Math.max(1, Math.abs(depth) < 1e-3 ? F : (-(1 - depth) + Math.sqrt((1 - depth) ** 2 + 4 * depth * F)) / (2 * depth));
  // the framed point: middle of the region, in frame px, after the layer's own parallax scale
  const cx0 = (box.x / 100) * W, cy0 = (box.y / 100) * H;
  const top = cy0 - bh / 2;
  const ty0 = top + ((mix('top') + mix('bottom')) / 2) * bh;
  const sc = 1 + (zoom - 1) * depth;
  const tx = cx0, ty = cy0 + (ty0 - cy0) * sc;
  const sx = ((cam.screen?.[0] ?? 50) / 100) * W;
  const sy = ((cam.screen?.[1] ?? mix('at') * 100 + ang.dy) / 100) * H;
  // solve the pan so the point lands on screen, including its parallax shift (layers.tsx Place)
  let px = (W / 2 + zoom * (tx - W / 2) - sx) / (1 + 0.6 * zoom * depth);
  let py = (H / 2 + zoom * (ty - H / 2) - sy) / (1 + 0.6 * zoom * depth);
  if (cam.clamp !== false) {
    const mx = Math.max(0, (W * (zoom * 1.07 - 1)) / 2), my = Math.max(0, (H * (zoom * 1.07 - 1)) / 2);
    px = Math.max(-mx, Math.min(mx, px)); py = Math.max(-my, Math.min(my, py));
  }
  const from = cam.from ?? {}, to = cam.to ?? {};
  const l2 = (k: keyof CameraState, d = 0) => (from[k] ?? d) + ((to[k] ?? from[k] ?? d) - (from[k] ?? d)) * t;
  return { zoom, x: (px / W) * 100, y: (py / H) * 100, rotate: ang.rotate + l2('rotate'), tiltX: ang.tiltX + l2('tiltX'), tiltY: l2('tiltY') };
}

/** Hand-held drift added to the camera state (slow, organic; a little rotation). */
export function handheld(amount: number | undefined, frame: number, fps: number) {
  if (!amount) return { x: 0, y: 0, rotate: 0 };
  const t = frame / fps;
  return {
    x: noise2D('hhx', t * 0.55, 0) * 0.55 * amount,
    y: noise2D('hhy', t * 0.5, 3) * 0.4 * amount,
    rotate: noise2D('hhr', t * 0.4, 7) * 0.45 * amount,
  };
}
