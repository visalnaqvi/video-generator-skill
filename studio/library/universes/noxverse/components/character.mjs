// A Noxverse character in a pose (full body) or as a head-and-shoulders bust — live by default:
// drawn every frame by the rig (breathing, blinks, glances, weight shift, sweat drip), see
// studio/remotion/src/compose/rig.tsx. `live: false` places the still PNG with a `breathe` loop.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHARS = join(dirname(fileURLToPath(import.meta.url)), '..', 'characters');

export const meta = {
  name: 'noxverse/character', size: ({ head, h }) => (head ? [Math.round((h * 680) / 640), h] : [Math.round(h * 0.64), h]),
  description: 'Noxverse character by pose or bust (see characters/<name>/character.json), alive: breathes, blinks, glances, shifts weight; talks (lip-sync) with talk; acts on words with acting (pose changes, gestures, looks). Feet sit at ~92% of the box.',
  defaults: { z: 0.6 },
  props: { name: 'nox', pose: 'stand-worried', head: null, h: 780, live: true, idle: null, look: 'center', amount: 1, seed: null, talk: null, acting: null },
  params: {
    name: 'character id (nox, …)', pose: 'pose id (full body)', head: 'head id (bust); overrides pose', h: 'height px',
    live: 'true = animated rig (default); false = still PNG with breathe loop',
    idle: 'calm | nervous | smug | shock | focused | still — default follows the face (worried/sideeye → nervous)',
    look: 'center | left | right | up | down — where the eyes rest (put the threat on that side)',
    amount: 'scales the continuous motion (0.5 = subtler, 1 = default)',
    seed: 'varies blink/glance timing; give two shots of the same pose different seeds',
    acting: '[{ sync: "<word>" | at, pose: "<pose id>" (full body) | face: "<face>" (bust or full body), look: "left|right|up|down|center", do: "nod|shake|shrug|flinch|gulp|take|lookBack|point", hold: frames }] — acting beats on spoken words',
    talk: 'lip-sync to the voice-over (audio/lipsync.json): true = his own dialogue lines (VO (Nox): … in the script; every line if the script has no dialogue tags), "all" = every line (on-screen narrator), or ["L03", …]',
  },
  example: { type: 'component', use: 'noxverse/character', x: 30, y: 63, props: { pose: 'stand-smug', h: 750 } },
};

export default async ({ name, pose, head, h, live, idle, look, amount, seed, talk, acting }) => {
  const w = head ? Math.round((h * 680) / 640) : Math.round(h * 0.64);
  if (live === false) {
    return [{ type: 'image', src: `lib:universes/noxverse/characters/${name}/${head ? `heads/${head}` : `poses/${pose}`}.png`, x: 50, y: 50, w, h, loop: 'breathe' }];
  }
  const ch = JSON.parse(await readFile(join(CHARS, name, 'character.json'), 'utf8'));
  const cfg = head ? ch.heads?.[head] : ch.poses?.[pose];
  if (!cfg) throw new Error(`${name} has no ${head ? `head "${head}"` : `pose "${pose}"`}`);
  const rig = { type: 'rig', rig: 'noxverse', character: name, colors: ch.colors ?? {}, x: 50, y: 50, w, h, look, amount, seed: seed ?? `${name}-${head ?? pose}` };
  if (idle) rig.idle = idle;
  if (talk) rig.talk = talk;
  if (acting?.length) {
    rig.acting = acting.map((b) => {
      const { sync, syncOffset, syncNth, pose: p, ...rest } = b;
      const out = { ...rest };
      if (p) {
        const pc = ch.poses?.[p];
        if (!pc) throw new Error(`${name} has no pose "${p}" (acting beat)`);
        out.pose = { arms: pc.arms, face: pc.face, sweat: pc.sweat ?? false };
      }
      if (b.face && b.sweat == null) out.sweat = head ? ch.heads?.[b.face]?.sweat ?? false : undefined;
      if (out.sweat === undefined) delete out.sweat;
      if (!Number.isFinite(out.at)) console.warn(`! ${name}: acting beat ${sync ? `"${sync}"` : JSON.stringify(b)} has no frame (run fit-timing, or give "at")`);
      return out;
    });
  }
  if (head) rig.bust = { face: head, sweat: cfg.sweat ?? false };
  else rig.pose = { arms: cfg.arms, face: cfg.face, sweat: cfg.sweat ?? false };
  return [rig];
};
