// Physics layer (Matter.js): word cards, pills, icons and images that drop in, bounce,
// collide and stack on a floor, then can burst apart or fall out of frame.
//
// Remotion renders frames out of order and in parallel, so the simulation never runs in
// real time: the whole scene is simulated once from frame 0 with a fixed timestep and fixed
// body ids, cached, and each frame just reads its positions. Same input → same video.

import React, { useMemo } from 'react';
import Matter from 'matter-js';
import { Img, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { measureText } from '@remotion/layout-utils';
import * as Icons from 'lucide-react';
import { useBrand } from '../BrandContext';
import { useUnit } from '../ui';
import type { PhysicsBody, PhysicsLayer } from './types';
import { enterStyle, progress, resolveColor, useLayerFont } from './util';

type Spec = { w: number; h: number; round: number; circle: boolean; x: number; y: number; at: number; angle: number; spin: number; vx: number; vy: number; fixed: boolean };
type Track = Float32Array; // per frame: x, y, angle for each body (NaN until spawned)

const cache = new Map<string, Track[]>();

function simulate(specs: Spec[], l: PhysicsLayer, W: number, H: number, fps: number, total: number, u: number): Track[] {
  const C = Matter.Common as unknown as { _nextId: number; _seed: number };
  C._nextId = 0; // body ids decide collision order: reset them so every render matches
  C._seed = 0;
  const engine = Matter.Engine.create({ gravity: { x: 0, y: l.gravity ?? 1, scale: 0.0024 * u } });
  const world = engine.world;
  const thick = 400 * u;
  const floorY = ((l.floor ?? 88) / 100) * H;
  const [wl, wr] = (l.walls ?? [2, 98]).map((p) => (p / 100) * W);
  const floor = Matter.Bodies.rectangle(W / 2, floorY + thick / 2, W * 3, thick, { isStatic: true, friction: 0.8 });
  const walls = [
    Matter.Bodies.rectangle(wl - thick / 2, H / 2 - H, thick, H * 4, { isStatic: true }),
    Matter.Bodies.rectangle(wr + thick / 2, H / 2 - H, thick, H * 4, { isStatic: true }),
  ];
  Matter.Composite.add(world, l.floor === 0 ? walls : [floor, ...walls]);

  const bodies = specs.map((s) => {
    const opts: Matter.IChamferableBodyDefinition = {
      restitution: l.bounce ?? 0.3, friction: 0.6, frictionAir: l.air ?? 0.012, density: 0.002,
      angle: (s.angle * Math.PI) / 180, isStatic: s.fixed, chamfer: s.circle ? undefined : { radius: Math.min(s.round, s.h / 2 - 1, s.w / 2 - 1) },
    };
    return s.circle ? Matter.Bodies.circle(s.x, s.y, s.w / 2, opts) : Matter.Bodies.rectangle(s.x, s.y, s.w, s.h, opts);
  });

  const dt = 1000 / fps;
  const sub = Math.max(1, Math.ceil(dt / 8.4)); // small steps so fast bodies don't tunnel through each other
  const out: Track[] = [];
  const added = new Set<number>();
  for (let f = 0; f < total; f++) {
    specs.forEach((s, i) => {
      if (added.has(i) || f < s.at) return;
      added.add(i);
      Matter.Composite.add(world, bodies[i]);
      if (!s.fixed) {
        Matter.Body.setVelocity(bodies[i], { x: s.vx * u, y: s.vy * u });
        Matter.Body.setAngularVelocity(bodies[i], s.spin);
      }
    });
    if (l.burst && f === l.burst.at) {
      const bx = ((l.burst.x ?? 50) / 100) * W, by = ((l.burst.y ?? 70) / 100) * H, k = (l.burst.strength ?? 1) * 28 * u;
      bodies.forEach((b, i) => {
        if (!added.has(i) || specs[i].fixed) return;
        const dx = b.position.x - bx, dy = b.position.y - by, d = Math.hypot(dx, dy) || 1;
        Matter.Body.setVelocity(b, { x: (dx / d) * k, y: (dy / d) * k - k * 0.6 });
        Matter.Body.setAngularVelocity(b, (random(`burst${l.seed ?? 1}-${i}`) - 0.5) * 0.4);
      });
    }
    if (l.release !== undefined && f === l.release) Matter.Composite.remove(world, floor);
    const t = new Float32Array(specs.length * 3).fill(NaN);
    bodies.forEach((b, i) => { if (added.has(i)) { t[i * 3] = b.position.x; t[i * 3 + 1] = b.position.y; t[i * 3 + 2] = b.angle; } });
    out.push(t);
    for (let k = 0; k < sub; k++) Matter.Engine.update(engine, dt / sub);
  }
  Matter.Engine.clear(engine);
  return out;
}

export const PhysicsL: React.FC<{ l: PhysicsLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps, durationInFrames } = useVideoConfig();
  const u = useUnit();
  const { brand, heading, body: bodyFont, style } = useBrand();
  const family = useLayerFont(l.font, l.font === 'body' ? bodyFont : heading);
  const weight = l.weight ?? (l.font === 'body' ? 600 : style.headingWeight);
  const n = l.bodies.length;

  const specs = useMemo<Spec[]>(() => l.bodies.map((b, i) => {
    const s = (b.size ?? l.size ?? 64) * u;
    const iconW = b.icon ? s * 1.1 + (b.text ? s * 0.35 : 0) : 0;
    const textW = b.text ? measureText({ text: b.text, fontFamily: family, fontSize: s, fontWeight: String(weight), letterSpacing: 'normal' }).width : 0;
    const shape = b.shape ?? (b.image || (b.icon && !b.text) ? 'circle' : 'pill');
    const autoW = shape === 'circle' ? Math.max(textW, iconW, s * 1.6) + s * 0.9 : textW + iconW + s * 1.2;
    const w = b.w ? b.w * u : autoW;
    const h = shape === 'circle' ? w : b.h ? b.h * u : s * 1.7;
    const spread = n > 1 ? 12 + (76 * i) / (n - 1) : 50;
    return {
      w, h, circle: shape === 'circle', round: shape === 'pill' ? h / 2 : (b.radius ?? 18) * u,
      x: ((b.x ?? spread + (random(`px${l.seed ?? 1}-${i}`) - 0.5) * 8) / 100) * W,
      y: b.y !== undefined ? (b.y / 100) * H : -h - (random(`py${l.seed ?? 1}-${i}`) * 0.15 * H),
      at: b.at ?? (l.at ?? 0) + i * (l.stagger ?? 6),
      angle: b.angle ?? (random(`pa${l.seed ?? 1}-${i}`) - 0.5) * 30,
      spin: b.spin ?? (random(`ps${l.seed ?? 1}-${i}`) - 0.5) * 0.06,
      vx: b.vx ?? 0, vy: b.vy ?? 0, fixed: !!b.fixed,
    };
  }), [l, u, W, H, family, weight, n]);

  const track = useMemo(() => {
    const key = JSON.stringify([specs, l.gravity, l.bounce, l.air, l.floor, l.walls, l.burst, l.release, l.seed, W, H, fps, durationInFrames]);
    let t = cache.get(key);
    if (!t) { t = simulate(specs, l, W, H, fps, durationInFrames, u); cache.set(key, t); }
    return t;
  }, [specs, l, W, H, fps, durationInFrames, u]);

  const now = track[Math.min(frame, track.length - 1)] ?? track[0];
  const pOut = l.exit ? 1 - progress(frame, fps, l.exit) : 1;
  const shadow = l.shadow === 'none' ? 'none' : l.shadow === 'hard' ? `${10 * u}px ${10 * u}px 0 rgba(0,0,0,0.85)` : `0 ${14 * u}px ${34 * u}px rgba(0,0,0,0.25)`;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: l.opacity ?? 1, mixBlendMode: l.blend ?? 'normal', ...(l.exit ? enterStyle(l.exit.preset, pOut, u) : {}) }}>
      {l.bodies.map((b: PhysicsBody, i) => {
        const x = now[i * 3], y = now[i * 3 + 1], a = now[i * 3 + 2];
        if (Number.isNaN(x)) return null;
        const s = specs[i];
        const fill = resolveColor(brand, b.fill ?? l.fill, brand.colors.primary.hex);
        const color = resolveColor(brand, b.color ?? l.color, '#ffffff');
        const stroke = b.stroke ?? l.stroke;
        const fs = (b.size ?? l.size ?? 64) * u;
        const Comp = b.icon ? (Icons as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>>)[b.icon] ?? Icons.Circle : null;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, width: s.w, height: s.h, transform: `translate(-50%, -50%) rotate(${a}rad)`,
            borderRadius: s.circle ? '50%' : s.round, background: fill, boxShadow: shadow, overflow: 'hidden',
            border: stroke ? `${(l.strokeWidth ?? 4) * u}px solid ${resolveColor(brand, stroke)}` : undefined, boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fs * 0.35,
            fontFamily: family, fontWeight: weight, fontSize: fs, lineHeight: 1, color, whiteSpace: 'nowrap',
          }}>
            {b.image && <Img src={staticFile(b.image === 'logo' ? brand.logo?.src ?? '' : b.image)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: b.image === 'logo' ? 'contain' : 'cover', padding: b.image === 'logo' ? s.w * 0.15 : 0, boxSizing: 'border-box' }} />}
            {Comp && <Comp size={fs * 1.1} color={color} strokeWidth={2.2} />}
            {b.text && <span>{b.text}</span>}
          </div>
        );
      })}
    </div>
  );
};
