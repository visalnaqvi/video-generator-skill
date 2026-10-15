// Brush layer (p5.brush, standalone WebGL2 build): real pencil, charcoal, marker, pen and
// spray strokes, watercolour fills and hatching — tactile hand-made marks.
//
// Brush strokes are random by nature, so repainting them every frame would make them
// shimmer. Instead each mark is painted ONCE (fixed seed) into an image, cached, and
// revealed over time with a mask: lines draw on along their direction, rings and boxes
// draw round, fills bloom out. Same input → same video.

import React, { useEffect, useMemo, useState } from 'react';
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import * as brush from 'p5.brush/standalone';
import { useBrand } from '../BrandContext';
import { useUnit } from '../ui';
import type { BrushLayer, BrushMark } from './types';
import { ease, enterStyle, progress, resolveColor } from './util';

const BRUSHES: Record<string, string> = {
  pencil: 'HB', 'soft-pencil': '2B', 'hard-pencil': '2H', 'color-pencil': 'cpencil',
  pen: 'pen', fineliner: 'rotring', charcoal: 'charcoal', marker: 'marker', spray: 'spray',
};

type Pt = [number, number]; // % of the layer box
type Geo = { kind: 'open' | 'closed' | 'line'; pts: Pt[]; curve: number };

/** Mark → points in % of the layer box. Presets fill the mark's own box (x, y, w, h in %). */
function geometry(m: BrushMark): Geo {
  if (m.points?.length) return { kind: m.closed ? 'closed' : m.points.length === 2 ? 'line' : 'open', pts: m.points, curve: m.curve ?? 0.5 };
  const x = m.x ?? 5, y = m.y ?? 5, w = m.w ?? 90, h = m.h ?? 90;
  const P = (fx: number, fy: number): Pt => [x + fx * w, y + fy * h];
  switch (m.kind) {
    case 'underline': return { kind: 'open', pts: [P(0, 0.62), P(0.35, 0.42), P(0.7, 0.55), P(1, 0.36)], curve: 0.6 };
    case 'arrow': return { kind: 'open', pts: [P(0, 1), P(0.45, 0.4), P(0.95, 0.05)], curve: 0.5 };
    case 'check': return { kind: 'open', pts: [P(0, 0.55), P(0.36, 1), P(1, 0)], curve: 0.05 };
    case 'cross': return { kind: 'open', pts: [P(0, 0), P(1, 1)], curve: 0 };
    case 'scribble': return { kind: 'open', pts: Array.from({ length: 9 }, (_, i) => P(i / 8, i % 2 ? 0.2 : 0.8)), curve: 0.7 };
    case 'wave': return { kind: 'open', pts: Array.from({ length: 7 }, (_, i) => P(i / 6, i % 2 ? 0.25 : 0.75)), curve: 0.9 };
    case 'box': return { kind: 'closed', pts: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], curve: 0 };
    case 'blob': return { kind: 'closed', pts: Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; const r = 0.42 + 0.08 * Math.sin(i * 2.3); return P(0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r); }), curve: 0.8 };
    case 'ring':
    default: // a hand-drawn ellipse that overshoots its start, like a real pen circle
      return { kind: 'open', pts: Array.from({ length: 11 }, (_, i) => { const a = (-110 + i * 38) * (Math.PI / 180); return P(0.5 + Math.cos(a) * 0.48, 0.5 + Math.sin(a) * 0.46); }), curve: 0.8 };
  }
}

let ready = false;
const cache = new Map<string, Promise<string[]>>();

/** Paints each mark into its own transparent PNG (data URL). */
async function paint(marks: BrushMark[], colors: { stroke: string; fill?: string }[], W: number, H: number, seed: number): Promise<string[]> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W);
  canvas.height = Math.round(H);
  brush.load(canvas);
  if (!ready) { brush.scaleBrushes(6); ready = true; } // built-in brushes are tiny at 1080p; scale once (it multiplies)
  brush.angleMode(brush.DEGREES);
  const toPx = ([px, py]: Pt): [number, number, number] => [(px / 100) * W - W / 2, (py / 100) * H - H / 2, 1];
  const out: string[] = [];
  marks.forEach((m, i) => {
    brush.load(canvas);
    brush.clear();
    brush.seed(seed * 1000 + i);
    brush.noiseSeed(seed * 1000 + i);
    const g = geometry(m);
    const c = colors[i];
    brush.noFill(); brush.noHatch(); brush.noStroke();
    if (c.fill) {
      brush.fill(c.fill, m.fillOpacity ?? 150);
      brush.fillBleed(m.bleed ?? 0.25);
      brush.fillTexture(m.texture ?? 0.4, 0.4);
    }
    if (m.hatch) { brush.hatch(m.hatch.gap ?? 8, m.hatch.angle ?? 45); brush.hatchStyle(BRUSHES[m.brush ?? 'pencil'] ?? 'HB', c.stroke, m.weight ?? 1); }
    if (m.stroke !== 'none') brush.set(BRUSHES[m.brush ?? 'pencil'] ?? 'HB', c.stroke, m.weight ?? 1);
    const pts = g.pts.map(toPx);
    if (g.kind === 'closed') {
      brush.beginShape(g.curve);
      pts.forEach((p) => brush.vertex(p[0], p[1], p[2]));
      brush.endShape(true);
    } else if (g.kind === 'line' || g.curve === 0) {
      for (let k = 1; k < pts.length; k++) brush.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1]);
    } else {
      brush.spline(pts, g.curve);
    }
    if (m.kind === 'cross' && !m.points) { const [a, b] = [toPx([g.pts[1][0], g.pts[0][1]]), toPx([g.pts[0][0], g.pts[1][1]])]; brush.line(a[0], a[1], b[0], b[1]); }
    if (m.kind === 'arrow' && !m.points) { // arrowhead
      const tip = pts[pts.length - 1], prev = pts[pts.length - 2];
      const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), L = Math.min(W, H) * 0.12;
      for (const s of [-1, 1]) brush.line(tip[0], tip[1], tip[0] - Math.cos(ang + s * 0.5) * L, tip[1] - Math.sin(ang + s * 0.5) * L);
    }
    brush.render();
    out.push(canvas.toDataURL('image/png'));
  });
  return out;
}

/** CSS mask that reveals a mark: p = 0 hidden → 1 fully drawn. */
function revealMask(m: BrushMark, g: Geo, p: number, W: number, H: number): React.CSSProperties {
  if (p >= 1) return {};
  const xs = g.pts.map((q) => q[0]), ys = g.pts.map((q) => q[1]);
  const pad = 6;
  const bx = Math.min(...xs) - pad, by = Math.min(...ys) - pad, bw = Math.max(...xs) - Math.min(...xs) + pad * 2, bh = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const isFill = !!m.fill && m.stroke === 'none';
  const mode = m.reveal ?? (isFill ? 'bloom' : g.kind === 'closed' || m.kind === 'ring' || (!m.kind && !m.points) ? 'round' : 'draw');
  if (mode === 'fade') return { opacity: p };
  let img: string;
  if (mode === 'round') {
    const a = p * 370;
    img = `conic-gradient(from -110deg at 50% 50%, #000 ${a - 10}deg, transparent ${a}deg)`;
  } else if (mode === 'bloom') {
    img = `radial-gradient(circle at 50% 50%, #000 ${p * 75}%, transparent ${p * 75 + 18}%)`;
  } else {
    const [a, b] = [g.pts[0], g.pts[g.pts.length - 1]];
    const dir = { wipeRight: 90, wipeLeft: 270, wipeDown: 180, wipeUp: 0 }[mode as string] ?? (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * 180) / Math.PI;
    const e = 10;
    img = `linear-gradient(${dir}deg, #000 ${p * (100 + e) - e}%, transparent ${p * (100 + e)}%)`;
  }
  const size = `${(bw / 100) * W}px ${(bh / 100) * H}px`;
  const pos = `${(bx / 100) * W}px ${(by / 100) * H}px`;
  return {
    WebkitMaskImage: img, maskImage: img, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
    WebkitMaskSize: size, maskSize: size, WebkitMaskPosition: pos, maskPosition: pos,
  };
}

export const BrushL: React.FC<{ l: BrushLayer; Place: React.FC<{ l: BrushLayer; w?: number; h?: number; children: React.ReactNode }> }> = ({ l, Place }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const { brand } = useBrand();
  const W = (l.w ?? 800) * u, H = (l.h ?? 400) * u;
  const hex = (c: string | undefined, fb: string) => resolveColor(brand, c, fb).slice(0, 7);
  const colors = useMemo(() => l.marks.map((m) => ({ stroke: hex(m.color ?? l.color, brand.colors.ink.hex), fill: m.fill ? hex(m.fill, brand.colors.highlight?.hex ?? brand.colors.accent.hex) : undefined })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [l, brand]);
  const key = JSON.stringify([l.marks, colors, W, H, l.seed]);
  const [imgs, setImgs] = useState<string[] | null>(null);
  const [handle] = useState(() => delayRender('Painting brush layer'));
  useEffect(() => {
    if (!cache.has(key)) cache.set(key, paint(l.marks, colors, W, H, l.seed ?? 7));
    cache.get(key)!.then((r) => { setImgs(r); continueRender(handle); }).catch((e) => { console.error('[brush layer]', e); setImgs([]); continueRender(handle); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const geos = useMemo(() => l.marks.map(geometry), [l.marks]);
  const pOut = l.exit ? 1 - progress(frame, fps, l.exit) : 1;
  const stagger = l.stagger ?? 8;
  return (
    <Place l={{ ...l, enter: undefined, exit: undefined }} w={W} h={H}>
      <div style={{ position: 'relative', width: W, height: H, ...(l.exit ? enterStyle(l.exit.preset, pOut, u) : {}) }}>
        {imgs?.map((src, i) => {
          const m = l.marks[i];
          const at = m.at ?? (l.enter?.at ?? 0) + i * stagger;
          const dur = m.dur ?? l.enter?.dur ?? 18;
          const p = l.enter?.preset === 'none' ? 1 : Math.max(0, Math.min(1, ease.inOut(Math.max(0, Math.min(1, (frame - at) / dur)))));
          if (p <= 0) return null;
          return <img key={i} src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: m.blend ?? 'normal', ...revealMask(m, geos[i], p, W, H) }} />;
        })}
      </div>
    </Place>
  );
};
