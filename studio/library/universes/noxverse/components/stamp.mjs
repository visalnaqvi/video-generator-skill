// Rubber stamp: bordered box + heavy type, slammed on at an angle. Pair with camera shake + flash on the same word.
export const meta = {
  name: 'noxverse/stamp', size: ({ w, h }) => [w + 40, h + 40],
  description: 'Rubber-stamp verdict (FEDERAL FELONY, Payout: $0, ID: deceased). Slams in; sync it to the word.',
  defaults: { rotate: -7, z: 0.7, enter: { preset: 'slam' } },
  props: { text: 'STAMP', w: 760, h: 190, size: 96, color: 'accent', fill: 'background/70' },
  params: { text: 'words from the script', w: 'box px', h: 'box px', size: 'type px', color: 'ink colour', fill: 'box fill' },
  example: { type: 'component', use: 'noxverse/stamp', props: { text: 'FEDERAL FELONY', w: 820, h: 190, size: 84 }, y: 56, sync: 'federal' },
};

export default ({ text, w, h, size, color, fill }) => [
  { type: 'shape', shape: 'rect', x: 50, y: 50, w, h, radius: 14, fill, stroke: color, strokeWidth: 12 },
  { type: 'text', text, font: 'heading', size, weight: 900, color, x: 50, y: 50 },
];
