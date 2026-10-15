import React from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { emphasis, Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type StatCounterProps = { value: number; prefix?: string; suffix?: string; label: string; decimals?: number; countFrames?: number; surface?: Surface };

// A number counts up, its suffix pops in, the label rises under it.
export const StatCounter: React.FC<StatCounterProps> = ({ value, prefix = '', suffix = '', label, decimals = 0, countFrames = 30, surface = 'primary' }) => {
  const { brand, style, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const frame = useCurrentFrame();
  const p = useSurface(surface);
  const e = emphasis(brand);
  const n = interpolate(frame, [0, countFrames], [0, value], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const pop = useEnter(countFrames - 4, 'pop');
  const labelIn = useEnter(countFrames - 10);

  return (
    <Scene surface={surface} style={{ textAlign: 'center' }}>
      <div style={{ ...h(380), lineHeight: 1, color: p.fg, display: 'flex', alignItems: 'flex-start' }}>
        <span>{prefix}{n.toFixed(decimals)}</span>
        {suffix && <span style={{ marginLeft: 16 * u, fontSize: '0.55em', background: e.fill, color: e.fg, borderRadius: Math.min(style.radius, 24) * u, padding: `0 ${24 * u}px`, transform: `scale(${pop})`, display: 'inline-block' }}>{suffix}</span>}
      </div>
      <div style={{ marginTop: 50 * u, fontFamily: body, fontWeight: 500, fontSize: 60 * u, color: p.sub, padding: `0 ${100 * u}px`, ...rise(labelIn, 30 * u) }}>{label}</div>
    </Scene>
  );
};
