import React from 'react';
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useCard, useEnter, useHeading, useIsWide, useSurface, useUnit } from '../ui';

export type PersonSpotlightProps = { photo: string; name: string; role?: string; kicker?: string; surface?: Surface; focus?: 'top' | 'center' };

// One person, big: framed portrait with a slow push-in, name and role sliding in beside/below.
export const PersonSpotlight: React.FC<PersonSpotlightProps> = ({ photo, name, role, kicker, surface = 'surface', focus = 'top' }) => {
  const { brand, style, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const wide = useIsWide();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = useSurface(surface);
  const card = useCard(surface);
  const photoIn = useEnter(0);
  const nameIn = useEnter(8);
  const roleIn = useEnter(14);
  const zoom = interpolate(frame, [0, durationInFrames], [1.08, 1], { extrapolateRight: 'clamp' });
  const W = wide ? 760 * u : 900 * u;
  const H = wide ? 900 * u : 980 * u;

  return (
    <Scene surface={surface} style={{ flexDirection: wide ? 'row' : 'column', gap: 56 * u }}>
      <div style={{ ...card.style, width: W, height: H, overflow: 'hidden', padding: 0, opacity: Math.min(1, photoIn), transform: `translateY(${(1 - photoIn) * 60 * u}px)` }}>
        <Img src={staticFile(photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: focus === 'top' ? 'center 15%' : 'center', transform: `scale(${zoom})` }} />
      </div>
      <div style={{ textAlign: wide ? 'left' : 'center', maxWidth: wide ? 760 * u : 940 * u }}>
        {kicker && <div style={{ fontFamily: body, fontWeight: 500, fontSize: 38 * u, letterSpacing: 3 * u, textTransform: 'uppercase', color: p.sub, marginBottom: 14 * u, ...rise(nameIn, 20 * u) }}>{kicker}</div>}
        <div style={{ ...h(84), color: p.fg, ...rise(nameIn, 30 * u) }}>{name}</div>
        {role && (
          <div style={{ marginTop: 18 * u, display: 'inline-block', fontFamily: body, fontWeight: 500, fontSize: 44 * u, color: p.sub, borderTop: `${6 * u}px solid ${brand.colors.accent.hex}`, paddingTop: 14 * u, borderRadius: style.radius > 0 ? 2 * u : 0, ...rise(roleIn, 20 * u) }}>{role}</div>
        )}
      </div>
    </Scene>
  );
};
