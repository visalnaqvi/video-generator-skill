// Ambient life for composed scenes — small, continuous motion that makes a still set feel inhabited.
// Universe-neutral: colours default to night tones but every kind takes `color`/`colors`.
//   fog        soft puffs drifting along a band (layer it: far band behind, near band in front)
//   grass      wind-blown blades along the bottom of the area — a foreground occluder the character stands in
//   stars      twinkling stars (on top of a painted sky)
//   fireflies  wandering, pulsing glows        moths  specks circling a lamp (area centre)
//   dust       motes drifting in a light beam  rain / snow  falling weather
//   traffic    distant headlight pairs crossing the horizon band
import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';
import { noise2D } from '@remotion/noise';
import { useBrand } from '../BrandContext';
import { useUnit } from '../ui';
import type { AmbientLayer, LayerBase } from './types';
import type { SceneRole } from './layers';
import { resolveColor } from './util';

type PlaceFC = React.FC<{ l: LayerBase; w?: number; h?: number; children: React.ReactNode; role?: SceneRole }>;

const DEFAULT_AREA: Record<AmbientLayer['kind'], [number, number, number, number]> = {
  fog: [0, 45, 100, 25], grass: [0, 80, 100, 20], stars: [0, 0, 100, 50], fireflies: [0, 50, 100, 40],
  moths: [40, 30, 20, 12], dust: [0, 0, 100, 100], rain: [0, 0, 100, 100], snow: [0, 0, 100, 100], traffic: [0, 50, 100, 3],
};
const DEFAULT_COLOR: Record<AmbientLayer['kind'], string> = {
  fog: '#8fa3cc', grass: '#0d1320', stars: '#ffffff', fireflies: '#e4ff8a', moths: '#f4ecd2', dust: '#fff1cf',
  rain: '#a9c1e8', snow: '#f4f7ff', traffic: '#fff4d6',
};
const DEFAULT_COUNT: Record<AmbientLayer['kind'], number> = { fog: 7, grass: 0, stars: 40, fireflies: 12, moths: 6, dust: 50, rain: 140, snow: 90, traffic: 2 };

export const AmbientL: React.FC<{ l: AmbientLayer; Place: PlaceFC }> = ({ l, Place }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const { brand } = useBrand();
  const u = useUnit();
  const [ax, ay, aw, ah] = l.area ?? DEFAULT_AREA[l.kind];
  const W = (aw / 100) * width, H = (ah / 100) * height;
  const seed = `${l.kind}-${l.seed ?? 1}`;
  const n = l.count ?? (l.kind === 'grass' ? Math.round(W / (8 * u)) : DEFAULT_COUNT[l.kind]);
  const cols = (l.colors ?? [l.color ?? DEFAULT_COLOR[l.kind]]).map((c) => resolveColor(brand, c, DEFAULT_COLOR[l.kind]));
  const size = l.size ?? 1, speed = l.speed ?? 1, wind = l.wind ?? 1;
  const t = frame / fps;
  const R = (k: string, i: number) => random(`${seed}-${k}-${i}`);
  const items: React.ReactNode[] = [];

  switch (l.kind) {
    case 'fog': {
      for (let i = 0; i < n; i++) {
        const pw = W * (0.45 + R('w', i) * 0.5) * size, ph = H * (0.55 + R('h', i) * 0.6);
        const span = W + pw;
        const x = ((R('x', i) * span + t * (14 + R('s', i) * 22) * speed * wind * u) % span) - pw / 2;
        const y = H * (0.2 + R('y', i) * 0.6) + noise2D(seed, i, t * 0.08) * H * 0.12;
        const op = 0.07 + R('o', i) * 0.12;
        items.push(<div key={i} style={{ position: 'absolute', left: x - pw / 2, top: y - ph / 2, width: pw, height: ph, borderRadius: '50%', background: `radial-gradient(closest-side, ${cols[i % cols.length]}, transparent)`, opacity: op }} />);
      }
      break;
    }
    case 'grass': {
      const paths: React.ReactNode[] = [];
      for (let i = 0; i < n; i++) {
        const x = (i + R('j', i) * 0.8) * (W / n);
        const h = H * (0.35 + R('h', i) * 0.65) * size;
        const bw = (3 + R('b', i) * 4) * u;
        const gust = noise2D(seed, x * 0.0025 - t * 0.45 * speed, 0);
        const lean = (R('l', i) - 0.5) * 0.35 + wind * (0.18 * Math.sin(t * 2.1 * speed + x * 0.02) * 0.4 + gust * 0.5);
        const tx = x + lean * h, ty = H - h * (1 - Math.abs(lean) * 0.12);
        paths.push(<path key={i} d={`M${x - bw},${H} Q${x - bw * 0.4 + lean * h * 0.35},${H - h * 0.55} ${tx},${ty} Q${x + bw * 0.4 + lean * h * 0.35},${H - h * 0.55} ${x + bw},${H} Z`} fill={cols[i % cols.length]} />);
      }
      items.push(<svg key="g" width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>{paths}</svg>);
      break;
    }
    case 'stars': {
      for (let i = 0; i < n; i++) {
        const r = (0.8 + R('r', i) * 1.8) * size * u;
        const tw = 0.5 + 0.5 * Math.sin(t * (1.2 + R('f', i) * 3) * speed + R('p', i) * 6.28);
        const op = (0.25 + R('o', i) * 0.6) * (0.35 + 0.65 * tw);
        items.push(<div key={i} style={{ position: 'absolute', left: R('x', i) * W - r, top: R('y', i) * H - r, width: r * 2, height: r * 2, borderRadius: '50%', background: cols[i % cols.length], opacity: op, boxShadow: r > 1.8 * u ? `0 0 ${r * 3}px ${cols[i % cols.length]}` : undefined }} />);
      }
      break;
    }
    case 'fireflies': {
      for (let i = 0; i < n; i++) {
        const x = (R('x', i) + noise2D(seed, i, t * 0.12 * speed) * 0.18) * W;
        const y = (R('y', i) + noise2D(seed, i + 100, t * 0.12 * speed) * 0.15) * H;
        const ph = (t * (0.35 + R('f', i) * 0.4) + R('p', i)) % 1;
        const glow = ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
        const g = 22 * size * u;
        if (glow < 0.02) continue;
        items.push(<div key={i} style={{ position: 'absolute', left: x - g, top: y - g, width: g * 2, height: g * 2, borderRadius: '50%', background: `radial-gradient(closest-side, ${cols[i % cols.length]}, ${cols[i % cols.length]}55 30%, transparent)`, opacity: glow }} />);
      }
      break;
    }
    case 'moths': {
      for (let i = 0; i < n; i++) {
        const a = t * (2.2 + R('s', i) * 2.5) * speed * (R('d', i) > 0.5 ? 1 : -1) + R('p', i) * 6.28;
        const rr = 0.35 + R('r', i) * 0.65 + noise2D(seed, i, t * 1.4) * 0.25;
        const x = W / 2 + Math.cos(a) * rr * W / 2, y = H / 2 + Math.sin(a * 1.3) * rr * H / 2;
        const s = (3 + R('z', i) * 3) * size * u * (0.7 + 0.3 * Math.abs(Math.sin(t * 30 + i)));
        items.push(<div key={i} style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s * 0.7, borderRadius: '50%', background: cols[i % cols.length], opacity: 0.85 }} />);
      }
      break;
    }
    case 'dust': {
      for (let i = 0; i < n; i++) {
        const x = ((R('x', i) + noise2D(seed, i, t * 0.05) * 0.08 + t * 0.006 * wind * speed) % 1 + 1) % 1 * W;
        const y = ((R('y', i) - t * 0.01 * speed * (0.5 + R('v', i)) + noise2D(seed, i + 50, t * 0.05) * 0.05) % 1 + 1) % 1 * H;
        const s = (1.5 + R('s', i) * 3) * size * u;
        const op = (0.2 + R('o', i) * 0.55) * (0.5 + 0.5 * Math.sin(t * 2 + i));
        items.push(<div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: cols[i % cols.length], opacity: op }} />);
      }
      break;
    }
    case 'rain':
    case 'snow': {
      const rain = l.kind === 'rain';
      const ang = ((l.dir ?? (rain ? 12 : 0)) * wind * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const v = (rain ? 1600 : 120) * (0.7 + R('v', i) * 0.6) * speed * u;
        const fall = (R('y', i) * (H + 100 * u) + t * v) % (H + 100 * u) - 50 * u;
        const x = ((R('x', i) * W + fall * Math.tan(ang) + (rain ? 0 : Math.sin(t * 1.3 + i) * 14 * u)) % W + W) % W;
        if (rain) {
          const len = (30 + R('l', i) * 40) * size * u;
          items.push(<div key={i} style={{ position: 'absolute', left: x, top: fall, width: 2 * u, height: len, background: `linear-gradient(transparent, ${cols[i % cols.length]})`, opacity: 0.25 + R('o', i) * 0.3, transform: `rotate(${(-ang * 180) / Math.PI}deg)` }} />);
        } else {
          const s = (3 + R('s', i) * 6) * size * u;
          items.push(<div key={i} style={{ position: 'absolute', left: x, top: fall, width: s, height: s, borderRadius: '50%', background: cols[i % cols.length], opacity: 0.5 + R('o', i) * 0.4, filter: s > 6 * u ? `blur(${1.5 * u}px)` : undefined }} />);
        }
      }
      break;
    }
    case 'traffic': {
      const dir = l.dir ?? 1;
      for (let i = 0; i < n; i++) {
        const cyc = 14 / speed + R('c', i) * 10;
        const p = ((t + R('p', i) * cyc) % cyc) / cyc;
        const x = dir > 0 ? p * (W + 60 * u) - 30 * u : W + 30 * u - p * (W + 60 * u);
        const s = 4 * size * u;
        const c = cols[i % cols.length];
        items.push(<div key={i} style={{ position: 'absolute', left: x, top: H / 2, width: s * 3, height: s, display: 'flex', justifyContent: 'space-between' }}>
          {[0, 1].map((k) => <div key={k} style={{ width: s, height: s, borderRadius: '50%', background: c, boxShadow: `0 0 ${s * 3}px ${c}` }} />)}
        </div>);
      }
      break;
    }
  }
  const blend = l.blend ?? (['fireflies', 'dust', 'stars', 'traffic', 'fog'].includes(l.kind) ? 'screen' : 'normal');
  return (
    <Place l={{ ...l, x: ax + aw / 2, y: ay + ah / 2, anchor: 'center', blend }} w={W} h={H} role={{ scene: true }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'none' }}>{items}</div>
    </Place>
  );
};
