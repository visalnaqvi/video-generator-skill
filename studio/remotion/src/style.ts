// Visual style tokens. A style is data (studio/styles/<id>.json), not code: templates read
// these tokens the same way they read the brand kit.
import type { Surface } from './brand';

export type StyleTokens = {
  id: string;
  /** Card corner radius in px at 1080. */
  radius: number;
  shadow: 'none' | 'soft' | 'hard' | 'glow';
  /** How cards/panels are drawn. */
  card: 'solid' | 'outline' | 'glass' | 'brutal';
  /** Border width in px at 1080 for outline/brutal cards. */
  border: number;
  /** What sits behind every scene. */
  backdrop: 'flat' | 'gradient' | 'glow' | 'mesh' | 'grid' | 'dots' | 'grain';
  headingCase: 'none' | 'upper';
  headingWeight: 700 | 800 | 900;
  /** Heading letter-spacing in em. */
  tracking: number;
  /** Multiplies heading sizes. */
  typeScale: number;
  motion: 'snappy' | 'smooth' | 'bouncy';
  emphasis: 'marker' | 'underline' | 'box' | 'color';
  /** Remap a template's default surface, e.g. { background: 'secondary' } for an all-dark style. */
  surfaceMap?: Partial<Record<Surface, Surface>>;
};

export const defaultStyle: StyleTokens = {
  id: 'default',
  radius: 32,
  shadow: 'soft',
  card: 'solid',
  border: 0,
  backdrop: 'flat',
  headingCase: 'none',
  headingWeight: 800,
  tracking: 0,
  typeScale: 1,
  motion: 'smooth',
  emphasis: 'marker',
};

/** Spring settings per motion feel: [damping for entrances, damping for pops]. */
export const MOTION: Record<StyleTokens['motion'], { enter: { damping: number; mass?: number; stiffness?: number }; pop: { damping: number; mass?: number; stiffness?: number } }> = {
  snappy: { enter: { damping: 200, stiffness: 260, mass: 0.6 }, pop: { damping: 18, stiffness: 260 } },
  smooth: { enter: { damping: 200, mass: 1.1 }, pop: { damping: 20, mass: 1 } },
  bouncy: { enter: { damping: 11, stiffness: 140 }, pop: { damping: 8, stiffness: 180 } },
};
