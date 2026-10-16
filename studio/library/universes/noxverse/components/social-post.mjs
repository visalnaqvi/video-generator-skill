// Phone social-media post: a card with a wordless header (avatar + name bars), a photo, the action icons and,
// on its word, one comment that pops in as a pink bubble. The comment text must be the script's own words.
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/social-post', size: ({ scale = 1 }) => [Math.round(820 * scale), Math.round(1180 * scale)],
  description: 'Social-media post on a phone (photo + action icons) with one comment that pops in on its word. Header is wordless; the comment uses the script\'s on-screen words.',
  defaults: { z: 0.5, shadow: 'soft', enter: { preset: 'rise' } },
  props: { photo: 'lib:universes/noxverse/scenes/gold-coin.png', comment: '', commentAt: null, scale: 1 },
  params: {
    photo: 'image in the post (lib: path or video asset)',
    comment: 'comment text — words from the script (ON-SCREEN); empty = no comment',
    commentAt: '{sync|at} — when the comment pops in (default: 1 s after the post appears)',
    scale: 'size factor (1 = 820×1180 px)',
  },
  example: { type: 'component', use: 'noxverse/social-post', x: 50, y: 50, props: { comment: 'LOST IN WORLD WAR II', commentAt: { sync: 'comments' } } },
};

export default ({ photo, comment, commentAt, scale = 1 }, { at }) => {
  const c = when(commentAt, at + 30);
  const k = (v) => Math.round(v * scale);
  const pop = { preset: 'pop', at: c, dur: 8 };
  return [
    { type: 'shape', shape: 'rect', x: 50, y: 50, w: k(820), h: k(1180), radius: k(56), fill: 'secondary', stroke: 'white/15', strokeWidth: 3 },
    { type: 'shape', shape: 'circle', x: 11, y: 6, w: k(70), h: k(70), fill: 'white/25' },
    { type: 'shape', shape: 'rect', x: 34, y: 5, w: k(240), h: k(20), radius: k(10), fill: 'white/45' },
    { type: 'shape', shape: 'rect', x: 29, y: 8.2, w: k(160), h: k(14), radius: k(7), fill: 'white/20' },
    { type: 'icon', name: 'MoreHorizontal', size: k(44), color: 'white/60', x: 90, y: 6 },
    { type: 'shape', shape: 'rect', x: 50, y: 44, w: k(760), h: k(760), radius: k(24), fill: 'primary' },
    { type: 'image', src: photo, x: 50, y: 44, w: k(620), h: k(620), fit: 'contain' },
    { type: 'icon', name: 'Heart', size: k(50), color: 'white', x: 9, y: 80 },
    { type: 'icon', name: 'MessageCircle', size: k(50), color: 'white', x: 19, y: 80 },
    { type: 'icon', name: 'Send', size: k(50), color: 'white', x: 29, y: 80 },
    { type: 'icon', name: 'Bookmark', size: k(50), color: 'white', x: 91, y: 80 },
    { type: 'shape', shape: 'rect', x: 24, y: 86, w: k(300), h: k(16), radius: k(8), fill: 'white/30' },
    ...(comment ? [
      { type: 'shape', shape: 'rect', x: 56.5, y: 93.5, w: k(660), h: k(110), radius: k(40), fill: 'accent', enter: pop },
      { type: 'shape', shape: 'circle', x: 9, y: 93.5, w: k(64), h: k(64), fill: 'white/40', enter: pop },
      { type: 'text', text: comment, font: 'heading', size: k(40), weight: 800, color: 'white', x: 56.5, y: 93.5, enter: pop },
    ] : []),
  ];
};
