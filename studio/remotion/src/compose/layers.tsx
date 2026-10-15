import React, { useContext, useId, useMemo } from 'react';
import { Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import rough from 'roughjs';
import { getLength } from '@remotion/paths';
import * as Icons from 'lucide-react';
import { useBrand } from '../BrandContext';
import { useUnit } from '../ui';
import type { CounterLayer, GroupLayer, IconLayer, ImageLayer, Layer, LayerBase, ParticlesLayer, ShapeLayer, StrokeLayer, TextLayer } from './types';
import { ease, enterStyle, loopStyle, mergeStyles, progress, resolveColor, useLayerFont } from './util';
import { PhysicsL } from './physics';
import { BrushL } from './brush';
import { RigL } from './rig';
import { AmbientL } from './ambient';
import { CamCtx } from './camctx';
import { GroundShadows, LayerFilter, LightCtx } from './light';

export { CamCtx };

const SHADOWS = (u: number) => ({
  soft: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.28)`,
  hard: `${14 * u}px ${14 * u}px 0 rgba(0,0,0,0.85)`,
  long: `${30 * u}px ${40 * u}px ${80 * u}px rgba(0,0,0,0.45)`,
  none: 'none',
});

/** How a layer sits in the scene's light: `scene` layers (images, rigs, ambient life) take haze and depth
 *  of field; `lit` + `feet` defaults come from the layer type (rigs are lit and stand on the ground). */
export type SceneRole = { scene?: boolean; litDefault?: boolean; feetDefault?: number };

const ANCHOR = { center: [0.5, 0.5], left: [0, 0.5], right: [1, 0.5], top: [0.5, 0], bottom: [0.5, 1] } as const;

/** Positions a layer and applies enter / exit / loop / parallax / shadow / glow, and the scene's lighting. */
export const Place: React.FC<{ l: LayerBase; w?: number; h?: number; children: React.ReactNode; dropShadow?: boolean; role?: SceneRole }> = ({ l, w, h, children, dropShadow, role }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = useUnit();
  const { brand, style } = useBrand();
  const cam = useContext(CamCtx);
  const sl = useContext(LightCtx);
  const fid = 'lf' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const pIn = progress(frame, fps, l.enter, style.motion === 'bouncy');
  const pOut = l.exit ? 1 - progress(frame, fps, l.exit) : 1;
  const depth = ((l.z ?? 0.5) - 0.5) * cam.parallax;
  const anchor = { center: '-50%, -50%', left: '0%, -50%', right: '-100%, -50%', top: '-50%, 0%', bottom: '-50%, -100%' }[l.anchor ?? 'center'];
  const glow = l.glow ? `drop-shadow(0 0 ${40 * u}px ${resolveColor(brand, l.glow)})` : '';
  const shadow = l.shadow && l.shadow !== 'none' ? (dropShadow ? `drop-shadow(${SHADOWS(u)[l.shadow].replace(/rgba/, ' rgba')})` : '') : '';

  // ---- scene light ----
  const scene = !!role?.scene;
  const hasLights = sl.lights.length > 0;
  const box = typeof w === 'number' && typeof h === 'number'
    ? (() => { const [ax, ay] = ANCHOR[l.anchor ?? 'center']; return { left: ((l.x ?? 50) / 100) * width - ax * w, top: ((l.y ?? 50) / 100) * height - ay * h, w, h }; })()
    : null;
  const lit = scene && hasLights && (l.lit ?? !!role?.litDefault);
  const haze = scene && sl.haze ? Math.min(1, Math.max(0, l.haze ?? sl.haze.amount * Math.pow(1 - (l.z ?? 0.5), 1.3))) : 0;
  // lit layers compute their light at the size they reach the screen (camera zoom × depth scale), so
  // close-ups stay sharp: the art is drawn S× larger inside and scaled back down
  const onScreen = (1 + cam.dz) * (1 + cam.dz * depth);
  const S = lit && box && onScreen > 1.15 ? Math.min(3, Math.round(onScreen * 4) / 4) : 1;
  const slS = S > 1 && box ? { ...sl, lights: sl.lights.map((L) => ({ ...L, x: box.left + (L.x - box.left) * S, y: box.top + (L.y - box.top) * S, radius: L.radius * S })) } : sl;
  const boxS = S > 1 && box ? { ...box, w: box.w * S, h: box.h * S } : box;
  const filterEl = scene && (lit || haze > 0.001) ? <LayerFilter id={fid} sl={slS} box={boxS} lit={lit} rim={l.rim ?? !!role?.litDefault} haze={haze} /> : null;
  const dof = scene && sl.focus ? sl.focus.blur * Math.abs((l.z ?? 0.5) - sl.focus.z) * u : 0;
  const cast = l.castShadow ?? (hasLights && role?.feetDefault !== undefined && role?.litDefault ? true : false);
  const feet = l.feet ?? role?.feetDefault ?? 98;
  const visible = pIn * pOut;
  return (
    <div style={{ position: 'absolute', left: `${l.x ?? 50}%`, top: `${l.y ?? 50}%`, width: w ?? 'max-content', height: h, transform: `translate(${anchor}) translate(${cam.dx * depth}px, ${cam.dy * depth}px) scale(${1 + cam.dz * depth}) rotate(${l.rotate ?? 0}deg)`, opacity: l.opacity ?? 1, mixBlendMode: l.blend ?? 'normal', filter: dof > 0.3 ? `blur(${dof}px)` : undefined }}>
      {filterEl}
      {cast && box && scene && visible > 0.01 && (
        <div style={{ position: 'absolute', inset: 0, opacity: Math.min(1, visible * 1.4), ...(pIn >= 0.98 ? loopStyle(l.loop, frame, u) : {}) }}>
          <GroundShadows sl={sl} box={box} feet={feet} cfg={cast}>{children}</GroundShadows>
        </div>
      )}
      <div style={mergeStyles(enterStyle(l.enter?.preset ?? 'none', pIn, u), l.exit ? enterStyle(l.exit.preset, pOut, u) : {}, pIn >= 0.98 ? loopStyle(l.loop, frame, u) : {}, { filter: [glow, shadow].filter(Boolean).join(' ') || undefined, width: '100%', height: '100%' })}>
        {filterEl
          ? <div style={S > 1 && box ? { width: box.w * S, height: box.h * S, transform: `scale(${1 / S})`, transformOrigin: '0 0', filter: `url(#${fid})` } : { width: '100%', height: '100%', filter: `url(#${fid})` }}>{children}</div>
          : children}
      </div>
    </div>
  );
};

// ---------- text ----------
const TextL: React.FC<{ l: TextLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const { brand, style, heading, body } = useBrand();
  const family = useLayerFont(l.font, l.font === 'body' ? body : heading);
  const color = resolveColor(brand, l.color, brand.colors.ink.hex);
  const size = (l.size ?? 96) * u;
  const isHeading = !l.font || l.font === 'heading';
  const upper = l.case ? l.case === 'upper' : isHeading && style.headingCase === 'upper';
  const base: React.CSSProperties = {
    fontFamily: family, fontSize: size, fontWeight: l.weight ?? (isHeading ? style.headingWeight : l.font === 'hand' ? 700 : 500),
    lineHeight: l.lineHeight ?? (l.font === 'hand' ? 1 : 1.08), letterSpacing: `${l.tracking ?? (isHeading ? style.tracking : 0)}em`,
    textTransform: upper ? 'uppercase' : 'none', textAlign: l.align ?? 'center', color: l.outline ? 'transparent' : color,
    WebkitTextStroke: l.outline ? `${l.outline * u}px ${color}` : undefined, maxWidth: l.maxWidth ? l.maxWidth * u : undefined, whiteSpace: 'pre-wrap',
  };
  const hl = l.highlight;
  const marked = new Set((hl?.words ?? []).map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')));
  const split = l.split ?? 'none';
  const stagger = l.stagger ?? (split === 'letters' ? 1.5 : split === 'words' ? 4 : 8);
  const preset = l.enter?.preset ?? 'none';
  const at = l.enter?.at ?? 0;
  const dur = l.enter?.dur ?? 16;

  const piece = (txt: string, i: number, key: string, isWord: boolean) => {
    const p = split === 'none' ? 1 : progress(frame, fps, { preset, at: at + i * stagger, dur }, style.motion === 'bouncy');
    const isMarked = isWord && marked.has(txt.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
    let deco: React.ReactNode = null;
    let c: string | undefined;
    if (isMarked && hl) {
      const swipe = interpolate(frame, [at + i * stagger + dur * 0.6, at + i * stagger + dur * 0.6 + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out });
      const hc = resolveColor(brand, hl.color, (brand.colors.highlight ?? brand.colors.accent).hex);
      c = hl.textColor ? resolveColor(brand, hl.textColor) : undefined;
      if (hl.style === 'marker') deco = <span style={{ position: 'absolute', left: '-0.08em', right: '-0.08em', top: '0.12em', bottom: '0.02em', background: hc, transformOrigin: 'left', transform: `scaleX(${swipe})`, zIndex: -1 }} />;
      if (hl.style === 'box') deco = <span style={{ position: 'absolute', left: '-0.1em', right: '-0.1em', top: '0.04em', bottom: '-0.02em', background: hc, transformOrigin: 'left', transform: `scaleX(${swipe})`, zIndex: -1 }} />;
      if (hl.style === 'underline') deco = <span style={{ position: 'absolute', left: 0, right: 0, bottom: '-0.06em', height: '0.12em', background: hc, transformOrigin: 'left', transform: `scaleX(${swipe})` }} />;
      if (hl.style === 'color') c = hc;
    }
    return (
      <span key={key} style={mergeStyles({ display: 'inline-block', position: 'relative', zIndex: 0, color: c, WebkitTextStroke: c ? '0' : undefined }, split === 'none' ? {} : enterStyle(preset, p, u))}>
        {deco}{txt}
      </span>
    );
  };

  let content: React.ReactNode;
  if (split === 'letters') {
    let i = 0;
    content = l.text.split(/(\s+)/).map((w, wi) => (/^\s+$/.test(w) ? w : <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>{[...w].map((ch, ci) => piece(ch, i++, `${wi}-${ci}`, false))}</span>));
  } else if (split === 'words' || split === 'none') {
    let i = 0;
    content = l.text.split('\n').map((line, li) => (
      <div key={li}>{line.split(/(\s+)/).map((w, wi) => (/^\s+$/.test(w) ? w : piece(w, i++, `${li}-${wi}`, true)))}</div>
    ));
  } else {
    content = l.text.split('\n').map((line, li) => <div key={li} style={{ overflow: preset.startsWith('mask') ? 'visible' : undefined }}>{piece(line, li, `${li}`, false)}</div>);
  }
  return <Place l={split === 'none' ? l : { ...l, enter: undefined }} dropShadow><div style={base}>{content}</div></Place>;
};

// ---------- image ----------
const MASKS: Record<string, React.CSSProperties> = {
  circle: { borderRadius: '50%' },
  arch: { borderRadius: '999px 999px 24px 24px' },
  blob: { borderRadius: '62% 38% 55% 45% / 48% 58% 42% 52%' },
  diagonal: { clipPath: 'polygon(8% 0, 100% 0, 92% 100%, 0 100%)' },
};
const ImageL: React.FC<{ l: ImageLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const u = useUnit();
  const { brand } = useBrand();
  const w = (l.w ?? 600) * u;
  const h = l.h ? l.h * u : undefined;
  const z = l.zoom ? interpolate(frame, [0, durationInFrames], l.zoom, { extrapolateRight: 'clamp' }) : 1;
  const c = brand.colors;
  const filter = { duotone: 'grayscale(1) contrast(1.15)', grayscale: 'grayscale(1)', bright: 'contrast(1.12) saturate(1.15) brightness(1.04)', tint: 'saturate(0.85)', none: '' }[l.treatment ?? 'none'];
  const frameStyle: React.CSSProperties = l.frame === 'polaroid'
    ? { background: '#fff', padding: `${18 * u}px ${18 * u}px ${70 * u}px`, boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.3)` }
    : l.frame === 'card' ? { background: '#fff', padding: 12 * u, borderRadius: (l.radius ?? 24) * u + 12 * u, boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.25)` } : {};
  const cut = l.fit === 'contain' || l.src === 'logo' || /cutout/.test(l.src);
  const fadeMask = l.fade && l.fade !== 'none' ? `linear-gradient(to ${l.fade === 'bottom' ? 'top' : 'bottom'}, transparent 0%, #000 ${l.fadeAmount ?? 22}%)` : undefined;
  return (
    <Place l={l} w={w} h={h} dropShadow={cut} role={{ scene: true }}>
      <div style={frameStyle}>
        <div style={{ position: 'relative', width: '100%', height: h ? (l.frame === 'polaroid' ? h - 88 * u : h) : undefined, overflow: 'hidden', borderRadius: (l.radius ?? 0) * u, border: l.border ? `${l.border.width * u}px solid ${resolveColor(brand, l.border.color)}` : undefined, ...MASKS[l.mask ?? 'none'], WebkitMaskImage: fadeMask, maskImage: fadeMask, boxShadow: !cut && l.shadow && l.shadow !== 'none' && l.frame !== 'polaroid' ? SHADOWS(u)[l.shadow] : undefined }}>
          <Img src={staticFile(l.src === 'logo' ? brand.logo?.src ?? '' : l.src)} style={{ display: 'block', width: '100%', height: h ? '100%' : 'auto', objectFit: l.fit ?? 'cover', objectPosition: l.focus ?? 'center', transform: `scale(${z})`, filter }} />
          {l.treatment === 'duotone' && <>
            <div style={{ position: 'absolute', inset: 0, background: (c.secondary ?? c.primary).hex, mixBlendMode: 'screen' }} />
            <div style={{ position: 'absolute', inset: 0, background: c.primary.hex, mixBlendMode: 'multiply' }} />
          </>}
          {l.treatment === 'tint' && <div style={{ position: 'absolute', inset: 0, background: c.primary.hex, opacity: 0.35, mixBlendMode: 'color' }} />}
        </div>
      </div>
    </Place>
  );
};

// ---------- shapes ----------
const ShapeL: React.FC<{ l: ShapeLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const { brand } = useBrand();
  const w = (l.w ?? 300) * u;
  const h = (l.h ?? l.w ?? 300) * u;
  const fill = resolveColor(brand, l.fill, 'transparent');
  const stroke = l.stroke ? resolveColor(brand, l.stroke) : undefined;
  const sw = (l.strokeWidth ?? 6) * u;
  const g = l.grow ? progress(frame, fps, l.enter ?? { preset: 'fade', dur: 16 }) : 1;
  const growT = l.grow ? { left: `scaleX(${g})`, right: `scaleX(${g})`, up: `scaleY(${g})`, down: `scaleY(${g})` }[l.grow] : undefined;
  const origin = l.grow ? { left: 'left', right: 'right', up: 'bottom', down: 'top' }[l.grow] : undefined;
  const boxShadow = l.shadow && l.shadow !== 'none' ? SHADOWS(u)[l.shadow].replace('0.28)', '0.12)') : undefined;
  const base: React.CSSProperties = { width: w, height: h, transform: growT, transformOrigin: origin, boxShadow };
  let el: React.ReactNode;
  switch (l.shape) {
    case 'circle': el = <div style={{ ...base, borderRadius: '50%', background: fill, border: stroke ? `${sw}px solid ${stroke}` : undefined }} />; break;
    case 'ring': el = <div style={{ ...base, borderRadius: '50%', border: `${sw}px solid ${stroke ?? fill}` }} />; break;
    case 'line': el = <div style={{ ...base, height: sw, background: stroke ?? fill, borderRadius: sw }} />; break;
    case 'blob': el = <div style={{ ...base, background: fill, borderRadius: '62% 38% 55% 45% / 48% 58% 42% 52%', transform: `${growT ?? ''} rotate(${frame * 0.4}deg)` }} />; break;
    case 'triangle': el = <div style={{ ...base, background: fill, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' }} />; break;
    case 'burst': {
      const n = 16;
      const pts = Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2; const r = i % 2 ? 0.36 : 0.5; return `${50 + Math.cos(a) * r * 100}% ${50 + Math.sin(a) * r * 100}%`; }).join(',');
      el = <div style={{ ...base, background: fill, clipPath: `polygon(${pts})`, transform: `${growT ?? ''} rotate(${frame * 0.6}deg)` }} />; break;
    }
    case 'dots': el = <div style={{ ...base, backgroundImage: `radial-gradient(${fill === 'transparent' ? stroke : fill} ${5 * u}px, transparent ${5.5 * u}px)`, backgroundSize: `${36 * u}px ${36 * u}px` }} />; break;
    case 'stripes': el = <div style={{ ...base, backgroundImage: `repeating-linear-gradient(45deg, ${fill} 0 ${14 * u}px, transparent ${14 * u}px ${32 * u}px)` }} />; break;
    default: el = <div style={{ ...base, background: fill, borderRadius: (l.radius ?? 0) * u, border: stroke ? `${sw}px solid ${stroke}` : undefined }} />;
  }
  return <Place l={l.grow ? { ...l, enter: undefined } : l} w={w} h={h}>{el}</Place>;
};

// ---------- hand-drawn strokes ----------
const gen = rough.generator();
const StrokeL: React.FC<{ l: StrokeLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = useUnit();
  const { brand } = useBrand();
  const W = l.w ?? 400, H = l.h ?? (l.kind === 'underline' ? 60 : l.w ?? 400);
  const color = resolveColor(brand, l.color, '#ed3237');
  const opts = { stroke: color, strokeWidth: l.width ?? 7, roughness: l.roughness ?? 1.6, seed: l.seed ?? 7, bowing: 1.2 };
  const paths = useMemo(() => {
    const p = 8;
    const d = (() => {
      switch (l.kind) {
        case 'circle': return [gen.ellipse(W / 2, H / 2, W - p * 2, H - p * 2, { ...opts, curveStepCount: 14 })];
        case 'underline': return [gen.curve([[p, H * 0.65], [W * 0.35, H * 0.45], [W * 0.7, H * 0.55], [W - p, H * 0.35]], opts)];
        case 'arrow': return [gen.curve([[p, H - p], [W * 0.45, H * 0.35], [W - p * 3, p * 3]], opts), gen.linearPath([[W - p * 10, p * 2], [W - p * 3, p * 3], [W - p * 4, p * 10]], opts)];
        case 'scribble': return [gen.curve(Array.from({ length: 9 }, (_, i) => [p + (i / 8) * (W - p * 2), i % 2 ? H * 0.25 : H * 0.75] as [number, number]), opts)];
        case 'check': return [gen.linearPath([[p, H * 0.55], [W * 0.38, H - p], [W - p, p]], opts)];
        case 'cross': return [gen.line(p, p, W - p, H - p, opts), gen.line(W - p, p, p, H - p, opts)];
        case 'box': return [gen.rectangle(p, p, W - p * 2, H - p * 2, opts)];
        case 'bracket': return [gen.linearPath([[W * 0.3, p], [p, p], [p, H - p], [W * 0.3, H - p]], opts)];
        case 'star': return [gen.polygon(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 0.2 : 0.48; return [W / 2 + Math.cos(a) * r * W, H / 2 + Math.sin(a) * r * H] as [number, number]; }), opts)];
      }
    })();
    return d.flatMap((dr) => gen.toPaths(dr)).map((pi) => ({ ...pi, len: getLength(pi.d) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l.kind, W, H, color, l.width, l.roughness, l.seed]);
  const total = paths.reduce((s, p) => s + p.len, 0);
  const prog = progress(frame, fps, l.enter ?? { preset: 'fade', dur: 18 }) * total;
  let acc = 0;
  return (
    <Place l={{ ...l, enter: undefined }} w={W * u} h={H * u}>
      <svg width={W * u} height={H * u} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {paths.map((pi, i) => {
          const start = acc; acc += pi.len;
          const drawn = Math.max(0, Math.min(pi.len, prog - start));
          return <path key={i} d={pi.d} fill="none" stroke={pi.stroke} strokeWidth={pi.strokeWidth} strokeLinecap="round" strokeDasharray={pi.len} strokeDashoffset={pi.len - drawn} />;
        })}
      </svg>
    </Place>
  );
};

// ---------- counter ----------
const CounterL: React.FC<{ l: CounterLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { brand, style, heading, body } = useBrand();
  const u = useUnit();
  const family = useLayerFont(l.font, l.font === 'body' ? body : heading);
  const at = l.enter?.at ?? 0;
  const n = interpolate(frame, [at, at + (l.frames ?? 30)], [l.from ?? 0, l.to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.out });
  return (
    <Place l={l} dropShadow>
      <div style={{ fontFamily: family, fontWeight: l.weight ?? style.headingWeight, fontSize: (l.size ?? 300) * u, lineHeight: 1, color: resolveColor(brand, l.color, brand.colors.ink.hex), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {l.prefix}{n.toFixed(l.decimals ?? 0)}{l.suffix}
      </div>
    </Place>
  );
};

// ---------- icon ----------
const IconL: React.FC<{ l: IconLayer }> = ({ l }) => {
  const { brand } = useBrand();
  const u = useUnit();
  const size = (l.size ?? 120) * u;
  const Comp = (Icons as unknown as Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>>)[l.name] ?? Icons.Circle;
  const icon = <Comp size={size} color={resolveColor(brand, l.color, brand.colors.ink.hex)} strokeWidth={l.strokeWidth ?? 2} />;
  return (
    <Place l={l} dropShadow>
      {l.bg ? <div style={{ width: size * 1.8, height: size * 1.8, borderRadius: '50%', background: resolveColor(brand, l.bg), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div> : icon}
    </Place>
  );
};

// ---------- particles ----------
const ParticlesL: React.FC<{ l: ParticlesLayer }> = ({ l }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { brand } = useBrand();
  const u = useUnit();
  const kind = l.kind ?? 'dots';
  const colors = (l.colors ?? ['highlight', 'white']).map((c) => resolveColor(brand, c, '#ffffff'));
  const n = l.count ?? (kind === 'bokeh' ? 14 : 40);
  const speed = l.speed ?? 1;
  const seed = l.seed ?? 3;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: l.opacity ?? 1, mixBlendMode: l.blend ?? 'normal', pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const rx = random(`${seed}x${i}`), ry = random(`${seed}y${i}`), rs = random(`${seed}s${i}`);
        const color = colors[i % colors.length];
        if (kind === 'sparks') {
          const a = rx * Math.PI * 2; const life = ((frame * speed + ry * 40) % 40) / 40; const r = life * 520 * u;
          return <div key={i} style={{ position: 'absolute', left: width / 2 + Math.cos(a) * r, top: height / 2 + Math.sin(a) * r, width: 26 * u * (1 - life), height: 5 * u, background: color, borderRadius: 4, transform: `rotate(${a}rad)`, opacity: 1 - life }} />;
        }
        if (kind === 'confetti') {
          const y = ((ry * height + frame * (4 + rs * 6) * speed * u) % (height + 100)) - 50;
          return <div key={i} style={{ position: 'absolute', left: rx * width, top: y, width: 18 * u, height: 30 * u, background: color, transform: `rotate(${frame * (3 + rs * 8)}deg)` }} />;
        }
        const big = kind === 'bokeh';
        const size = (big ? 80 + rs * 160 : 4 + rs * 8) * u;
        const y = ((ry * height - frame * (big ? 0.6 : 1.5 + rs * 2) * speed * u) % height + height) % height;
        const x = rx * width + Math.sin(frame / 30 + i) * 20 * u;
        return <div key={i} style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%', background: color, opacity: big ? 0.12 + rs * 0.15 : 0.35 + rs * 0.5, filter: big ? `blur(${10 * u}px)` : undefined }} />;
      })}
    </div>
  );
};

// ---------- group ----------
const GroupL: React.FC<{ l: GroupLayer }> = ({ l }) => {
  const u = useUnit();
  return (
    <Place l={l} w={(l.w ?? 1080) * u} h={(l.h ?? 1080) * u}>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>{l.layers.map((c, i) => <LayerView key={i} l={c} />)}</div>
    </Place>
  );
};

export const LayerView: React.FC<{ l: Layer }> = ({ l }) => {
  switch (l.type) {
    case 'text': return <TextL l={l} />;
    case 'image': return <ImageL l={l} />;
    case 'shape': return <ShapeL l={l} />;
    case 'stroke': return <StrokeL l={l} />;
    case 'counter': return <CounterL l={l} />;
    case 'icon': return <IconL l={l} />;
    case 'particles': return <ParticlesL l={l} />;
    case 'physics': return <PhysicsL l={l} />;
    case 'brush': return <BrushL l={l} Place={Place} />;
    case 'rig': return <RigL l={l} Place={Place} />;
    case 'ambient': return <AmbientL l={l} Place={Place} />;
    case 'group': return <GroupL l={l} />;
    default: return null;
  }
};
