import React from 'react';
import { Img, interpolate, staticFile } from 'remotion';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useCard, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type NumberSlamProps = { value: string; label: string; caption?: string; tag?: string; photo?: string; surface?: Surface };

// A big number slams onto a card; label, caption and an optional attribution tag follow.
export const NumberSlam: React.FC<NumberSlamProps> = ({ value, label, caption, tag, photo, surface = 'secondary' }) => {
  const { brand, style, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const scene = useSurface(surface);
  const card = useCard(surface);
  const c = brand.colors;
  const slam = useEnter(0, 'pop');
  const scale = interpolate(slam, [0, 1], [2.4, 1]);
  const labelIn = useEnter(8);
  const captionIn = useEnter(14);
  const tagIn = useEnter(24);

  return (
    <Scene surface={surface}>
      <div style={{ ...card.style, width: 860 * u, padding: `${90 * u}px ${60 * u}px`, textAlign: 'center' }}>
        <div style={{ ...h(340), lineHeight: 1, display: 'inline-block', backgroundColor: c.accent.hex, color: brand.computed?.on?.accent ?? c.ink.hex, padding: `${10 * u}px ${50 * u}px`, borderRadius: Math.min(style.radius, 40) * u, border: style.card === 'brutal' ? `${Math.max(3, style.border) * u}px solid ${c.ink.hex}` : undefined, transform: `scale(${scale})`, opacity: Math.min(1, slam * 2) }}>
          {value}
        </div>
        <div style={{ ...h(64), marginTop: 50 * u, color: card.fg, ...rise(labelIn, 30 * u) }}>{label}</div>
        {caption && <div style={{ marginTop: 16 * u, fontFamily: body, fontSize: 42 * u, fontWeight: 500, color: card.sub, ...rise(captionIn, 20 * u) }}>{caption}</div>}
      </div>
      {(tag || photo) && (
        <div style={{ marginTop: 56 * u, display: 'flex', alignItems: 'center', gap: 24 * u, ...rise(tagIn, 20 * u) }}>
          {photo && <Img src={staticFile(photo)} style={{ width: 120 * u, height: 120 * u, borderRadius: '50%', objectFit: 'cover', border: `${5 * u}px solid ${c.accent.hex}` }} />}
          {tag && <div style={{ fontFamily: body, fontSize: 42 * u, fontWeight: 500, color: scene.sub }}>{tag}</div>}
        </div>
      )}
    </Scene>
  );
};
