// Two-option vote: outline button · joiner · filled pulsing button. Each option pops on its word.
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/choice-buttons', size: [1080, 200],
  description: 'Audience vote / choice (RUN or RETURN, HIDE or SPEND). The second option is the highlighted one.',
  defaults: { z: 0.8 },
  props: { options: [{ text: 'RUN', sync: 'run' }, { text: 'RETURN', sync: 'return' }], joiner: 'or' },
  params: { options: '[{text, sync|at}] × 2 (second = highlighted)', joiner: 'small word between, or empty' },
  example: { type: 'component', use: 'noxverse/choice-buttons', y: 66, props: { options: [{ text: 'RUN', sync: 'run' }, { text: 'RETURN', sync: 'return' }] } },
};

export default ({ options: [a, b], joiner }, { at }) => {
  const width = (t) => Math.max(300, t.length * 46 + 120), ta = when(a, at), tb = when(b, at + 14);
  return [
    { type: 'shape', shape: 'rect', x: 24, y: 50, w: width(a.text), h: 140, radius: 70, fill: 'secondary', stroke: 'white', strokeWidth: 6, enter: { preset: 'pop', at: ta } },
    { type: 'text', text: a.text, font: 'heading', size: 72, weight: 900, color: 'white', x: 24, y: 50, enter: { preset: 'pop', at: ta } },
    ...(joiner ? [{ type: 'text', text: joiner, font: 'mono', size: 42, color: 'white/60', x: 47, y: 50, enter: { preset: 'fade', at: ta + 12 } }] : []),
    { type: 'shape', shape: 'rect', x: 70, y: 50, w: width(b.text), h: 140, radius: 70, fill: 'accent', loop: 'pulse', enter: { preset: 'pop', at: tb } },
    { type: 'text', text: b.text, font: 'heading', size: 66, weight: 900, color: 'white', x: 70, y: 50, enter: { preset: 'pop', at: tb } },
  ];
};
