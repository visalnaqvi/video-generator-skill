// Writes the Noxverse AI set files (sets/<id>.json) from the measured art: lights on the art's own light
// sources, ambient life, stage notes. Image positions are measured in % of the generated picture and
// converted to frame % (planes are placed at 1160×2062, 7.4 % oversize). Re-run after re-picking a set:
//   node studio/library/universes/noxverse/sets/make-sets.cjs [id …]
// prairie-road-ai.json was written by hand (the pilot) and is not touched here.
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const F = (p) => +(50 + (p - 50) * 1.074).toFixed(1);
const L = (id, kind, ix, iy, o) => ({ id, ...(kind === 'moon' ? { kind: 'moon' } : {}), x: F(ix), y: F(iy), ...o });
const img = (id, set, z, extra = {}) => ({ id, type: 'image', src: `lib:universes/noxverse/sets/${set}/${set}-${id}.png`, x: 50, y: 50, w: 1160, h: 2062, z, ...extra });
const amb = (id, kind, area, o = {}) => ({ id, type: 'ambient', kind, area, ...o });
const night = { ambient: { color: '#4a5a8c', amount: 0.5 }, atmosphere: { color: '#1e2c4c', amount: 0.3 }, focus: { z: 0.65, blur: 4 } };
const frontGrass = amb('grass-front', 'grass', [-5, 92, 110, 8], { front: true, colors: ['#0b1424', '#13203a'], z: 0.92 });
const sky = (s) => img('sky', s, 0.05, { haze: 0.05 });
const ground = (s) => img('ground', s, 0.35);
const near = (s, z = 0.55) => img('near', s, z);
const room = (s) => img('sky', s, 0.2, { haze: 0 });

const SETS = {
  'coast-night-ai': {
    name: 'Coast at night (AI)', pick: 3, tags: ['night', 'sea', 'ocean', 'coast', 'beach', 'shore', 'moon'], ...night,
    desc: 'Calm sea to the horizon under a full moon (top right) with a long reflection, headlands on the horizon, a pebbly beach curving down the left with surf, dune grass on the right.',
    stage: { horizon: 48, floor: 'beach from the surf line (left) to the dunes (right), y 62 % down', scale: 'feet at y 75 % → 520 px · 85 % → 720 px · 95 % → 920 px', bestAngles: ['looking out to sea from the beach', 'back view toward the moon path', 'low angle along the surf line'] },
    lights: [L('moon', 'moon', 78, 20, { color: '#f3e7b8', intensity: 0.5, glow: 130, under: true, z: 0.05 })],
    layers: (s) => [sky(s), amb('stars', 'stars', [0, 0, 100, 40], { count: 30, z: 0.05 }), amb('fog-far', 'fog', [-10, 42, 120, 8], { color: '#6f83b3', count: 6, z: 0.2 }), ground(s), near(s), frontGrass],
  },
  'motel-exterior-ai': {
    name: 'Roadside motel at night (AI)', pick: 2, tags: ['night', 'motel', 'neon', 'parking lot', 'roadside', 'hotel'], ...night,
    desc: 'Pink neon MOTEL pole sign top left, a low row of rooms with lit amber windows and a walkway lamp, an ice machine on the right, a cracked parking lot with neon puddles.',
    stage: { horizon: 52, floor: 'parking lot from y 60 % down', scale: 'feet at y 65 % → 420 px · 75 % → 620 px · 88 % → 880 px', bestAngles: ['wide with the sign and the rooms', 'full shot at a door', 'low angle under the sign'] },
    lights: [
      L('neon', 'point', 22, 12, { color: '#ff3d7f', intensity: 0.85, radius: 1100, glow: 70, flicker: 0.08, z: 0.4 }),
      L('window-1', 'point', 47, 52, { color: '#ffb35a', intensity: 0.5, radius: 320, glow: 30, under: true, z: 0.35 }),
      L('window-2', 'point', 70, 52, { color: '#ffb35a', intensity: 0.5, radius: 320, glow: 30, under: true, z: 0.35 }),
      L('ice', 'point', 90, 56, { color: '#8fe3ff', intensity: 0.3, radius: 220, glow: 20, under: true, z: 0.35, castShadows: false }),
    ],
    layers: (s) => [sky(s), amb('stars', 'stars', [0, 0, 100, 40], { count: 25, z: 0.05 }), ground(s), near(s), amb('moths', 'moths', [64, 45, 12, 7], { count: 5, z: 0.4 })],
  },
  'motel-desk-ai': {
    name: 'Motel front desk (AI)', pick: 2, tags: ['interior', 'motel', 'lobby', 'reception', 'counter', 'front desk', 'hotel'],
    ambient: { color: '#5a4a6e', amount: 0.45 }, atmosphere: { color: '#2a2036', amount: 0.15 }, focus: { z: 0.45, blur: 3 },
    desc: 'Shabby lobby: a hanging lamp, striped plum wallpaper, wall clocks, a key board with pink tags, a clipboard; a wooden counter in front with an open ledger and a pen.',
    stage: { horizon: 0, floor: 'behind the counter: a character stands at x 40–60 behind the counter (near plane: everything below image y 68 % = frame y ≈ 69 %), which hides the legs; z between 0.2 and 0.6', scale: 'clerk or guest behind the counter: h 1000–1150 at y 52–56 (feet below the counter)', bestAngles: ['across the counter (as drawn)', 'close on the ledger and hands', 'over the shoulder of whoever stands at the counter'] },
    lights: [L('lamp', 'point', 30, 8, { color: '#ffd27a', intensity: 0.8, radius: 1200, glow: 60, flicker: 0.06, z: 0.3 })],
    // the counter is drawn in front of whoever stands behind it
    layers: (s) => [room(s), amb('dust', 'dust', [10, 5, 45, 50], { count: 25, z: 0.3 }), { ...near(s, 0.6), front: true }],
  },
  'motel-room-ai': {
    name: 'Motel room at night (AI)', pick: 2, tags: ['interior', 'motel', 'room', 'bedroom', 'tv', 'door', 'hotel'],
    ambient: { color: '#3e4a78', amount: 0.5 }, atmosphere: { color: '#1a2238', amount: 0.15 }, focus: { z: 0.5, blur: 3 },
    desc: 'Dim cheap room: cold blue TV on the left wall, a window with blinds, a warm bedside lamp at the right, the door on the right, worn carpet.',
    stage: { horizon: 0, floor: 'carpet from y 66 % down', scale: 'feet at y 75 % → 640 px · 85 % → 860 px · 95 % → 1080 px', bestAngles: ['from the window side toward the door', 'close on the face lit by the TV', 'back view watching the door'] },
    lights: [
      L('tv', 'point', 10, 42, { color: '#7fd8ff', intensity: 0.7, radius: 900, glow: 40, flicker: 0.35, z: 0.3 }),
      L('lamp', 'point', 75, 56, { color: '#ffb35a', intensity: 0.7, radius: 650, glow: 30, z: 0.35 }),
    ],
    layers: (s) => [room(s), amb('dust', 'dust', [60, 40, 35, 25], { count: 18, z: 0.4 }), near(s, 0.6)],
  },
  'river-night-ai': {
    name: 'River at night (AI)', pick: 2, tags: ['night', 'river', 'forest', 'woods', 'water', 'search', 'moon'], ...night,
    desc: 'A river winding out of a dark pine forest toward the bottom right, moonlight glinting on the water, moon top left, banks with rocks and reeds.',
    stage: { horizon: 40, floor: 'the river fills the middle and bottom; stand characters on the right bank (x 72–92 %, feet at y 72–86 %) — not in the water', scale: 'feet at y 72 % → 560 px · 80 % → 700 px · 86 % → 820 px', bestAngles: ['on the right bank looking upriver (profile-left)', 'high angle down the river', 'back view toward the trees'] },
    lights: [L('moon', 'moon', 30, 10, { color: '#f3e7b8', intensity: 0.5, glow: 110, under: true, z: 0.05 })],
    layers: (s) => [sky(s), amb('stars', 'stars', [0, 0, 100, 35], { count: 30, z: 0.05 }), amb('fog-far', 'fog', [-10, 40, 120, 8], { color: '#6f83b3', count: 6, z: 0.2 }), ground(s), amb('fog-near', 'fog', [-10, 58, 120, 12], { color: '#6f83b3', count: 5, z: 0.45 }), amb('fireflies', 'fireflies', [0, 50, 100, 30], { count: 7, size: 0.8, z: 0.5 }), near(s), frontGrass],
  },
  'farm-porch-ai': {
    name: 'Farmhouse porch at night (AI)', pick: 2, tags: ['night', 'farmhouse', 'house', 'porch', 'yard', 'rural', 'door'], ...night,
    desc: 'A lonely farmhouse seen from the dark yard: one warm porch bulb by the door, a glowing pool on the steps and gravel, a mailbox and fence on the right, tall grass.',
    stage: { horizon: 55, floor: 'yard from y 60 % down; steps at (55 %, 60 %)', scale: 'feet at y 62 % → 380 px · 75 % → 620 px · 88 % → 860 px', bestAngles: ['wide from the yard (as drawn)', 'full shot on the steps in the porch light', 'back view walking up to the door'] },
    lights: [L('porch', 'point', 54, 44, { color: '#ffcf7a', intensity: 0.9, radius: 750, glow: 34, flicker: 0.1, z: 0.35 })],
    layers: (s) => [sky(s), amb('stars', 'stars', [0, 0, 100, 45], { count: 35, z: 0.05 }), ground(s), near(s), amb('moths', 'moths', [48, 40, 12, 7], { count: 5, z: 0.4 }), amb('fireflies', 'fireflies', [0, 58, 100, 25], { count: 6, size: 0.8, z: 0.5 }), frontGrass],
  },
};

const only = process.argv.slice(2);
for (const [id, s] of Object.entries(SETS)) {
  if (only.length && !only.includes(id)) continue;
  const file = path.join(DIR, `${id}.json`);
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const out = {
    id, name: s.name, status: prev.status ?? 'review', created: '2026-10-15', description: s.desc,
    source: `sets/${id}/ — init.png (code layout) → cand-${s.pick}.png = source-ai.png (Flux detail, prompts.json) → source-graded.png (grade.mjs) → planes`,
    tags: s.tags, stage: s.stage, ambient: s.ambient, atmosphere: s.atmosphere, focus: s.focus, lights: s.lights, layers: s.layers(id),
  };
  fs.writeFileSync(file, JSON.stringify(out, null, 1));
}
console.log(JSON.stringify({ written: Object.keys(SETS).filter((id) => !only.length || only.includes(id)) }));
