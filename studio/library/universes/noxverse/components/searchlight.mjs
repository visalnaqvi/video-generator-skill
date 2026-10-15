// Full-frame helicopter with a searchlight beam aimed at a target point (beam geometry is computed).
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/searchlight', size: 'frame',
  description: 'Helicopter sweeping a searchlight onto a target (an empty boat, a rooftop, a person). Use over a night background; the target art is a separate layer.',
  defaults: { z: 0.6 },
  props: { heli: { x: 70, y: 31, w: 540 }, target: { x: 36, y: 76 }, beamAt: null },
  params: { heli: '{x, y} % and w px of the helicopter', target: '{x, y} % where the beam spot lands', beamAt: '{sync|at}: the light switches on' },
  example: { type: 'component', use: 'noxverse/searchlight', props: { target: { x: 36, y: 76 }, beamAt: { sync: 'coast' } } },
};

export default ({ heli, target, beamAt }, { at, h: H }) => {
  const hw = heli.w, hh = (hw * 240) / 520;
  // searchlight sits at (150, 176) of the 520x240 helicopter art; the beam spot is at 92.7% of its height
  const top = { x: (heli.x / 100) * 1080 + (150 / 520 - 0.5) * hw, y: (heli.y / 100) * H + (176 / 240 - 0.5) * hh };
  const spot = { x: (target.x / 100) * 1080, y: (target.y / 100) * H };
  const dx = spot.x - top.x, dy = spot.y - top.y, len = Math.hypot(dx, dy);
  const bh = len / 0.927, bw = (bh * 760) / 1500;
  const c = { x: top.x + ((dx / len) * bh) / 2, y: top.y + ((dy / len) * bh) / 2 };
  return [
    { type: 'image', src: 'lib:universes/noxverse/scenes/searchlight-beam.png', x: (c.x / 1080) * 100, y: (c.y / H) * 100, w: bw, h: bh, rotate: (Math.atan2(-dx, dy) * 180) / Math.PI, blend: 'screen', opacity: 0.85, loop: 'sway', enter: { preset: 'fade', at: when(beamAt, at + 14), dur: 10 } },
    { type: 'image', src: 'lib:universes/noxverse/scenes/helicopter.png', x: heli.x, y: heli.y, w: hw, h: hh, enter: { preset: 'slideLeft', at, dur: 24 } },
  ];
};
