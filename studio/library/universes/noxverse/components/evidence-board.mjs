// Cork evidence board: photos and papers pinned one by one on their words, joined by red string.
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/evidence-board', size: ({ w = 900, h = 680 }) => [w, h],
  description: 'Cork evidence board (an investigation wall). Items (photos, papers, the coin) pin on in turn on their words; red string joins them. Place it on an office wall, or over the shoulder of an investigator.',
  defaults: { z: 0.3 },
  props: { w: 900, h: 680, items: [], strings: [] },
  params: {
    w: 'board width px', h: 'board height px',
    items: '[{ src, x, y (% of board), w, h (px), rotate, treatment, ring: true (pink circle on it), sync|at }] — shown already pinned when no time is given',
    strings: '[[i, j], …] — red string between items i and j (appears with the later one)',
  },
  example: { type: 'component', use: 'noxverse/evidence-board', x: 50, y: 40, props: { items: [{ src: 'lib:universes/noxverse/scenes/gold-coin.png', x: 30, y: 40, w: 220, h: 220 }] } },
};

export default ({ w, h, items, strings }, { at }) => {
  const t = (it) => (it.sync || it.at != null ? when(it, at) : null);
  const show = (k) => (k == null ? {} : { enter: { preset: 'pop', at: k, dur: 8 } });
  const L = [
    { type: 'shape', shape: 'rect', x: 50, y: 50, w, h, radius: 6, fill: '#8a6a4a', stroke: '#3a2a1c', strokeWidth: 16 },
    { type: 'shape', shape: 'dots', x: 50, y: 50, w: w - 30, h: h - 30, fill: '#6f543a', opacity: 0.5 },
  ];
  // strings first (behind the cards): a thin rotated bar from item i to item j
  for (const [i, j] of strings) {
    const a = items[i], b = items[j];
    if (!a || !b) continue;
    const ax = (a.x / 100) * w, ay = (a.y / 100) * h, bx = (b.x / 100) * w, by = (b.y / 100) * h;
    const len = Math.hypot(bx - ax, by - ay), ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    const k = Math.max(t(a) ?? -1, t(b) ?? -1);
    L.push({ type: 'shape', shape: 'rect', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: Math.round(len), h: 5, fill: '#d23a4a', rotate: ang, ...(k >= 0 ? { enter: { preset: 'fade', at: k + 4, dur: 6 } } : {}) });
  }
  for (const it of items) {
    const k = t(it);
    L.push({ type: 'image', src: it.src, x: it.x, y: it.y, w: it.w, h: it.h, rotate: it.rotate ?? 0, frame: it.frame ?? 'polaroid', shadow: 'soft', ...(it.treatment ? { treatment: it.treatment } : {}), ...show(k) });
    L.push({ type: 'shape', shape: 'circle', x: it.x, y: it.y - ((it.h / 2 + 10) / h) * 100, w: 26, h: 26, fill: 'accent', ...show(k) });
    if (it.ring) L.push({ type: 'shape', shape: 'ring', x: it.x + (it.ringDx ?? 0), y: it.y + (it.ringDy ?? 0), w: it.ringSize ?? 120, h: it.ringSize ?? 120, stroke: 'accent', strokeWidth: 8, ...(k != null ? { enter: { preset: 'pop', at: k + 10, dur: 8 } } : {}) });
  }
  return L;
};
