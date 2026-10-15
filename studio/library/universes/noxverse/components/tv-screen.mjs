// Full-frame old CRT TV: static, then a photo blurs in, then a news banner wipes across.
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/tv-screen', size: 'frame',
  description: 'Old TV close-up showing a face/photo and a news banner (MISSING AT SEA). Add a camera push-in and the scanlines effect.',
  defaults: { z: 0.4 },
  props: { photo: 'lib:universes/noxverse/characters/nox/heads/worried.png', banner: 'BREAKING', photoAt: null, bannerAt: null, screen: 'primary' },
  params: { photo: 'image on screen', banner: 'banner words (from the script)', photoAt: '{sync|at}: static clears, photo appears', bannerAt: '{sync|at}', screen: 'screen colour' },
  example: { type: 'component', use: 'noxverse/tv-screen', props: { banner: 'MISSING AT SEA', photoAt: { sync: 'shows' }, bannerAt: { sync: 'missing' } } },
};

export default ({ photo, banner, photoAt, bannerAt, screen }, { at, h }) => {
  const y = (px) => (px / h) * 100, tp = when(photoAt, at + 30), tb = when(bannerAt, tp + 24);
  return [
    { type: 'shape', shape: 'rect', x: 50, y: y(920), w: 760, h: 580, fill: screen },
    { type: 'particles', kind: 'dots', count: 120, colors: ['white/40'], speed: 2, exit: { preset: 'fade', at: tp, dur: 6 } },
    { type: 'image', src: photo, x: 50, y: y(884), w: 520, h: 489, treatment: 'tint', enter: { preset: 'blurIn', at: tp, dur: 10 } },
    { type: 'shape', shape: 'rect', x: 50, y: y(1121), w: 740, h: 104, fill: 'accent', enter: { preset: 'fade', at: tb, dur: 10 } },
    { type: 'text', text: banner, font: 'heading', size: 72, weight: 900, color: 'white', x: 50, y: y(1121), enter: { preset: 'maskLeft', at: tb + 2 } },
    { type: 'image', src: 'lib:universes/noxverse/scenes/tv-frame.png', x: 50, y: 50, w: 1080, h: 1920 },
  ];
};
