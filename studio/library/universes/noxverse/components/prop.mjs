// A story prop (coin, papers, catalogue, phone…) placed ON a set's foreground surface — a desk, counter or ledge.
// Components draw after a set's `front` planes, so the prop sits on top of the desk instead of hiding behind it.
export const meta = {
  name: 'noxverse/prop', size: ({ w = 200, h = 200 }) => [w, h],
  description: 'An object resting on a set foreground surface (desk, counter): draws in front of the set\'s front plane, unlike a plain image layer. Use for coins, papers, books, phones on a desk.',
  defaults: { z: 0.7 },
  props: { src: 'lib:universes/noxverse/scenes/gold-coin.png', w: 200, h: 200, rotate: 0, treatment: null, shadow: 'soft' },
  params: { src: 'image (lib: path)', w: 'px', h: 'px', rotate: 'degrees', treatment: 'grayscale | duotone | tint | bright', shadow: 'soft | none' },
  example: { type: 'component', use: 'noxverse/prop', x: 50, y: 60, props: { src: 'lib:universes/noxverse/scenes/paper-doc.png', w: 180, h: 240, rotate: -8 } },
};

export default ({ src, w, h, rotate, treatment, shadow }) => [
  { type: 'image', src, x: 50, y: 50, w, h, rotate, ...(treatment ? { treatment } : {}), ...(shadow && shadow !== 'none' ? { shadow } : {}) },
];
