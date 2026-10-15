// Scene lighting for composed scenes — universe-neutral (works on any rig, cut-out or drawn prop):
//   lights      point lamps / headlights / phone screens and a soft directional "moon"; flicker, blink, switch-on
//   lit layers  ambient tint (the scene's light level) + rounded diffuse shading toward each light + rim light
//               on the edge that faces the strongest lights (SVG filter on the layer's own alpha)
//   shadows     contact shadow at the feet + the layer's silhouette cast on the ground away from the key light
//   haze        far layers fade toward the atmosphere colour; depth of field blurs layers away from focus
//   visible     glows (bloom) and beams (light cones) drawn over or under the layers
import React, { createContext, useContext } from 'react';
import { interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { useBrand } from '../BrandContext';
import { useUnit } from '../ui';
import type { CastShadow, ComposedProps, Light } from './types';
import { resolveColor } from './util';
import { CamCtx } from './camctx';

type RGB = [number, number, number];
export type LiveLight = { id: string; kind: 'point' | 'moon'; x: number; y: number; rgb: RGB; hex: string; k: number; radius: number; src: Light };
export type SceneLight = {
  lights: LiveLight[];
  ambient: { rgb: RGB; amount: number } | null;
  haze: { rgb: RGB; amount: number } | null;
  focus: { z: number; blur: number } | null;
};

export const LightCtx = createContext<SceneLight>({ lights: [], ambient: null, haze: null, focus: null });

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function rgbOf(hex: string): RGB {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255) as RGB;
}
const css = ([r, g, b]: RGB, k = 1) => `rgb(${[r, g, b].map((c) => Math.round(clamp(c * k) * 255)).join(',')})`;

/** Each light's intensity this frame (switch-on ramp × flicker × blink). */
function intensityAt(l: Light, id: string, frame: number) {
  let k = l.intensity ?? 0.8;
  if (l.at !== undefined) k *= interpolate(frame, [l.at, l.at + (l.dur ?? 8)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (l.flicker) {
    const n = (noise2D(`fl-${id}`, frame * 0.09, 0) + 1) / 2;
    const dip = random(`dip-${id}-${Math.floor(frame / 3)}`) < l.flicker * 0.12 ? 0.35 : 1;
    k *= (1 - l.flicker * 0.5 * n) * dip;
  }
  if (l.blink) k *= frame % l.blink < l.blink * 0.4 ? 1 : 0.04;
  return k;
}

/** Evaluates the scene's lights for this frame (called once per scene). */
export function useSceneLight(p: Pick<ComposedProps, 'lights' | 'ambient' | 'atmosphere' | 'focus'>): SceneLight {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const u = useUnit();
  const { brand } = useBrand();
  const lights = (p.lights ?? []).map((l, i): LiveLight => {
    const id = l.id ?? `L${i}`;
    const hex = resolveColor(brand, l.color, '#fff4dc');
    return { id, kind: l.kind ?? 'point', x: (l.x / 100) * width, y: (l.y / 100) * height, rgb: rgbOf(hex), hex, k: intensityAt(l, id, frame), radius: (l.radius ?? 700) * u, src: l };
  });
  return {
    lights,
    ambient: p.ambient ? { rgb: rgbOf(resolveColor(brand, p.ambient.color, '#3a4a78')), amount: p.ambient.amount ?? 0.5 } : null,
    haze: p.atmosphere ? { rgb: rgbOf(resolveColor(brand, p.atmosphere.color, '#1c2a48')), amount: p.atmosphere.amount ?? 0.5 } : null,
    focus: p.focus ? {
      z: p.focus.to === undefined ? p.focus.z
        : interpolate(frame, [p.focus.at ?? 0, (p.focus.at ?? 0) + (p.focus.dur ?? 18)], [p.focus.z, p.focus.to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (x) => x * x * (3 - 2 * x) }),
      blur: p.focus.blur ?? 8,
    } : null,
  };
}

/** How strongly a light reaches a point (0–1+), with its colour. */
function reach(L: LiveLight, px: number, py: number) {
  if (L.kind === 'moon') return L.k;
  const d = Math.hypot(L.x - px, L.y - py);
  return L.k * Math.pow(clamp(1 - d / L.radius), 1.4);
}

export type Box = { left: number; top: number; w: number; h: number };

/** SVG filter for one layer: ambient tint + haze (colour matrix), diffuse shading per light, rim light.
 *  Returns null when there is nothing to do. Coordinates are the layer box's own px. */
export function LayerFilter({ id, sl, box, lit, rim, haze }: { id: string; sl: SceneLight; box: Box | null; lit: boolean; rim: boolean; haze: number }) {
  const amb = lit ? sl.ambient : null;
  const H = sl.haze?.rgb ?? [0, 0, 0];
  const M: RGB = amb ? (amb.rgb.map((c) => 1 - amb.amount + amb.amount * c) as RGB) : [1, 1, 1];
  const matrix = [0, 1, 2].map((c) => [0, 1, 2].map((j) => (j === c ? (M[c] * (1 - haze)).toFixed(4) : '0')).join(' ') + ` 0 ${(haze * H[c]).toFixed(4)}`).join('  ') + '  0 0 0 1 0';
  const parts: React.ReactNode[] = [<feColorMatrix key="g" in="SourceGraphic" type="matrix" values={matrix} result="graded" />];
  let out = 'graded';
  if (lit && box && sl.lights.length) {
    const cx = box.left + box.w / 2, cy = box.top + box.h / 2;
    const near = sl.lights.map((L) => ({ L, c: reach(L, cx, cy) })).filter((x) => x.c > 0.02).sort((a, b) => b.c - a.c).slice(0, 3);
    if (near.length) {
      const S = Math.max(box.w, box.h);
      parts.push(<feGaussianBlur key="bump" in="SourceAlpha" stdDeviation={box.w * 0.03} result="bump" />);
      near.forEach(({ L, c }, i) => {
        const lx = L.x - box.left, ly = L.y - box.top;
        const col = css(L.rgb, clamp(c * 1.1, 0, 1.4));
        parts.push(
          <feDiffuseLighting key={`d${i}`} in="bump" surfaceScale={box.w * 0.05} diffuseConstant={1} lightingColor={col} result={`d${i}`}>
            {L.kind === 'moon'
              ? <feDistantLight azimuth={(Math.atan2(ly - box.h / 2, lx - box.w / 2) * 180) / Math.PI} elevation={38} />
              : <fePointLight x={lx} y={ly} z={S * 0.45} />}
          </feDiffuseLighting>,
        );
      });
      let sum = 'd0';
      for (let i = 1; i < near.length; i++) {
        parts.push(<feComposite key={`s${i}`} in={sum} in2={`d${i}`} operator="arithmetic" k2={1} k3={1} result={`s${i}`} />);
        sum = `s${i}`;
      }
      // Lit = graded + graded × light (the ambient tint is the unlit level; light lifts the side facing it).
      parts.push(<feComposite key="lit" in="graded" in2={sum} operator="arithmetic" k1={amb ? 0.95 : 0.5} k2={1} result="litRaw" />);
      parts.push(<feComposite key="litc" in="litRaw" in2="SourceAlpha" operator="in" result="lit" />);
      out = 'lit';
      // Rim light on the edge facing the two strongest lights.
      near.slice(0, rim ? 2 : 0).forEach(({ L, c }, i) => {
        if (c < 0.12) return;
        const dx = L.x - cx, dy = L.y - cy, n = Math.hypot(dx, dy) || 1;
        const rw = Math.max(3, box.w * 0.024);
        parts.push(
          <feOffset key={`ro${i}`} in="SourceAlpha" dx={(-dx / n) * rw} dy={(-dy / n) * rw} result={`ro${i}`} />,
          <feComposite key={`re${i}`} in="SourceAlpha" in2={`ro${i}`} operator="out" result={`re${i}`} />,
          <feGaussianBlur key={`rb${i}`} in={`re${i}`} stdDeviation={rw * 0.3} result={`rb${i}`} />,
          <feFlood key={`rf${i}`} floodColor={css(L.rgb, 1.15)} floodOpacity={clamp(c * 1.05, 0, 0.85)} result={`rf${i}`} />,
          <feComposite key={`rc${i}`} in={`rf${i}`} in2={`rb${i}`} operator="in" result={`rc${i}`} />,
          <feComposite key={`rk${i}`} in={`rc${i}`} in2="SourceAlpha" operator="in" result={`rk${i}`} />,
          <feComposite key={`rm${i}`} in={out} in2={`rk${i}`} operator="arithmetic" k2={1} k3={1} result={`rm${i}`} />,
        );
        out = `rm${i}`;
      });
    }
  }
  if (out === 'graded' && haze <= 0.001 && !amb) return null;
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
          {parts}
          {out !== 'graded' && <feMerge><feMergeNode in={out} /></feMerge>}
        </filter>
      </defs>
    </svg>
  );
}

/** Where each `under` light draws: after layer index i = the last layer of the leading run with z ≤ light z (-1 = before all). */
export function underSlots(lights: ComposedProps['lights'], layers: ComposedProps['layers']): Map<number, string[]> {
  const slots = new Map<number, string[]>();
  (lights ?? []).forEach((L, n) => {
    if (!L.under) return;
    const z = L.z ?? 0.3;
    let i = -1;
    while (i + 1 < layers.length && (layers[i + 1].z ?? 0.5) <= z) i++;
    const id = L.id ?? `L${n}`;
    slots.set(i, [...(slots.get(i) ?? []), id]);
  });
  return slots;
}

/** Contact shadow + cast shadow on the ground, drawn behind the layer. `children` is the layer art (silhouetted). */
export function GroundShadows({ sl, box, feet, cfg, children }: { sl: SceneLight; box: Box; feet: number; cfg: true | CastShadow; children: React.ReactNode }) {
  const o = cfg === true ? {} : cfg;
  const fx = box.left + box.w / 2, fy = box.top + (box.h * feet) / 100;
  const key = sl.lights.filter((L) => L.src.castShadows !== false).map((L) => ({ L, c: reach(L, fx, fy - box.h * 0.4) })).sort((a, b) => b.c - a.c)[0];
  const ambientDark = sl.ambient ? 0.55 + 0.25 * sl.ambient.amount : 0.6;
  const contact = (
    <div style={{ position: 'absolute', left: '50%', top: `${feet}%`, width: box.w * 0.7, height: box.w * 0.12, transform: 'translate(-50%, -55%)', borderRadius: '50%', background: `radial-gradient(closest-side, rgba(0,0,0,${ambientDark}), rgba(0,0,0,${ambientDark * 0.5}) 55%, transparent)` }} />
  );
  if (!key || key.c < 0.05 || o.contactOnly) return contact;
  const { L, c } = key;
  const front = o.dir ? o.dir === 'front' : L.y < fy;
  const elev = Math.abs(fy - L.y) / (box.h * 2.2);
  const len = o.length ?? clamp(1.0 - elev * 0.9, 0.22, 1.05) * (front ? 0.55 : 0.75);
  const ang = clamp((Math.atan2(fx - L.x, Math.abs(fy - L.y) + box.h * 0.6) * 180) / Math.PI, -62, 62);
  const op = o.opacity ?? clamp(c * 0.9, 0.12, 0.62);
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `50% ${feet}%`, transform: `scaleY(${front ? -len : len}) skewX(${-ang}deg)`, opacity: op, filter: `brightness(0) blur(${3 + len * 7}px)`, WebkitMaskImage: `linear-gradient(to top, transparent ${100 - feet - 1}%, #000 ${100 - feet}%, rgba(0,0,0,0.15) 100%)`, maskImage: `linear-gradient(to top, transparent ${100 - feet - 1}%, #000 ${100 - feet}%, rgba(0,0,0,0.15) 100%)` }}>
        {children}
      </div>
      {contact}
    </>
  );
}

/** Visible light: bloom around sources and light cones. `under` lights draw at their own depth (after the
 *  layers at or behind their z, e.g. a town glow over the sky but behind the character); the rest draw over all layers.
 *  `ids` limits the view to some lights. */
export const LightsView: React.FC<{ under: boolean; ids?: string[] }> = ({ under, ids }) => {
  const sl = useContext(LightCtx);
  const cam = useContext(CamCtx);
  const u = useUnit();
  const frame = useCurrentFrame();
  const items = sl.lights.filter((L) => !!L.src.under === under && (!ids || ids.includes(L.id)) && L.k > 0.01 && (L.src.glow || L.src.beam));
  if (!items.length) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen' }}>
      {items.map((L) => {
        const depth = ((L.src.z ?? 0.3) - 0.5) * cam.parallax;
        const x = L.x + cam.dx * depth, y = L.y + cam.dy * depth;
        const g = (L.src.glow ?? 0) * u;
        const b = L.src.beam;
        const len = (b?.length ?? 900) * u, spread = b?.spread ?? 28;
        const shimmer = 0.92 + 0.08 * noise2D(`bm-${L.id}`, frame * 0.05, 1);
        return (
          <React.Fragment key={L.id}>
            {b && (
              <svg style={{ position: 'absolute', left: x - len, top: y - len, width: len * 2, height: len * 2, overflow: 'visible', opacity: clamp(L.k * (b.opacity ?? 0.5) * shimmer, 0, 1) }}>
                <defs>
                  <radialGradient id={`bg-${L.id}`} cx={len} cy={len} r={len} gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor={L.hex} stopOpacity={0.9} />
                    <stop offset="0.45" stopColor={L.hex} stopOpacity={0.35} />
                    <stop offset="1" stopColor={L.hex} stopOpacity={0} />
                  </radialGradient>
                  <filter id={`bf-${L.id}`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={14 * u} /></filter>
                </defs>
                <path
                  d={(() => {
                    const a0 = ((b.angle - spread / 2) * Math.PI) / 180, a1 = ((b.angle + spread / 2) * Math.PI) / 180, w0 = 10 * u;
                    const n = (b.angle * Math.PI) / 180 + Math.PI / 2;
                    return `M${len + Math.cos(n) * w0},${len + Math.sin(n) * w0} L${len + Math.cos(a1) * len},${len + Math.sin(a1) * len} L${len + Math.cos(a0) * len},${len + Math.sin(a0) * len} L${len - Math.cos(n) * w0},${len - Math.sin(n) * w0} Z`;
                  })()}
                  fill={`url(#bg-${L.id})`}
                  filter={`url(#bf-${L.id})`}
                />
              </svg>
            )}
            {g > 0 && (
              <>
                <div style={{ position: 'absolute', left: x - g * (L.src.glowAspect ?? 1), top: y - g, width: g * 2 * (L.src.glowAspect ?? 1), height: g * 2, borderRadius: '50%', background: `radial-gradient(closest-side, ${L.hex}, transparent)`, opacity: clamp(L.k * 0.75) }} />
                {L.kind === 'point' && <div style={{ position: 'absolute', left: x - g * 0.18, top: y - g * 0.18, width: g * 0.36, height: g * 0.36, borderRadius: '50%', background: `radial-gradient(closest-side, #ffffff, ${L.hex} 45%, transparent)`, opacity: clamp(L.k) }} />}
              </>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
