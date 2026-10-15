#!/usr/bin/env node
// Browse the studio library as compact JSON (one line per item): universes (characters, scene
// art, components, formats, look) plus the shared music and sound effects.
// Universes are used only when the user names one or its character — see the universe skill.
//
//   node studio/scripts/library.mjs                      universes + shared music/sfx (summary)
//   node studio/scripts/library.mjs <universe>           one universe in full (characters, sets, scenes, components, formats)
//   node studio/scripts/library.mjs who <character>      which universe a character belongs to
//   node studio/scripts/library.mjs component <u>/<name> params + example of one component
//   node studio/scripts/library.mjs character <id>       a character's sheet (poses, heads, animation rules)
//   node studio/scripts/library.mjs catalog <universe>   re-render <universe>/components/catalog.png from its demo
import { readFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { list as listComponents, load as loadComponent } from './lib/components.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LIB = join(ROOT, 'studio/library');
const UNI = join(LIB, 'universes');
const json = async (p) => JSON.parse(await readFile(p, 'utf8').catch(() => 'null'));
const dirs = async (p) => (await readdir(p, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory()).map((d) => d.name);
const out = (o) => console.log(Object.entries(o).map(([k, v]) => (Array.isArray(v) ? `${k}:\n${v.map((i) => `  ${JSON.stringify(i)}`).join('\n')}` : `${k}: ${JSON.stringify(v)}`)).join('\n'));
const [cmd, ...args] = process.argv.slice(2);

async function characters(u) {
  return Promise.all((await dirs(join(UNI, u, 'characters'))).map(async (id) => ({ universe: u, ...(await json(join(UNI, u, 'characters', id, 'character.json'))), id })));
}
async function universe(u) {
  const info = await json(join(UNI, u, 'universe.json'));
  if (!info) return null;
  const formats = (await readdir(join(UNI, u, 'formats')).catch(() => [])).filter((f) => f.endsWith('.md')).map((f) => `formats/${f}`);
  return {
    universe: { id: u, name: info.name, tagline: info.tagline, description: info.description, useWhen: info.useWhen, look: `studio/library/universes/${u}/look.md`, music: info.music, voice: info.voice },
    characters: (await characters(u)).map((c) => ({ id: c.id, name: c.name, description: c.description, poses: Object.keys(c.poses ?? {}), heads: Object.keys(c.heads ?? {}), path: `lib:universes/${u}/characters/${c.id}/poses/<pose>.png` })),
    scenes: ((await json(join(UNI, u, 'scenes/index.json')))?.scenes ?? []).map(({ id, kind, size, tags }) => ({ id, kind, size, tags, path: `lib:universes/${u}/scenes/${id}.png` })),
    sets: await Promise.all((await readdir(join(UNI, u, 'sets')).catch(() => [])).filter((f) => f.endsWith('.json')).map(async (f) => { const st = await json(join(UNI, u, 'sets', f)); return { set: `${u}/${st.id}`, name: st.name, tags: st.tags, stage: st.stage, lights: (st.lights ?? []).map((l) => l.id) }; })),
    components: (await listComponents(u)).map(({ name, description }) => ({ name, description })),
    formats,
  };
}

if (!cmd) {
  const us = await dirs(UNI);
  const rows = await Promise.all(us.map(async (u) => { const i = await json(join(UNI, u, 'universe.json')); return { id: u, name: i?.name, tagline: i?.tagline, characters: (await dirs(join(UNI, u, 'characters'))), components: (await listComponents(u)).length }; }));
  const sfx = await json(join(LIB, 'sfx/index.json')) ?? {};
  out({
    universes: rows,
    music: { tracks: ((await json(join(LIB, 'music/index.json')))?.tracks ?? []).map((t) => t.file ?? t.title), generator: 'make-music.mjs --mood upbeat|calm|cinematic|tense [--silence a-b]' },
    sfx: [...(sfx.custom ?? []), ...(sfx.generated ?? [])].map((s) => `${s.file.replace(/\.\w+$/, '')}: ${s.keywords.join('/')}`),
  });
} else if (cmd === 'who') {
  const id = (args[0] ?? '').toLowerCase();
  const hits = [];
  for (const u of await dirs(UNI)) for (const c of await characters(u)) if (c.id === id || c.name?.toLowerCase() === id) hits.push({ character: c.id, name: c.name, universe: u });
  console.log(hits.length ? JSON.stringify(hits) : `No character "${args[0]}" in any universe`);
} else if (cmd === 'component') {
  const m = (await loadComponent(args[0]).catch(() => null))?.meta;
  console.log(m ? JSON.stringify({ ...m, size: typeof m.size === 'function' ? 'computed from props' : m.size }) : `No component "${args[0]}" (use <universe>/<name>)`);
} else if (cmd === 'character') {
  for (const u of await dirs(UNI)) { const c = (await characters(u)).find((x) => x.id === args[0]); if (c) { console.log(JSON.stringify(c)); process.exit(0); } }
  console.log(`No character "${args[0]}"`);
} else if (cmd === 'catalog') {
  execFileSync(process.execPath, [join(ROOT, 'studio/scripts/render.mjs'), join(UNI, args[0], 'components/demo/storyboard.json'), '--sheet', '--scale', '0.4', '--out', join(UNI, args[0], 'components/catalog.png')], { stdio: 'inherit' });
} else {
  const u = await universe(cmd);
  if (u) out(u); else console.log('Usage: library.mjs [<universe> | who <character> | component <universe>/<name> | character <id> | catalog <universe>]');
}
