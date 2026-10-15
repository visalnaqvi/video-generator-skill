import React from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { alpha, isDark, paint, Surface } from './brand';
import { useBrand } from './BrandContext';
import { MOTION } from './style';

/** Size unit: 1 at 1080 px on the short side, so templates work in every format. */
export const useUnit = () => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};
export const useIsWide = () => {
  const { width, height } = useVideoConfig();
  return width > height;
};

/** 0→1 spring starting `delay` frames into the scene, using the style's motion feel. */
export const useEnter = (delay = 0, kind: 'enter' | 'pop' | 'swipe' = 'enter') => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { style } = useBrand();
  const m = MOTION[style.motion];
  const config = kind === 'swipe' ? { damping: 30 } : m[kind === 'pop' ? 'pop' : 'enter'];
  return spring({ frame: frame - delay, fps, config });
};

/** Slide-up + fade style for an entrance value. */
export const rise = (p: number, distance = 40): React.CSSProperties => ({ opacity: Math.min(1, p), transform: `translateY(${(1 - p) * distance}px)` });

/** Heading text style at a base size (px at 1080), following the style's case, weight, tracking and scale. */
export const useHeading = () => {
  const { style, heading } = useBrand();
  const u = useUnit();
  return (size: number): React.CSSProperties => ({
    fontFamily: heading,
    fontWeight: style.headingWeight,
    fontSize: size * u * style.typeScale,
    letterSpacing: `${style.tracking}em`,
    textTransform: style.headingCase === 'upper' ? 'uppercase' : 'none',
    lineHeight: 1.12,
  });
};

/** The surface a scene actually uses after the style's surfaceMap, with its colours. */
export const useSurface = (surface: Surface) => {
  const { brand, style } = useBrand();
  const s = style.surfaceMap?.[surface] ?? surface;
  return { surface: s, ...paint(brand, s) };
};

const Backdrop: React.FC<{ surface: Surface }> = ({ surface }) => {
  const { brand, style } = useBrand();
  const u = useUnit();
  const frame = useCurrentFrame();
  const p = paint(brand, surface);
  const c = brand.colors;
  const line = alpha(p.dark ? '#ffffff' : c.ink.hex, p.dark ? 0.09 : 0.11);
  const glowColor = (c.highlight ?? c.accent).hex;
  switch (style.backdrop) {
    case 'gradient': {
      const to = p.dark ? (surface === 'secondary' ? c.primary.hex : (c.secondary ?? c.primary).hex) : c.surface.hex;
      return <AbsoluteFill style={{ background: `linear-gradient(160deg, ${p.bg} 20%, ${to} 120%)` }} />;
    }
    case 'glow':
      return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, ${alpha(glowColor, p.dark ? 0.35 : 0.25)} 0%, ${p.bg} 60%)`, backgroundColor: p.bg }} />;
    case 'mesh': {
      const d = Math.sin(frame / 40) * 40 * u;
      const blob = (color: string, x: number, y: number, r: number): React.CSSProperties => ({ position: 'absolute', left: `${x}%`, top: `${y}%`, width: r * u, height: r * u, borderRadius: '50%', background: color, filter: `blur(${140 * u}px)`, opacity: 0.6, transform: `translate(-50%,-50%) translate(${d}px, ${-d}px)` });
      return (
        <AbsoluteFill style={{ backgroundColor: p.bg, overflow: 'hidden' }}>
          <div style={blob(c.primary.hex, 15, 20, 900)} />
          <div style={blob(glowColor, 90, 55, 700)} />
          <div style={blob((c.secondary ?? c.primary).hex, 30, 95, 800)} />
        </AbsoluteFill>
      );
    }
    case 'grid':
      return <AbsoluteFill style={{ backgroundColor: p.bg, backgroundImage: `linear-gradient(${line} 2px, transparent 2px), linear-gradient(90deg, ${line} 2px, transparent 2px)`, backgroundSize: `${54 * u}px ${54 * u}px` }} />;
    case 'dots':
      return <AbsoluteFill style={{ backgroundColor: p.bg, backgroundImage: `radial-gradient(${alpha(p.dark ? '#ffffff' : c.ink.hex, 0.16)} ${4 * u}px, transparent ${4.5 * u}px)`, backgroundSize: `${44 * u}px ${44 * u}px` }} />;
    case 'grain':
      return (
        <AbsoluteFill style={{ backgroundColor: p.bg }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', opacity: p.dark ? 0.14 : 0.1 }}>
            <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 6} /></filter>
            <rect width="100%" height="100%" filter="url(#grain)" />
          </svg>
        </AbsoluteFill>
      );
    default:
      return <AbsoluteFill style={{ backgroundColor: p.bg }} />;
  }
};

/** Scene root: style backdrop for the (mapped) surface, content centred on top. */
export const Scene: React.FC<{ surface: Surface; style?: React.CSSProperties; children: React.ReactNode }> = ({ surface, style, children }) => {
  const s = useSurface(surface);
  return (
    <AbsoluteFill>
      <Backdrop surface={s.surface} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', ...style }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Card/panel look for the current style, with the text colours that read on it. */
export const useCard = (sceneSurface: Surface) => {
  const { brand, style } = useBrand();
  const u = useUnit();
  const scene = useSurface(sceneSurface);
  const c = brand.colors;
  const shadow = {
    none: 'none',
    soft: `0 ${20 * u}px ${50 * u}px rgba(0,0,0,${scene.dark ? 0.35 : 0.14})`,
    hard: `${12 * u}px ${12 * u}px 0 ${scene.dark ? '#000000' : c.ink.hex}`,
    glow: `0 0 ${70 * u}px ${alpha((c.highlight ?? c.accent).hex, 0.5)}`,
  }[style.shadow];
  const base: React.CSSProperties = { borderRadius: style.radius * u, boxShadow: shadow };
  const solidFill = scene.dark || scene.surface !== 'background' ? c.background.hex : c.surface.hex;

  switch (style.card) {
    case 'outline':
      return { style: { ...base, background: 'transparent', border: `${Math.max(1, style.border) * u}px solid ${alpha(scene.fg.slice(0, 7), 0.45)}` }, fg: scene.fg, sub: scene.sub, solid: false };
    case 'glass':
      return {
        style: { ...base, background: scene.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)', backdropFilter: `blur(${24 * u}px)`, border: `${2 * u}px solid rgba(255,255,255,${scene.dark ? 0.3 : 0.8})` },
        fg: scene.fg, sub: scene.sub, solid: false,
      };
    case 'brutal':
      return { style: { ...base, background: solidFill, border: `${Math.max(3, style.border) * u}px solid ${c.ink.hex}` }, fg: c.ink.hex, sub: c.muted.hex, solid: true };
    default:
      return { style: { ...base, background: solidFill }, fg: c.ink.hex, sub: c.muted.hex, solid: true };
  }
};

/** Brand logo; on a dark surface a light-only logo gets a white badge behind it. */
export const Logo: React.FC<{ size: number; onDark: boolean; style?: React.CSSProperties }> = ({ size, onDark, style }) => {
  const { brand } = useBrand();
  const src = brand.logo?.src;
  if (!src) return null;
  const needsBadge = onDark && brand.logo?.safeBackground === 'light';
  const img = <Img src={staticFile(src)} style={{ width: size, height: size, objectFit: 'contain' }} />;
  if (!needsBadge) return <div style={style}>{img}</div>;
  return <div style={{ background: '#ffffff', borderRadius: size * 0.28, padding: size * 0.14, display: 'inline-flex', ...style }}>{img}</div>;
};

export { isDark };
