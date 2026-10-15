import React from 'react';
import { Img, staticFile } from 'remotion';
import { Star } from '@remotion/shapes';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useCard, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type TestimonialProps = { quote: string; name: string; detail?: string; photo?: string; stars?: number; backdrop?: string; surface?: Surface };

// A customer quote on a card: big quote mark, words, then the person (photo, name, detail).
// Optional `backdrop` image (e.g. a collage of real reviews) sits dimmed behind the card.
export const Testimonial: React.FC<TestimonialProps> = ({ quote, name, detail, photo, stars, backdrop, surface = 'secondary' }) => {
  const { brand, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const p = useSurface(surface);
  const card = useCard(surface);
  const c = brand.colors;
  const cardIn = useEnter(0);
  const quoteIn = useEnter(6);
  const personIn = useEnter(16);
  const size = quote.length <= 60 ? 64 : quote.length <= 110 ? 54 : 46;
  const avatar = 130 * u;

  return (
    <Scene surface={surface}>
      {backdrop && <Img src={staticFile(backdrop)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: p.dark ? 0.18 : 0.12, filter: 'grayscale(0.4) blur(2px)' }} />}
      <div style={{ ...card.style, position: 'relative', width: 920 * u, padding: `${70 * u}px ${64 * u}px ${56 * u}px`, ...rise(cardIn, 60 * u) }}>
        <div style={{ position: 'absolute', top: -70 * u, left: 50 * u, width: 140 * u, height: 140 * u, borderRadius: '50%', background: c.accent.hex, color: brand.computed?.on?.accent ?? c.ink.hex, fontFamily: 'Georgia, serif', fontSize: 170 * u, lineHeight: `${200 * u}px`, textAlign: 'center' }}>“</div>
        {stars ? (
          <div style={{ display: 'flex', gap: 8 * u, marginBottom: 24 * u, ...rise(quoteIn, 10 * u) }}>
            {Array.from({ length: stars }, (_, i) => <Star key={i} points={5} innerRadius={18 * u} outerRadius={40 * u} fill={card.solid ? c.primary.hex : (c.highlight ?? c.accent).hex} />)}
          </div>
        ) : null}
        <div style={{ ...h(size), textTransform: 'none', letterSpacing: 0, lineHeight: 1.3, color: card.fg, ...rise(quoteIn, 20 * u) }}>{quote}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 * u, marginTop: 44 * u, ...rise(personIn, 20 * u) }}>
          {photo && <Img src={staticFile(photo)} style={{ width: avatar, height: avatar, borderRadius: '50%', objectFit: 'cover', border: `${5 * u}px solid ${c.accent.hex}` }} />}
          <div>
            <div style={{ ...h(46), textTransform: 'none', color: card.fg }}>{name}</div>
            {detail && <div style={{ fontFamily: body, fontWeight: 500, fontSize: 34 * u, color: card.sub, marginTop: 4 * u }}>{detail}</div>}
          </div>
        </div>
      </div>
    </Scene>
  );
};
