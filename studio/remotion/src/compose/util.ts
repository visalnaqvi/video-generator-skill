import React, { useEffect, useState } from 'react';
import { continueRender, delayRender, Easing, interpolate, spring } from 'remotion';
import { getAvailableFonts } from '@remotion/google-fonts';
import type { Brand } from '../brand';
import type { Color, EnterPreset, Loop, Motion } from './types';

/** Brand role → hex; also accepts white/black/transparent/hex. */
export function resolveColor(brand: Brand, c: Color | undefined, fallback = '#000000'): string {
  if (!c) return fallback;
  if (c.startsWith('#') || c.startsWith('rgb')) return c;
  if (c === 'white') return '#ffffff';
  if (c === 'black') return '#000000';
  if (c === 'transparent') return 'transparent';
  const m = c.match(/^(\w+)(?:\/(\d+))?$/); // "primary/40" = primary at 40% opacity
  const role = m?.[1] as keyof Brand['colors'];
  const hex = role === ('white' as never) ? '#ffffff' : role === ('black' as never) ? '#000000' : brand.colors[role]?.hex;
  if (!hex) return fallback;
  if (m?.[2]) return hex + Math.round((Number(m[2]) / 100) * 255).toString(16).padStart(2, '0');
  return hex;
}

/** Extra Google fonts for layers (handwriting, mono, serif), loaded once per family. */
const FONT_CHOICES: Record<string, { family: string; weights: string[] }> = {
  hand: { family: 'Caveat', weights: ['500', '700'] },
  mono: { family: 'JetBrains Mono', weights: ['500', '700'] },
  serif: { family: 'Playfair Display', weights: ['600', '800'] },
};
const loaded = new Map<string, Promise<string>>();
export function useLayerFont(kind: string | undefined, fallback: string): string {
  const choice = kind ? FONT_CHOICES[kind] : undefined;
  const [family, setFamily] = useState<string | null>(choice ? null : fallback);
  const [handle] = useState(() => (choice ? delayRender(`font ${choice.family}`) : null));
  useEffect(() => {
    if (!choice || handle === null) return;
    if (!loaded.has(choice.family)) {
      const entry = getAvailableFonts().find((f) => f.fontFamily === choice.family);
      loaded.set(choice.family, entry
        ? entry.load().then(async (mod) => {
            const r = mod.loadFont('normal', { weights: choice.weights, subsets: ['latin'] } as never) as { fontFamily: string; waitUntilDone?: () => Promise<unknown> };
            await r.waitUntilDone?.();
            return `${r.fontFamily}, ${fallback}`;
          })
        : Promise.resolve(fallback));
    }
    loaded.get(choice.family)!.then((f) => { setFamily(f); continueRender(handle); });
  }, [choice, handle, fallback]);
  return family ?? fallback;
}

/** 0→1 progress for a motion at the current frame. */
export function progress(frame: number, fps: number, m: Motion | undefined, bouncy = false): number {
  if (!m || m.preset === 'none') return 1;
  const at = m.at ?? 0;
  const dur = m.dur ?? 18;
  if (m.preset === 'slam' || m.preset === 'pop') {
    return spring({ frame: frame - at, fps, config: m.preset === 'slam' ? { damping: 13, stiffness: 220, mass: 0.7 } : { damping: bouncy ? 9 : 14, stiffness: 200 }, durationInFrames: Math.max(dur, 12) });
  }
  return interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) });
}

/** CSS for an enter preset at progress p (0 hidden → 1 settled). */
export function enterStyle(preset: EnterPreset, p: number, u: number): React.CSSProperties {
  const q = 1 - p;
  switch (preset) {
    case 'fade': return { opacity: p };
    case 'rise': return { opacity: p, transform: `translateY(${q * 80 * u}px)` };
    case 'drop': return { opacity: p, transform: `translateY(${-q * 80 * u}px)` };
    case 'slideLeft': return { opacity: p, transform: `translateX(${q * 160 * u}px)` };
    case 'slideRight': return { opacity: p, transform: `translateX(${-q * 160 * u}px)` };
    case 'pop': return { opacity: Math.min(1, p * 3), transform: `scale(${0.4 + 0.6 * p})` };
    case 'slam': return { opacity: Math.min(1, p * 4), transform: `scale(${interpolate(p, [0, 1], [2.6, 1])})` };
    case 'blurIn': return { opacity: p, filter: `blur(${q * 30 * u}px)`, transform: `scale(${1 + q * 0.15})` };
    case 'zoomOut': return { opacity: p, transform: `scale(${1 + q * 0.6})` };
    case 'spinIn': return { opacity: p, transform: `rotate(${-q * 180}deg) scale(${0.3 + 0.7 * p})` };
    case 'flipUp': return { opacity: p, transform: `perspective(${1200 * u}px) rotateX(${q * 85}deg)`, transformOrigin: 'bottom' };
    case 'maskUp': return { clipPath: `inset(${q * 100}% 0 0 0)`, transform: `translateY(${q * 30 * u}px)` };
    case 'maskDown': return { clipPath: `inset(0 0 ${q * 100}% 0)` };
    case 'maskLeft': return { clipPath: `inset(0 0 0 ${q * 100}%)` };
    case 'maskRight': return { clipPath: `inset(0 ${q * 100}% 0 0)` };
    default: return {};
  }
}

/** Continuous motion after entering. */
export function loopStyle(loop: Loop | undefined, frame: number, u: number): React.CSSProperties {
  switch (loop) {
    case 'float': return { transform: `translateY(${Math.sin(frame / 18) * 12 * u}px)` };
    case 'pulse': return { transform: `scale(${1 + Math.max(0, Math.sin(frame / 7)) * 0.05})` };
    case 'sway': return { transform: `rotate(${Math.sin(frame / 22) * 3}deg)` };
    case 'spin': return { transform: `rotate(${frame * 1.5}deg)` };
    case 'breathe': return { transform: `scale(${1 + Math.sin(frame / 25) * 0.025})` };
    default: return {};
  }
}

/** Merge transforms from several style objects (CSS would otherwise overwrite). */
export function mergeStyles(...styles: React.CSSProperties[]): React.CSSProperties {
  const out: React.CSSProperties = {};
  const transforms: string[] = [];
  const filters: string[] = [];
  for (const s of styles) {
    const { transform, filter, opacity, ...rest } = s;
    Object.assign(out, rest);
    if (transform) transforms.push(String(transform));
    if (filter) filters.push(String(filter));
    if (opacity !== undefined) out.opacity = (out.opacity === undefined ? 1 : Number(out.opacity)) * Number(opacity);
  }
  if (transforms.length) out.transform = transforms.join(' ');
  if (filters.length) out.filter = filters.join(' ');
  return out;
}

export const ease = { inOut: Easing.inOut(Easing.cubic), out: Easing.out(Easing.cubic), in: Easing.in(Easing.cubic), linear: Easing.linear };
