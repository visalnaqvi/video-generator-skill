// Phone-call bar pinned near the top: caller label + a running mm:ss timer. On `end` the timer
// freezes, turns pink and blinks, and the phone icon becomes a hang-up icon (the line went dead).
import { when } from './_util.mjs';

export const meta = {
  name: 'noxverse/call-bar', size: 'frame',
  description: 'Phone-call bar (DAD · 46:52) with a live timer that ticks every second; freezes pink when the call drops. Use in every shot of a phone-call story with the timer value it has at that point.',
  defaults: { z: 0 },
  props: { y: 16.6, label: 'DAD', start: 0, frames: 120, end: null, ended: false },
  params: {
    y: '% of frame (keep ≥ 15 for the 9:16 safe zone)',
    label: 'caller name — words the VO uses (e.g. DAD)',
    start: 'timer value in seconds at the shot start',
    frames: 'shot length in frames (how long the timer ticks)',
    end: '{sync|at} — the moment the line goes dead (timer freezes pink)',
    ended: 'true = the call is already over when the shot starts',
  },
  example: { type: 'component', use: 'noxverse/call-bar', props: { label: 'DAD', start: 2812, frames: 150, end: { sync: 'words' } } },
};

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default ({ y, label, start, frames, end, ended }, { at }) => {
  const fade = { preset: 'fade', at, dur: 8 };
  const stop = ended ? at : end ? when(end, null) : null;
  const L = [
    { type: 'shape', shape: 'rect', x: 50, y, w: 900, h: 130, radius: 65, fill: 'secondary/85', stroke: 'white/15', strokeWidth: 2, enter: fade },
    { type: 'shape', shape: 'circle', x: 16, y, w: 86, h: 86, fill: 'white/12', enter: fade },
    { type: 'text', text: label, font: 'heading', size: 50, weight: 800, color: 'white', align: 'left', anchor: 'left', x: 25, y, enter: fade },
  ];
  // phone icon until the drop, hang-up icon after it
  if (!ended) L.push({ type: 'icon', name: 'Phone', size: 44, color: 'white', x: 16, y, enter: fade, ...(stop != null ? { exit: { preset: 'fade', at: stop, dur: 2 } } : {}) });
  if (stop != null) {
    L.push({ type: 'shape', shape: 'circle', x: 16, y, w: 86, h: 86, fill: 'accent', enter: { preset: 'pop', at: stop, dur: 6 } });
    L.push({ type: 'icon', name: 'PhoneOff', size: 44, color: 'white', x: 16, y, enter: { preset: 'pop', at: stop, dur: 6 } });
  }
  // ticking timer: one text per second until the drop
  const last = stop != null ? stop : at + frames;
  const n = Math.max(1, Math.ceil((last - at) / 30));
  for (let k = 0; k < (ended ? 0 : n); k++) {
    const t0 = at + k * 30, t1 = Math.min(at + (k + 1) * 30, last);
    const isLast = k === n - 1;
    L.push({ type: 'text', text: mmss(start + k), font: 'mono', size: 52, weight: 700, color: 'white/85', x: 80, y,
      enter: k ? { preset: 'fade', at: t0, dur: 1 } : fade, ...(!isLast || stop != null ? { exit: { preset: 'fade', at: t1, dur: 1 } } : {}) });
  }
  if (stop != null) {
    const frozen = ended ? start : start + n - 1;
    L.push({ type: 'text', text: mmss(frozen), font: 'mono', size: 52, weight: 700, color: 'accent', x: 80, y, loop: 'pulse',
      enter: ended ? fade : { preset: 'slam', at: stop, dur: 6 } });
  }
  return L;
};
