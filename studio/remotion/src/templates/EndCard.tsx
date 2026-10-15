import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { Logo, rise, Scene, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type EndCardProps = { headline: string; cta: string; subline?: string; showLogo?: boolean; surface?: Surface };

// Closing card: logo, offer headline, a pulsing call-to-action button, optional subline.
export const EndCard: React.FC<EndCardProps> = ({ headline, cta, subline, showLogo = true, surface = 'background' }) => {
  const { brand, style, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const frame = useCurrentFrame();
  const p = useSurface(surface);
  const c = brand.colors;
  const logoIn = useEnter(0);
  const headIn = useEnter(6);
  const ctaIn = useEnter(14, 'pop');
  const subIn = useEnter(22);
  const pulse = frame > 30 ? 1 + Math.max(0, Math.sin((frame - 30) / 7)) * 0.04 : 1;
  const brutal = style.card === 'brutal';

  return (
    <Scene surface={surface} style={{ textAlign: 'center', padding: `0 ${80 * u}px` }}>
      {showLogo && <div style={{ ...rise(logoIn, 30 * u), marginBottom: 56 * u }}><Logo size={240 * u} onDark={p.dark} /></div>}
      <div style={{ ...h(104), color: p.fg, ...rise(headIn, 30 * u) }}>{headline}</div>
      <div style={{ ...h(68), marginTop: 64 * u, background: c.accent.hex, color: brand.computed?.on?.accent ?? c.ink.hex, padding: `${32 * u}px ${68 * u}px`, borderRadius: style.radius >= 20 ? 999 : style.radius * u, border: brutal ? `${Math.max(3, style.border) * u}px solid ${c.ink.hex}` : undefined, boxShadow: brutal ? `${10 * u}px ${10 * u}px 0 ${c.ink.hex}` : `0 ${16 * u}px ${40 * u}px rgba(0,0,0,0.18)`, transform: `scale(${ctaIn * pulse})` }}>
        {cta}
      </div>
      {subline && <div style={{ marginTop: 48 * u, fontFamily: body, fontWeight: 500, fontSize: 44 * u, color: p.sub, ...rise(subIn, 20 * u) }}>{subline}</div>}
    </Scene>
  );
};
