import React from 'react';
import { Img, staticFile } from 'remotion';
import { Surface } from '../brand';
import { useBrand } from '../BrandContext';
import { rise, Scene, useCard, useEnter, useHeading, useIsWide, useSurface, useUnit } from '../ui';

export type Person = { name: string; role?: string; photo?: string };
export type NameCardsProps = { heading?: string; people: Person[]; surface?: Surface; stagger?: number };

const initials = (name: string) => name.replace(/^(CA|CMA|Dr|Mr|Ms|Mrs)\.?\s+/i, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

const Card: React.FC<{ person: Person; delay: number; wide: boolean; surface: Surface }> = ({ person, delay, wide, surface }) => {
  const { brand, body } = useBrand();
  const u = useUnit();
  const h = useHeading();
  const card = useCard(surface);
  const c = brand.colors;
  const inP = useEnter(delay);
  const avatar = 170 * u;
  return (
    <div style={{ ...card.style, display: 'flex', alignItems: 'center', gap: 40 * u, padding: `${44 * u}px ${48 * u}px`, width: wide ? 780 * u : 940 * u, borderLeft: card.solid ? `${14 * u}px solid ${c.accent.hex}` : card.style.border, opacity: Math.min(1, inP), transform: `translateX(${(1 - inP) * -120 * u}px)` }}>
      {person.photo ? (
        <Img src={staticFile(person.photo)} style={{ width: avatar, height: avatar, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ ...h(64), width: avatar, height: avatar, borderRadius: '50%', background: c.primary.hex, color: brand.computed?.on?.primary ?? '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textTransform: 'none', letterSpacing: 0 }}>
          {initials(person.name)}
        </div>
      )}
      <div>
        <div style={{ ...h(62), color: card.fg }}>{person.name}</div>
        {person.role && <div style={{ fontFamily: body, fontWeight: 500, fontSize: 40 * u, color: card.sub, marginTop: 10 * u }}>{person.role}</div>}
      </div>
    </div>
  );
};

// People introduced one card at a time: initials avatar (or photo), name, role.
export const NameCards: React.FC<NameCardsProps> = ({ heading: title, people, surface = 'surface', stagger = 14 }) => {
  const u = useUnit();
  const h = useHeading();
  const wide = useIsWide();
  const p = useSurface(surface);
  const titleIn = useEnter(0);
  return (
    <Scene surface={surface}>
      {title && <div style={{ ...h(76), color: p.fg, marginBottom: 64 * u, ...rise(titleIn, 30 * u) }}>{title}</div>}
      <div style={{ display: 'flex', flexDirection: wide ? 'row' : 'column', gap: 44 * u }}>
        {people.map((person, i) => <Card key={i} person={person} delay={6 + i * stagger} wide={wide} surface={surface} />)}
      </div>
    </Scene>
  );
};
