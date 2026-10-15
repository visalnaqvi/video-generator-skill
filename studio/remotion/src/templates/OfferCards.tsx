import React from 'react';
import { Img, staticFile } from 'remotion';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useCard, useEnter, useHeading, useIsWide, useSurface, useUnit } from '../ui';

export type Offer = { image?: string; title?: string; detail?: string; at?: number };
export type OfferCardsProps = { items: Offer[]; heading?: string; surface?: Surface; stagger?: number; fit?: 'cover' | 'contain' };

const Card: React.FC<{ item: Offer; delay: number; w: number; surface: Surface; fit: 'cover' | 'contain'; tilt: number }> = ({ item, delay, w, surface, fit, tilt }) => {
  const { body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const card = useCard(surface);
  const inP = useEnter(delay, 'pop');
  return (
    <div style={{ ...card.style, width: w, overflow: 'hidden', padding: 0, opacity: Math.min(1, inP), transform: `translateY(${(1 - inP) * 80 * u}px) rotate(${(1 - inP) * tilt}deg) scale(${0.9 + 0.1 * Math.min(1, inP)})` }}>
      {item.image && <Img src={staticFile(item.image)} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: fit, display: 'block', background: '#fff' }} />}
      {(item.title || item.detail) && (
        <div style={{ padding: `${22 * u}px ${26 * u}px` }}>
          {item.title && <div style={{ ...h(40), lineHeight: 1.15, color: card.fg }}>{item.title}</div>}
          {item.detail && <div style={{ fontFamily: body, fontWeight: 500, fontSize: 30 * u, color: card.sub, marginTop: 6 * u }}>{item.detail}</div>}
        </div>
      )}
    </div>
  );
};

// Products / services / courses / menu items as image cards popping in on a grid (2 columns
// in portrait, a row in landscape). Titles optional — posters with baked-in text need none.
export const OfferCards: React.FC<OfferCardsProps> = ({ items, heading: title, surface = 'background', stagger = 8, fit = 'cover' }) => {
  const u = useUnit();
  const h = useHeading();
  const wide = useIsWide();
  const p = useSurface(surface);
  const titleIn = useEnter(0);
  const cols = wide ? Math.min(items.length, 4) : items.length <= 1 ? 1 : 2;
  const w = ((wide ? 1720 : 960) * u - (cols - 1) * 32 * u) / cols;
  return (
    <Scene surface={surface}>
      {title && <div style={{ ...h(76), color: p.fg, marginBottom: 48 * u, textAlign: 'center', padding: `0 ${60 * u}px`, ...rise(titleIn, 30 * u) }}>{title}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 32 * u, width: (wide ? 1720 : 960) * u }}>
        {items.map((it, i) => <Card key={i} item={it} delay={it.at ?? 4 + i * stagger} w={w} surface={surface} fit={fit} tilt={i % 2 ? 6 : -6} />)}
      </div>
    </Scene>
  );
};
