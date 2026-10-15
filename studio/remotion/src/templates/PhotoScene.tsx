import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { emphasis } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, useEnter, useHeading, useUnit } from '../ui';

export type PhotoSceneProps = { image: string; caption?: string; kicker?: string; zoom?: 'in' | 'out'; focus?: 'top' | 'center' | 'bottom'; captionPosition?: 'bottom' | 'center' };

// Full-bleed photo with a slow zoom (Ken Burns); optional caption on a dark gradient so it
// stays readable on any image.
export const PhotoScene: React.FC<PhotoSceneProps> = ({ image, caption, kicker, zoom = 'in', focus = 'center', captionPosition = 'bottom' }) => {
  const { brand, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const e = emphasis(brand);
  const s = interpolate(frame, [0, durationInFrames], zoom === 'in' ? [1, 1.12] : [1.12, 1], { extrapolateRight: 'clamp' });
  const capIn = useEnter(6);
  const pos = { top: 'center 20%', center: 'center', bottom: 'center 80%' }[focus];
  const centered = captionPosition === 'center';

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Img src={staticFile(image)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${s})` }} />
      {(caption || kicker) && (
        <AbsoluteFill style={{ background: centered ? 'rgba(0,0,0,0.45)' : 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.0) 55%)', justifyContent: centered ? 'center' : 'flex-end', alignItems: 'center', textAlign: 'center', padding: `${centered ? 0 : 160 * u}px ${80 * u}px` }}>
          {kicker && <div style={{ fontFamily: body, fontWeight: 700, fontSize: 36 * u, letterSpacing: 3 * u, textTransform: 'uppercase', background: e.fill, color: e.fg, padding: `${8 * u}px ${20 * u}px`, marginBottom: 24 * u, ...rise(capIn, 20 * u) }}>{kicker}</div>}
          {caption && <div style={{ ...h(88), color: '#ffffff', textShadow: '0 4px 24px rgba(0,0,0,0.5)', ...rise(capIn, 30 * u) }}>{caption}</div>}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
