import React from 'react';
import { interpolate } from 'remotion';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { Logo, rise, Scene, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type LogoRevealProps = { title?: string; tagline?: string; surface?: Surface };

// Logo springs in with a ring burst; brand name and tagline follow.
export const LogoReveal: React.FC<LogoRevealProps> = ({ title, tagline, surface = 'background' }) => {
  const { brand, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const p = useSurface(surface);
  const logoIn = useEnter(0, 'pop');
  const ring = useEnter(2, 'swipe');
  const titleIn = useEnter(12);
  const tagIn = useEnter(22);
  const size = 340 * u;

  return (
    <Scene surface={surface} style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', border: `${10 * u}px solid ${(p.dark ? brand.colors.highlight ?? brand.colors.accent : brand.colors.primary).hex}`, transform: `scale(${interpolate(ring, [0, 1], [0.6, 1.8])})`, opacity: 1 - ring }} />
        <div style={{ transform: `scale(${interpolate(logoIn, [0, 1], [0.5, 1])}) rotate(${interpolate(logoIn, [0, 1], [-25, 0])}deg)`, opacity: Math.min(1, logoIn) }}>
          <Logo size={size * 0.9} onDark={p.dark} />
        </div>
      </div>
      <div style={{ ...h(84), marginTop: 60 * u, color: p.fg, padding: `0 ${80 * u}px`, ...rise(titleIn, 30 * u) }}>{title ?? brand.name}</div>
      {tagline && <div style={{ marginTop: 24 * u, fontFamily: body, fontWeight: 500, fontSize: 40 * u, color: p.sub, padding: `0 ${80 * u}px`, ...rise(tagIn, 20 * u) }}>{tagline}</div>}
    </Scene>
  );
};
