// Helpers for writing a universe storyboard as code (a small generator script per video), so shots are
// quick to write, consistent, and re-generate after script changes. Universe-neutral: pass the universe id.
// Example and conventions: .claude/skills/storyboard/references/board-kit.md
//
//   import { kit } from '../../studio/scripts/lib/board-kit.mjs';
//   const k = await kit({ root, video: 'videos/<video>', universe: 'noxverse' });
//   const alex = k.who('alex');
//   k.shot({ id: 'hook', beat: 1, durationInFrames: k.B[0].frames, props: { set: 'noxverse/backyard-night-ai', layers: [ alex({ … }) ] }, vo: […] });
//   await k.write({ concept, music });
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function kit({ root, video, universe, script = 'script.md', out = 'storyboard.json' }) {
  const VID = join(root, video);
  const B = JSON.parse(execFileSync(process.execPath, [join(root, '.claude/skills/storyboard/scripts/beats.mjs'), join(VID, script)], { encoding: 'utf8' })).beats;
  const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
  const words = B.map((b) => b.vo.join(' ').split(/\s+/).map(norm));
  /** Frame (inside a shot that starts `off` frames into the beat) where `word` is spoken — an estimate from the
   *  script's word rate; the voiceover fit replaces it with the real time for anything that also has `sync`. */
  const T = (beat, word, off = 0, nth = 1) => {
    const ws = words[beat - 1], fpw = B[beat - 1].frames / B[beat - 1].words;
    let n = 0; const i = ws.findIndex((w) => w === norm(word) && ++n === nth);
    if (i < 0) throw new Error(`beat ${beat}: no "${word}" (#${nth}) in the script`);
    return Math.max(0, Math.round(i * fpw) - off);
  };
  const colors = (id) => JSON.parse(readFileSync(join(root, 'studio/library/universes', universe, 'characters', id, 'character.json'), 'utf8')).colors ?? {};
  const P = `lib:universes/${universe}/scenes/`;
  const S = [];
  const k = {
    B, T, P, scenes: S,
    pose: (arms, face, sweat = false) => ({ arms, face, sweat }),
    /** live rig layer for a universe character: who('alex')({ x, y, h, view, pose, acting, walk }) */
    who: (id) => (o) => ({ type: 'rig', rig: universe, character: id, colors: colors(id), id, z: 0.6, ...o }),
    solid: { kind: 'solid', colors: ['primary'] },
    night: (v = 0.55) => [{ kind: 'grain', amount: 0.4 }, { kind: 'vignette', amount: v }],
    // overlays stay put while the camera moves (fixed); words must be the script's ON-SCREEN words
    title: (t, o) => ({ type: 'text', text: t, font: 'heading', weight: 900, size: 84, color: 'white', x: 50, fixed: true, shadow: 'soft', ...o }),
    label: (t, o) => ({ type: 'text', text: t, font: 'mono', weight: 700, size: 40, color: 'white/90', tracking: 0.14, x: 50, fixed: true, shadow: 'soft', ...o }),
    panel: (y, w, o = {}) => ({ type: 'shape', shape: 'rect', x: 50, y, w, h: 110, radius: 24, fill: 'secondary/80', fixed: true, ...o }),
    stamp: (t, y, at, sync, o = {}) => ({ type: 'component', use: `${universe}/stamp`, y, sync, fixed: true, enter: { preset: 'slam', at }, props: { text: t, w: 760, h: 150, size: 56, fill: 'secondary/85', ...o } }),
    /** an object ON a set's foreground surface (desk, counter): drawn in front of `front` planes */
    prop: (src, x, y, w, h, o = {}) => ({ type: 'component', use: `${universe}/prop`, x, y, ...(o.enter ? { enter: o.enter } : {}), ...(o.sync ? { sync: o.sync } : {}), props: { src: P + src, w, h, rotate: o.rotate ?? 0, treatment: o.treatment ?? null } }),
    /** an object in a character's hand: put it at the hand measured on a still (references/board-kit.md → "Hands") at the rig's depth */
    held: (src, x, y, w, h, o = {}) => ({ type: 'image', src: P + src, x, y, w, h, z: 0.62, rotate: -10, ...o }),
    shake: (at, sync, o = {}) => ({ at, frames: 8, intensity: 0.6, sync, ...o }),
    shot: (o) => S.push({ template: 'Composed', transition: { type: 'none' }, ...o }),
    /** write the board; checks every beat's frames are covered exactly */
    write: async (top = {}) => {
      const tf = (s) => s.transition?.type && s.transition.type !== 'none' ? s.transition.durationInFrames ?? 10 : 0;
      const per = B.map((b) => [b.beat, b.frames, S.filter((s) => s.beat === b.beat).reduce((a, s) => a + s.durationInFrames - tf(s), 0)]);
      const off = per.filter(([, want, got]) => want !== got);
      if (off.length) console.warn(`! beats not covered exactly (beat, script frames, shot frames): ${JSON.stringify(off)}`);
      // keep foreground occluders (id 'fg') last so the board check sees them in front
      for (const s of S) { const i = s.props?.layers?.findIndex((l) => l.id === 'fg') ?? -1; if (i >= 0) s.props.layers.push(...s.props.layers.splice(i, 1)); }
      const file = join(VID, out);
      const prev = (() => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return {}; } })();
      writeFileSync(file, JSON.stringify({ status: 'draft', version: (prev.version ?? 0) + 1, universe, style: 'data-infographic', format: '9:16', fps: 30, ...top, scenes: S }, null, 1));
      console.log(JSON.stringify({ shots: S.length, seconds: +(S.reduce((a, s) => a + s.durationInFrames - tf(s), 0) / 30).toFixed(1), beats: per }));
    },
  };
  return k;
}
