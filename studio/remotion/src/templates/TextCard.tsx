import React from 'react';
import { emphasis, Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type TextCardProps = {
  text: string;
  kicker?: string;
  /** Words (exact, case-insensitive) emphasised in the style's way: marker, underline, box or colour. */
  emphasis?: string[];
  surface?: Surface;
  align?: 'center' | 'left';
};

const Word: React.FC<{ word: string; index: number; marked: boolean; size: number; fg: string; bg: string; dark: boolean }> = ({ word, index, marked, size, fg, bg, dark }) => {
  const { brand, style } = useBrand();
  const u = useUnit();
  const inP = useEnter(4 + index * 3);
  const swipe = useEnter(14 + index * 3, 'swipe');
  const e = emphasis(brand);
  let deco: React.ReactNode = null;
  let color = fg;
  if (marked) {
    if (style.emphasis === 'marker') {
      deco = <span style={{ position: 'absolute', left: -size * 0.08, right: -size * 0.08, top: '12%', bottom: '4%', background: e.fill, transformOrigin: 'left', transform: `scaleX(${swipe})`, borderRadius: Math.min(style.radius, 12) * u }} />;
      color = e.fg;
    } else if (style.emphasis === 'underline') {
      deco = <span style={{ position: 'absolute', left: 0, right: 0, bottom: '-2%', height: '14%', background: e.fill, transformOrigin: 'left', transform: `scaleX(${swipe})` }} />;
    } else if (style.emphasis === 'box') {
      deco = <span style={{ position: 'absolute', left: -size * 0.1, right: -size * 0.1, top: '6%', bottom: '0%', background: fg, transformOrigin: 'left', transform: `scaleX(${swipe})`, borderRadius: Math.min(style.radius, 8) * u }} />;
      color = bg;
    } else {
      color = dark ? e.fill : brand.colors.primary.hex;
    }
  }
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginRight: size * 0.28, ...rise(inP, 30 * u) }}>
      {deco}
      <span style={{ position: 'relative', color }}>{word}</span>
    </span>
  );
};

// One big statement, words rising in one after another; emphasised words styled per the style.
export const TextCard: React.FC<TextCardProps> = ({ text, kicker, emphasis: marked = [], surface = 'background', align = 'center' }) => {
  const { style, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const p = useSurface(surface);
  const words = text.split(/\s+/);
  const base = text.length <= 18 ? 150 : text.length <= 34 ? 124 : text.length <= 60 ? 96 : 76;
  const size = base * u * style.typeScale;
  const kickerIn = useEnter(0);
  const clean = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const set = new Set(marked.map(clean));

  return (
    <Scene surface={surface} style={{ alignItems: align === 'center' ? 'center' : 'flex-start', padding: `0 ${90 * u}px` }}>
      {kicker && <div style={{ fontFamily: body, fontSize: 40 * u, fontWeight: 500, letterSpacing: 4 * u, textTransform: 'uppercase', color: p.sub, marginBottom: 36 * u, ...rise(kickerIn, 20 * u) }}>{kicker}</div>}
      <div style={{ ...h(base), textAlign: align, color: p.fg }}>
        {words.map((w, i) => <Word key={i} word={w} index={i} marked={set.has(clean(w))} size={size} fg={p.fg} bg={p.bg} dark={p.dark} />)}
      </div>
    </Scene>
  );
};
