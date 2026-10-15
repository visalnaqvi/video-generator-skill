// Photo ID card: coloured header band, photo, placeholder text lines (no invented words).
export const meta = {
  name: 'noxverse/id-card', size: [860, 560],
  description: 'ID / badge / licence card with a character head as the photo. Stamp it (e.g. "ID: deceased").',
  defaults: { rotate: -4, z: 0.5, shadow: 'soft', enter: { preset: 'drop' } },
  props: { photo: 'lib:universes/noxverse/characters/nox/heads/worried.png', band: 'primary', card: 'white' },
  params: { photo: 'image path (lib: / brand: / assets/)', band: 'header colour', card: 'card colour' },
  example: { type: 'component', use: 'noxverse/id-card', x: 50, y: 47 },
};

export default ({ photo, band, card }) => [
  { type: 'shape', shape: 'rect', x: 50, y: 50, w: 820, h: 520, radius: 28, fill: card, stroke: 'ink/15', strokeWidth: 2 },
  { type: 'shape', shape: 'rect', x: 50, y: 16, w: 820, h: 96, radius: 0, fill: band },
  { type: 'image', src: photo, x: 26, y: 60, w: 270, h: 254, radius: 18, fit: 'cover' },
  ...[360, 300, 340, 220].map((w, i) => ({ type: 'shape', shape: 'rect', anchor: 'left', x: 47, y: 46 + i * 10, w, h: 18, radius: 9, fill: 'ink/20' })),
];
