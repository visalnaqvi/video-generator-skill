import React from 'react';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useCard, useEnter, useHeading, useSurface, useUnit } from '../ui';

export type ListItem = string | { text: string; at?: number };
export type ListCardsProps = { heading?: string; items: ListItem[]; marker?: 'check' | 'number'; surface?: Surface; stagger?: number };

const Row: React.FC<{ text: string; index: number; delay: number; marker: 'check' | 'number'; surface: Surface }> = ({ text, index, delay, marker, surface }) => {
  const { brand } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const card = useCard(surface);
  const c = brand.colors;
  const inP = useEnter(delay);
  const tick = useEnter(delay + 6, 'pop');
  const dot = 120 * u;
  const onAccent = brand.computed?.on?.accent ?? c.ink.hex;
  return (
    <div style={{ ...card.style, display: 'flex', alignItems: 'center', gap: 40 * u, padding: `${40 * u}px ${48 * u}px`, width: 940 * u, ...rise(inP, 50 * u) }}>
      <div style={{ width: dot, height: dot, borderRadius: '50%', background: c.accent.hex, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transform: `scale(${tick})` }}>
        {marker === 'number' ? (
          <span style={{ ...h(60), color: onAccent, textTransform: 'none' }}>{index + 1}</span>
        ) : (
          <svg width={dot * 0.55} height={dot * 0.55} viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke={onAccent} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </div>
      <div style={{ ...h(62), lineHeight: 1.2, color: card.fg }}>{text}</div>
    </div>
  );
};

// Points appear one per beat; each item can set its own start frame (`at`) to match the voice-over.
export const ListCards: React.FC<ListCardsProps> = ({ heading: title, items, marker = 'check', surface = 'background', stagger = 18 }) => {
  const u = useUnit();
  const h = useHeading();
  const p = useSurface(surface);
  const titleIn = useEnter(0);
  return (
    <Scene surface={surface} style={{ gap: 40 * u }}>
      {title && <div style={{ ...h(80), color: p.fg, marginBottom: 24 * u, ...rise(titleIn, 30 * u) }}>{title}</div>}
      {items.map((it, i) => {
        const item = typeof it === 'string' ? { text: it } : it;
        return <Row key={i} text={item.text} index={i} delay={item.at ?? 4 + i * stagger} marker={marker} surface={surface} />;
      })}
    </Scene>
  );
};
