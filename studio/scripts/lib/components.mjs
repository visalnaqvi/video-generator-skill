// Universe components: reusable, parameterised scene elements that belong to a universe in
// studio/library/universes/<universe>/components/. A storyboard layer
//   { "type": "component", "use": "<universe>/<name>", "props": {…}, x, y, z, rotate, enter, sync, … }
// expands at render time (render.mjs) into a `group` holding the component's layers. Each
// component module exports `meta = { name, description, size: [w, h] | 'frame' | (props) => [w, h],
// defaults, props, params, example }` and `default (props, { at, w, h, format }) => layers`
// (positions in % of the component box). Timed moments inside props are `{ sync }` / `{ at }`
// objects; fit-timing.mjs resolves the spoken words to frames.
import { readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const UNIVERSES = join(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'), 'studio/library/universes');
const FRAME_H = { '9:16': 1920, '16:9': 608, '1:1': 1080, '4:5': 1350 };
const cache = new Map();

export async function load(use) {
  const [universe, name] = String(use).split('/');
  if (!universe || !name) throw new Error(`component "${use}" must be "<universe>/<name>"`);
  if (!cache.has(use)) cache.set(use, import(pathToFileURL(join(UNIVERSES, universe, 'components', `${name}.mjs`)).href));
  return cache.get(use);
}

/** Every component's meta; `universe` limits the list to one universe. */
export async function list(universe) {
  const us = universe ? [universe] : (await readdir(UNIVERSES, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory()).map((d) => d.name);
  const out = [];
  for (const u of us) {
    const files = (await readdir(join(UNIVERSES, u, 'components')).catch(() => [])).filter((f) => f.endsWith('.mjs') && !f.startsWith('_'));
    for (const f of files) out.push((await load(`${u}/${f.slice(0, -4)}`)).meta);
  }
  return out;
}

async function expandLayer(l, format) {
  if (l?.type === 'group') return { ...l, layers: await expandLayers(l.layers, format) };
  if (l?.type !== 'component') return l;
  const mod = await load(l.use).catch((e) => { console.warn(`! component "${l.use}": ${e.message}`); return null; });
  if (!mod) return null;
  const { type, use, props = {}, sync, syncOffset, syncNth, exitSync, exitSyncOffset, exitSyncNth, ...place } = l;
  const frame = mod.meta.size === 'frame';
  const merged = { ...(mod.meta.props ?? {}), ...props };
  const [w, h] = frame ? [1080, FRAME_H[format] ?? 1920] : typeof mod.meta.size === 'function' ? mod.meta.size(merged) : mod.meta.size;
  const d = mod.meta.defaults ?? {};
  const at = place.enter?.at ?? d.enter?.at ?? 0;
  const inner = await mod.default(merged, { at, format, w, h });
  const group = { type: 'group', x: 50, y: 50, w, h, ...d, ...place, enter: place.enter ? { ...(d.enter ?? {}), ...place.enter } : d.enter ?? { preset: 'none' } };
  if (frame) Object.assign(group, { x: 50, y: 50, w, h });
  group.layers = await expandLayers(inner, format);
  return group;
}

async function expandLayers(layers = [], format) {
  return (await Promise.all(layers.map((l) => expandLayer(l, format)))).filter(Boolean);
}

// Universe sets: a whole location (depth-layered art, lights, ambient tint, haze, focus, ambient life) in
// studio/library/universes/<universe>/sets/<id>.json. Scene props `"set": "<universe>/<id>"` expand into
// the set's layers around the shot's own layers:
//   set layers (back) → the shot's stage layers (images, rigs, ambient) → set layers with `front: true`
//   (foreground occluders) → the shot's remaining layers (text, components, …).
// The shot's `lights` add to the set's (same id replaces; `{ "id": "x", "off": true }` removes);
// its ambient/atmosphere/focus replace the set's; `setHide: [ids]` drops set layers or lights.
const STAGE = new Set(['image', 'rig', 'ambient']);
export async function loadSet(use) {
  const [universe, id] = String(use).split('/');
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile(join(UNIVERSES, universe, 'sets', `${id}.json`), 'utf8'));
}

async function expandSet(props) {
  if (!props.set) return props;
  const set = await loadSet(props.set).catch((e) => { console.warn(`! set "${props.set}": ${e.message}`); return null; });
  if (!set) return props;
  const { set: _s, setHide = [], lights = [], layers = [], ...rest } = props;
  const hide = new Set(setHide);
  const keep = (x) => !hide.has(x.id);
  const strip = ({ front, ...l }) => l;
  const back = set.layers.filter((l) => keep(l) && !l.front).map(strip);
  const front = set.layers.filter((l) => keep(l) && l.front).map(strip);
  let cut = -1;
  layers.forEach((l, i) => { if (STAGE.has(l.type)) cut = i; });
  const own = new Map(lights.map((l) => [l.id, l]));
  const merged = [...set.lights.filter((l) => keep(l)).map((l) => own.get(l.id) ?? l), ...lights.filter((l) => !set.lights.some((s) => s.id === l.id))].filter((l) => !l.off);
  return {
    ambient: set.ambient, atmosphere: set.atmosphere, focus: set.focus, ...rest,
    lights: merged,
    layers: [...back, ...layers.slice(0, cut + 1), ...front, ...layers.slice(cut + 1)],
  };
}

export async function expandScene(props, format = '9:16') {
  props = await expandSet(props);
  if (!JSON.stringify(props).includes('"component"')) return props;
  return { ...props, layers: await expandLayers(props.layers, format) };
}
