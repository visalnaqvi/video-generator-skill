// Score bar pinned near the top: 2–4 columns of LABEL + value (text) or LABEL + bar (0–1).
// Values change on cue: changes [{ field: 'MONEY', to: '$0', sync: 'pay' }, { field: 'TRACES', to: 0.55, sync: 'felony' }].
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/hud-tally', size: 'frame',
  description: 'Persistent score bar (e.g. MONEY / NEW ID / TRACES) that updates on spoken words. Put it in every shot of a story with the values it has at that point.',
  defaults: { z: 0 },
  props: { y: 16.6, fields: [{ label: 'MONEY', value: '$2,000,000' }, { label: 'NEW ID', value: '—' }, { label: 'TRACES', bar: 0.1 }], changes: [] },
  params: { y: '% of frame (keep ≥ 15 for the 9:16 safe zone)', fields: '[{label, value, hot?} | {label, bar 0–1}]', changes: '[{field, to, sync|at}] — value swap (old fades, new slams in pink) or bar growth' },
  example: { type: 'component', use: 'noxverse/hud-tally', props: { fields: [{ label: 'MONEY', value: '$2,000,000' }, { label: 'NEW ID', value: '—' }, { label: 'TRACES', bar: 0.08 }], changes: [{ field: 'MONEY', to: '$0', sync: 'pay' }] } },
};

export default ({ y, fields, changes = [] }, { at }) => {
  const n = fields.length, gap = 84 / n, fade = { preset: 'fade', at, dur: 8 };
  const L = [{ type: 'shape', shape: 'rect', x: 50, y, w: 980, h: 146, radius: 24, fill: 'secondary/85', stroke: 'white/15', strokeWidth: 2, enter: fade }];
  fields.forEach((f, i) => {
    const x = 50 + (i - (n - 1) / 2) * gap;
    const ch = changes.filter((c) => c.field === f.label);
    L.push({ type: 'text', text: f.label, font: 'mono', size: 26, color: 'white/60', tracking: 0.2, x, y: y - 2.1, enter: fade });
    if ('bar' in f) {
      L.push({ type: 'shape', shape: 'rect', x, y: y + 1.9, w: 200, h: 16, radius: 8, fill: 'white/18', enter: fade });
      L.push({ type: 'shape', shape: 'rect', anchor: 'left', x: x - 9.26, y: y + 1.9, w: Math.max(8, 200 * f.bar), h: 16, radius: 8, fill: 'accent', grow: 'right', enter: { preset: 'fade', at: at + 4, dur: 14 } });
      ch.forEach((c) => L.push({ type: 'shape', shape: 'rect', anchor: 'left', x: x - 9.26, y: y + 1.9, w: 200 * c.to, h: 16, radius: 8, fill: 'accent', grow: 'right', enter: { preset: 'fade', at: when(c, at), dur: 16 } }));
      return;
    }
    const size = (v) => (String(v).length > 7 ? 40 : 48);
    const swaps = [{ to: f.value, at, hot: f.hot }, ...ch.map((c) => ({ to: c.to, at: when(c, at), hot: true }))];
    swaps.forEach((s, k) => {
      const next = swaps[k + 1];
      L.push({ type: 'text', text: String(s.to), font: 'heading', size: size(s.to), weight: 800, color: s.hot ? 'accent' : 'white', x, y: y + 1.9,
        enter: k ? { preset: 'slam', at: s.at + 2 } : fade, ...(next ? { exit: { preset: 'fade', at: next.at, dur: 4 } } : {}) });
    });
  });
  return L;
};
