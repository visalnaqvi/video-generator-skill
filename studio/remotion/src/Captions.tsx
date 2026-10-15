import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { useBrand } from './BrandContext';
import { emphasis } from './brand';
import { useUnit } from './ui';

export type CaptionWord = { text: string; start: number; end: number };
/** `speaker`: a character's dialogue (`VO (Nox): …`) — shown with a name tag and an accent outline. */
export type CaptionPhrase = { start: number; end: number; words: CaptionWord[]; speaker?: string };
export type CaptionData = { phrases: CaptionPhrase[]; y?: number; size?: number };
/** Per-shot placement: frames [from, to), optional y (% of frame) or hidden. */
export type CaptionZone = { from: number; to: number; y?: number; hide?: boolean };

// Word-by-word captions: one short phrase at a time on a dark pill; the word being spoken
// is highlighted in the brand's highlight colour. Placement follows the shot's zone.
export const Captions: React.FC<{ data: CaptionData; zones: CaptionZone[] }> = ({ data, zones }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { brand, heading } = useBrand();
  const u = useUnit();
  const t = frame / fps;
  const zone = [...zones].reverse().find((z) => frame >= z.from && frame < z.to);
  if (zone?.hide) return null;
  const i = data.phrases.findIndex((p, k) => t >= p.start - 0.06 && t < Math.min(p.end + 0.35, data.phrases[k + 1]?.start ?? Infinity));
  if (i < 0) return null;
  const p = data.phrases[i];
  const e = emphasis(brand);
  const pop = interpolate(t, [p.start - 0.06, p.start + 0.08], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const size = (data.size ?? 50) * u;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: '50%', top: `${zone?.y ?? data.y ?? 84}%`, transform: `translate(-50%, -50%) scale(${pop})`, maxWidth: 940 * u, textAlign: 'center' }}>
        {p.speaker && (
          <div style={{ display: 'inline-block', marginBottom: 8 * u, padding: `${3 * u}px ${12 * u}px`, borderRadius: 8 * u, background: e.fill, color: e.fg, fontFamily: heading, fontWeight: 900, fontSize: size * 0.52, letterSpacing: '0.12em' }}>
            {p.speaker.toUpperCase()}
          </div>
        )}
        <div />
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: `${6 * u}px ${12 * u}px`, background: 'rgba(8, 12, 28, 0.62)', padding: `${12 * u}px ${22 * u}px`, borderRadius: 18 * u, fontFamily: heading, fontWeight: 800, fontSize: size, lineHeight: 1.15, boxShadow: p.speaker ? `inset 0 0 0 ${3 * u}px ${e.fill}` : undefined }}>
          {p.words.map((w, k) => {
            const next = p.words[k + 1]?.start ?? p.end + 0.35;
            const on = t >= w.start - 0.02 && t < next;
            return (
              <span key={k} style={{ color: on ? e.fg : '#ffffff', background: on ? e.fill : 'transparent', borderRadius: 8 * u, padding: `0 ${8 * u}px`, margin: `0 ${-8 * u}px` }}>
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
