import React from 'react';
import { AbsoluteFill, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { useBrand } from '../BrandContext';
import { useUnit } from '../ui';
import type { Background, ComposedProps, Effect } from './types';
import { CamCtx, LayerView } from './layers';
import { LightCtx, LightsView, underSlots, useSceneLight } from './light';
import { handheld, shotCamera } from './camera';
import { ease, resolveColor } from './util';

// ---------- background ----------
const Bg: React.FC<{ bg?: Background }> = ({ bg }) => {
  const { brand } = useBrand();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const u = useUnit();
  const c = brand.colors;
  const cols = (bg?.colors ?? []).map((x) => resolveColor(brand, x));
  const kind = bg?.kind ?? 'solid';
  const a = (bg?.angle ?? 160) + (bg?.animate ? frame * 0.15 : 0);
  switch (kind) {
    case 'gradient':
      return <AbsoluteFill style={{ background: `linear-gradient(${a}deg, ${(cols.length ? cols : [c.secondary?.hex ?? c.primary.hex, c.primary.hex]).join(', ')})` }} />;
    case 'radial': {
      const [inner, outer] = cols.length >= 2 ? cols : [c.primary.hex, c.secondary?.hex ?? '#000'];
      const pulse = bg?.animate ? Math.sin(frame / 30) * 5 : 0;
      return <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${40 + pulse}%, ${inner} 0%, ${outer} 70%)` }} />;
    }
    case 'mesh': {
      const [b0, b1, b2, b3] = cols.length >= 4 ? cols : [c.secondary?.hex ?? '#000', c.primary.hex, (c.highlight ?? c.accent).hex, c.primary.hex];
      const d = Math.sin(frame / 40) * 50 * u;
      const blob = (col: string, x: number, y: number, r: number) => <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: r * u, height: r * u, borderRadius: '50%', background: col, filter: `blur(${150 * u}px)`, opacity: 0.75, transform: `translate(-50%,-50%) translate(${d}px, ${-d}px)` }} />;
      return <AbsoluteFill style={{ background: b0, overflow: 'hidden' }}>{blob(b1, 10, 15, 1000)}{blob(b2, 95, 60, 760)}{blob(b3, 25, 100, 900)}</AbsoluteFill>;
    }
    case 'paper':
    case 'grid-paper':
    case 'lined-paper': {
      const paper = cols[0] ?? '#fbfaf5';
      const line = cols[1] ?? 'rgba(59, 87, 164, 0.16)';
      const grid = kind === 'grid-paper'
        ? `linear-gradient(${line} ${1.5 * u}px, transparent ${1.5 * u}px), linear-gradient(90deg, ${line} ${1.5 * u}px, transparent ${1.5 * u}px)`
        : kind === 'lined-paper' ? `linear-gradient(${line} ${2 * u}px, transparent ${2 * u}px)` : 'none';
      return (
        <AbsoluteFill style={{ backgroundColor: paper, backgroundImage: grid, backgroundSize: kind === 'grid-paper' ? `${44 * u}px ${44 * u}px` : `100% ${62 * u}px` }}>
          {kind === 'lined-paper' && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 130 * u, width: 3 * u, background: 'rgba(237,50,55,0.35)' }} />}
          <svg width="100%" height="100%" style={{ position: 'absolute', opacity: 0.35, mixBlendMode: 'multiply' }}>
            <filter id="paperTex"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed={4} /><feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.35 0" /></filter>
            <rect width="100%" height="100%" filter="url(#paperTex)" />
          </svg>
        </AbsoluteFill>
      );
    }
    case 'photo': {
      const z = interpolate(frame, [0, durationInFrames], [1.05, 1.15]);
      return (
        <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>
          {bg?.image && <Img src={staticFile(bg.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z})`, filter: `blur(${(bg.blur ?? 0) * u}px) ${bg.treatment === 'grayscale' || bg.treatment === 'duotone' ? 'grayscale(1)' : ''}` }} />}
          {bg?.treatment === 'duotone' && <AbsoluteFill style={{ background: c.primary.hex, mixBlendMode: 'multiply' }} />}
          <AbsoluteFill style={{ background: `rgba(0,0,0,${bg?.dim ?? 0.35})` }} />
        </AbsoluteFill>
      );
    }
    case 'stripes':
      return <AbsoluteFill style={{ background: `repeating-linear-gradient(${a}deg, ${cols[0] ?? c.primary.hex} 0 ${60 * u}px, ${cols[1] ?? c.secondary?.hex ?? '#000'} ${60 * u}px ${120 * u}px)` }} />;
    default:
      return <AbsoluteFill style={{ background: cols[0] ?? c.background.hex }} />;
  }
};

// ---------- effects ----------
const Fx: React.FC<{ fx: Effect }> = ({ fx }) => {
  const frame = useCurrentFrame();
  const { brand } = useBrand();
  const u = useUnit();
  switch (fx.kind) {
    case 'grain':
      return (
        <AbsoluteFill style={{ opacity: fx.amount ?? 0.12, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
          <svg width="100%" height="100%"><filter id={`g${frame % 4}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 9} /></filter><rect width="100%" height="100%" filter={`url(#g${frame % 4})`} /></svg>
        </AbsoluteFill>
      );
    case 'vignette':
      return <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${fx.amount ?? 0.55}) 100%)`, pointerEvents: 'none' }} />;
    case 'lightSweep': {
      const at = fx.at ?? 0, dur = fx.dur ?? 24;
      const p = interpolate(frame, [at, at + dur], [-0.4, 1.4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.inOut });
      if (frame < at || frame > at + dur) return null;
      const col = resolveColor(brand, fx.color, '#ffffff');
      return <AbsoluteFill style={{ background: `linear-gradient(${fx.angle ?? 110}deg, transparent ${p * 100 - 12}%, ${col} ${p * 100}%, transparent ${p * 100 + 12}%)`, opacity: fx.opacity ?? 0.35, mixBlendMode: 'overlay', pointerEvents: 'none' }} />;
    }
    case 'lightLeak': {
      const at = fx.at ?? 0, dur = fx.dur ?? 40;
      const t = interpolate(frame, [at, at + dur * 0.4, at + dur], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      if (t <= 0) return null;
      const cols = (fx.colors ?? ['highlight', 'accent']).map((x) => resolveColor(brand, x, '#ffaa55'));
      const drift = (frame - at) * 6 * u;
      return (
        <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: t * (fx.opacity ?? 0.8), pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', left: -300 * u + drift, top: -200 * u, width: 1100 * u, height: 1100 * u, borderRadius: '50%', background: `radial-gradient(circle, ${cols[0]} 0%, transparent 65%)`, filter: `blur(${60 * u}px)` }} />
          <div style={{ position: 'absolute', right: -200 * u + drift * 0.5, bottom: -300 * u, width: 900 * u, height: 900 * u, borderRadius: '50%', background: `radial-gradient(circle, ${cols[1] ?? cols[0]} 0%, transparent 65%)`, filter: `blur(${70 * u}px)` }} />
        </AbsoluteFill>
      );
    }
    case 'flash': {
      const dur = fx.dur ?? 6;
      const t = interpolate(frame, [fx.at, fx.at + 1, fx.at + dur], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return t > 0 ? <AbsoluteFill style={{ background: resolveColor(brand, fx.color, '#ffffff'), opacity: t * 0.85, pointerEvents: 'none' }} /> : null;
    }
    case 'scanlines':
      return <AbsoluteFill style={{ backgroundImage: `repeating-linear-gradient(0deg, rgba(0,0,0,${fx.amount ?? 0.08}) 0 ${2 * u}px, transparent ${2 * u}px ${6 * u}px)`, pointerEvents: 'none' }} />;
    default:
      return null;
  }
};

// ---------- scene ----------
const SceneBody: React.FC<ComposedProps> = ({ background, layers, camera, effects = [], lights, ambient, atmosphere, focus }) => {
  const sceneLight = useSceneLight({ lights, ambient, atmosphere, focus });
  const slots = underSlots(lights, layers);
  const frame = useCurrentFrame();
  const { durationInFrames, width, height, fps } = useVideoConfig();
  const u = useUnit();
  const from = { zoom: 1, x: 0, y: 0, rotate: 0, tiltX: 0, tiltY: 0, ...camera?.from };
  const to = { ...from, ...camera?.to };
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: 'clamp', easing: ease[camera?.ease ?? 'inOut'] });
  // a framed shot (camera.target + shot) replaces the from/to move; hand-held drift rides on either
  const framed = shotCamera(camera, layers, frame, t, fps, width, height, u);
  const hh = handheld(camera?.handheld, frame, fps);
  const drift: Record<string, number> = { x: hh.x, y: hh.y, rotate: hh.rotate };
  const lerp = (k: keyof typeof from) => (framed ? framed[k] : from[k] + (to[k] - from[k]) * t) + (drift[k] ?? 0);
  let sx = 0, sy = 0;
  for (const s of camera?.shake ?? []) {
    const f = s.frames ?? 10;
    if (frame >= s.at && frame < s.at + f) {
      const k = (1 - (frame - s.at) / f) * (s.intensity ?? 1) * 22 * u;
      sx += (random(`sx${frame}`) - 0.5) * 2 * k;
      sy += (random(`sy${frame}`) - 0.5) * 2 * k;
    }
  }
  const zoom = lerp('zoom');
  const cx = (lerp('x') / 100) * width, cy = (lerp('y') / 100) * height;
  const cam = { dx: -cx * 0.6, dy: -cy * 0.6, dz: zoom - 1, parallax: camera?.parallax ?? 1 };
  const fg = effects.filter((e) => e.kind !== 'grain' && e.kind !== 'vignette');
  const finish = effects.filter((e) => e.kind === 'grain' || e.kind === 'vignette');
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `perspective(${2400 * u}px) translate(${-cx + sx}px, ${-cy + sy}px) scale(${zoom}) rotate(${lerp('rotate')}deg) rotateX(${lerp('tiltX')}deg) rotateY(${lerp('tiltY')}deg)` }}>
        <AbsoluteFill style={{ transform: 'scale(1.12)' }}><Bg bg={background} /></AbsoluteFill>
        <CamCtx.Provider value={cam}>
          <LightCtx.Provider value={sceneLight}>
            {slots.has(-1) && <LightsView under ids={slots.get(-1)} />}
            {layers.map((l, i) => (
              <React.Fragment key={i}>
                {!l.fixed && <LayerView l={l} />}
                {slots.has(i) && <LightsView under ids={slots.get(i)} />}
              </React.Fragment>
            ))}
            <LightsView under={false} />
          </LightCtx.Provider>
        </CamCtx.Provider>
        {fg.map((e, i) => <Fx key={i} fx={e} />)}
      </AbsoluteFill>
      {layers.map((l, i) => (l.fixed ? <LayerView key={`f${i}`} l={l} /> : null))}
      {finish.map((e, i) => <Fx key={i} fx={e} />)}
    </AbsoluteFill>
  );
};

// A designed scene: background + layered elements + camera move (with parallax) + effects.
export const Composed: React.FC<ComposedProps> = (props) =>
  props.motionBlur ? (
    <CameraMotionBlur samples={6} shutterAngle={180}><SceneBody {...props} /></CameraMotionBlur>
  ) : (
    <SceneBody {...props} />
  );
