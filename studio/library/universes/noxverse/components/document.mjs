// Blank official document (certificate, form, contract): heading bars, text lines, signature line, seal.
export const meta = {
  name: 'noxverse/document', size: [640, 800],
  description: 'Blank official paper (certificate, claim form, contract). Strike it with a brush cross or stamp it.',
  defaults: { rotate: -3, z: 0.5, shadow: 'soft', enter: { preset: 'rise' } },
  props: { lines: 6, seal: true, paper: 'white' },
  params: { lines: 'number of text lines', seal: 'show the round seal', paper: 'paper colour' },
  example: { type: 'component', use: 'noxverse/document', x: 50, y: 53 },
};

export default ({ lines, seal, paper }) => [
  { type: 'shape', shape: 'rect', x: 50, y: 50, w: 620, h: 780, radius: 10, fill: paper, stroke: 'ink/15', strokeWidth: 2 },
  { type: 'shape', shape: 'rect', x: 50, y: 12, w: 420, h: 26, radius: 6, fill: 'ink/70' },
  { type: 'shape', shape: 'rect', x: 50, y: 18, w: 300, h: 14, radius: 6, fill: 'ink/30' },
  ...Array.from({ length: lines }, (_, i) => ({ type: 'shape', shape: 'rect', x: 50, y: 30 + i * 6, w: 500, h: 12, radius: 6, fill: 'ink/15' })),
  { type: 'shape', shape: 'rect', x: 34, y: 80, w: 220, h: 4, fill: 'ink/40' },
  ...(seal ? [{ type: 'shape', shape: 'ring', x: 72, y: 78, w: 130, h: 130, stroke: 'ink/35', strokeWidth: 6 }] : []),
];
