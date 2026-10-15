import React from 'react';
import { interpolate } from 'remotion';
import { Star } from '@remotion/shapes';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type RatingStarsProps = { rating: string; outOf?: number; label?: string; count?: string; surface?: Surface };

const StarSlot: React.FC<{ index: number; size: number; empty: string; fill: string }> = ({ index, size, empty, fill }) => {
  const p = useEnter(6 + index * 5, 'pop');
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <Star points={5} innerRadius={size * 0.22} outerRadius={size * 0.5} fill={empty} style={{ position: 'absolute', inset: 0 }} />
      <Star points={5} innerRadius={size * 0.22} outerRadius={size * 0.5} fill={fill} style={{ position: 'absolute', inset: 0, transform: `scale(${interpolate(p, [0, 1], [0.2, 1])})`, opacity: Math.min(1, p) }} />
    </div>
  );
};

// Stars fill one by one, then the score and the rating count appear.
export const RatingStars: React.FC<RatingStarsProps> = ({ rating, outOf = 5, label, count, surface = 'secondary' }) => {
  const { brand, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const p = useSurface(surface);
  // Star fill must stay visible: highlight on dark surfaces, primary on light ones.
  const fill = p.dark ? (brand.colors.highlight ?? brand.colors.accent).hex : brand.colors.primary.hex;
  const scoreIn = useEnter(6 + outOf * 5);
  const countIn = useEnter(12 + outOf * 5);
  const size = 160 * u;
  return (
    <Scene surface={surface} style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', gap: 18 * u }}>
        {Array.from({ length: outOf }, (_, i) => <StarSlot key={i} index={i} size={size} empty={p.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} fill={fill} />)}
      </div>
      <div style={{ ...h(220), lineHeight: 1, marginTop: 50 * u, color: p.fg, ...rise(scoreIn, 30 * u) }}>{rating}</div>
      {label && <div style={{ marginTop: 16 * u, fontFamily: body, fontWeight: 500, fontSize: 56 * u, color: p.fg, ...rise(scoreIn, 20 * u) }}>{label}</div>}
      {count && <div style={{ marginTop: 20 * u, fontFamily: body, fontWeight: 500, fontSize: 46 * u, color: p.sub, ...rise(countIn, 20 * u) }}>{count}</div>}
    </Scene>
  );
};
