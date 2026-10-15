// Shape of studio/brands/<slug>/brand.json as templates use it. Arrives via inputProps;
// render.mjs stages the logo into the public dir and sets logo.src.
export type Role = { hex: string; name?: string };
export type RoleName = 'primary' | 'secondary' | 'accent' | 'highlight' | 'background' | 'surface' | 'ink' | 'muted';

export type Brand = {
  name: string;
  colors: Record<'primary' | 'accent' | 'background' | 'surface' | 'ink' | 'muted', Role> &
    Partial<Record<'secondary' | 'highlight', Role>>;
  fonts: {
    heading: { family: string; weights?: number[] };
    body: { family: string; weights?: number[] };
    subsets?: string[];
  };
  logo?: { src?: string; safeBackground?: 'light' | 'dark' | 'any' };
  voice?: { tagline?: string; spokenName?: string };
  computed?: { on?: Partial<Record<RoleName, string>> };
};

export const fallbackBrand: Brand = {
  name: 'Studio',
  colors: {
    primary: { hex: '#3b57a4' }, secondary: { hex: '#03143b' }, accent: { hex: '#ff9635' },
    highlight: { hex: '#ffab5e' }, background: { hex: '#ffffff' }, surface: { hex: '#ecf0f2' },
    ink: { hex: '#22323d' }, muted: { hex: '#69727d' },
  },
  fonts: { heading: { family: 'Montserrat', weights: [700, 800] }, body: { family: 'Montserrat', weights: [400, 500] } },
  computed: { on: { primary: '#ffffff', secondary: '#ffffff', accent: '#22323d', highlight: '#22323d' } },
};

/** Canvas a scene sits on. Text colours follow from it. */
export type Surface = 'background' | 'surface' | 'primary' | 'secondary' | 'accent';

const DARK: Surface[] = ['primary', 'secondary'];
export const isDark = (s: Surface) => DARK.includes(s);

export const alpha = (hex: string, a: number) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

/** bg + text colours for a surface: fg = main text, sub = secondary text. */
export function paint(brand: Brand, surface: Surface) {
  const c = brand.colors;
  const bg = (c[surface] ?? c.primary).hex;
  const on = brand.computed?.on ?? {};
  if (isDark(surface)) {
    const fg = on[surface] ?? '#ffffff';
    return { bg, fg, sub: alpha(fg, 0.78), dark: true };
  }
  if (surface === 'accent') return { bg, fg: on.accent ?? c.ink.hex, sub: on.accent ?? c.ink.hex, dark: false };
  return { bg, fg: c.ink.hex, sub: c.muted.hex, dark: false };
}

/** Colour for marker/emphasis fills and the text that sits on them. */
export function emphasis(brand: Brand) {
  const c = brand.colors;
  const fill = (c.highlight ?? c.accent).hex;
  const on = brand.computed?.on ?? {};
  return { fill, fg: (c.highlight ? on.highlight : on.accent) ?? c.ink.hex };
}
