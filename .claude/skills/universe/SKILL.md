---
name: universe
description: Manages this studio's animated universes (studio/library/universes/) — named worlds like the Noxverse with recurring characters (Nox) drawn on a shared rig, their scene art, reusable components (score bar, rubber stamp, ID card, TV news screen, searchlight, vote buttons), story formats and look/animation rules. Use when the user names a universe or one of its characters for a video ("make a reel with Nox", "in the Noxverse"), asks what universes/characters exist, wants a new character, pose, scene, component or format added to a universe, wants a whole new universe (a new animation style), or asks to save elements of a finished universe video for reuse. Never apply a universe the user didn't name.
---

# Universe — named worlds, characters and their animation kit

A universe is a self-contained animation style: its own palette (`brand.json`), character rig,
characters, scene art, components, story formats and look rules. Layout and rules:
`studio/library/README.md`.

**Opt-in only.** A universe is used only when the user names it or one of its characters in the
request. Never suggest, ask about or apply a universe otherwise — those videos follow the regular
pipeline (concepts, styles, brand kit, assets). A client brand is combined with a universe only
when the user explicitly asks for both.

```
node studio/scripts/library.mjs                      # universes + shared music/sfx
node studio/scripts/library.mjs <universe>           # one universe: characters, scenes, components, formats
node studio/scripts/library.mjs who <character>      # "Nox" → noxverse
node studio/scripts/library.mjs component <u>/<name> # params + example
node studio/scripts/library.mjs character <id>       # poses, heads, animation rules
```

Visual check = one image: `characters/<id>/sheet.png`, `scenes/sheet.png`, `components/catalog.png`,
`look-frames.png`.

## Using a universe in a video

When the user names one (or a character — resolve it with `who`):

1. **write** records it in `brief.md` front matter: `universe: <id>` and `characters: <id, …>`
   (no `brand:` unless the user explicitly asked for a client brand too). If the user names a
   format ("a Day One reel") or the request fits one, the write stage follows
   `universes/<u>/formats/<format>.md`.
2. **storyboard** skips inventing a style: the concept is the universe's look (`look.md`) adapted
   to this script; characters, scene art and components come from the universe. Style frames are
   still shown for approval. Missing pieces (a pose, a location, an element) are added to the
   universe below, then used.
3. **voiceover** auditions the universe's default voice (`universe.json` → `voice`) first.
4. **render** follows the universe's music/sound notes.
5. `storyboard.json` gets `"universe": "<id>"` (palette from the universe when there is no `brand`).

## Growing a universe (additive only)

Never change what an existing character, pose, scene file or component renders by default —
finished videos re-render from them. A different look → a new id or an opt-in prop. Show the
user one sheet before calling an addition done.

1. **Pose / bust** — add to `characters/<id>/character.json` → `poses` ({arms, face, sweat}) or
   `heads`; run `node studio/library/universes/<u>/rig.mjs <id>`; look at `sheet.png`; describe it
   in `poseNotes` / `headNotes`. New arm positions or expressions go into `rig-parts.mjs` (`ARMS`, `FACE_PARTS` — eyes as
   dot/arc entries, brows and mouth separate, so the live rig can blink and move them) so every
   character in the universe gets them; check the live version in `characters/nox/demo/storyboard.json`. A new face also needs a
   `MOUTH_MOOD` entry (how talking mouths bend to it); check `node …/rig.mjs <id> --mouths` → `mouths.png`.
   A speaking character has a saved `voice` in character.json (engine, name, rate, pitch,
   status) used for its `VO (<Name>): …` dialogue in every video; audition it once with the
   voiceover skill and keep it.
   New arm poses (ARMS in rig-parts.mjs) blend with every other pose automatically (joints are
   matched, 3-point arms become 4); add an ARM_LIFE entry saying how each arm behaves alive.
   **Views and walks:** the live rig turns (state `yaw` / `headYaw`, any angle) and walks (`walk`
   phase) through `poseTurned` in rig-parts.mjs — face features wrap round the head, cap peak and
   back strap swing round, torso details wrap round an oval section, far limbs go behind. A new
   part (hair, glasses, a bag) needs its turned drawing too: wrap front details with `wrapAround`
   (head) / `wrapTorso` (body) and give side/back details their own angle. Check every addition
   on `node …/rig.mjs <id> --views` → `characters/<id>/views.png` (turnaround, turned poses,
   head-only turn, walk cycle) before using it.
2. **New character in a universe** — new `characters/<id>/character.json` on the same rig:
   `colors` overrides (cap, hood, jeans, head…), poses, heads, description. A part the rig doesn't
   have yet (hair, glasses, another hat) is added to `rig-parts.mjs` as an optional part whose default
   keeps existing characters unchanged. Build, show the sheet, get approval, list it in
   `universe.json` → `characters`.
3. **Scene art** — SVG function + `RUN` entry in `scenes/make.mjs`; `node …/scenes/make.mjs <id>`;
   add `{id, file, kind bg|fg|prop, size, tags, hints}` to `scenes/index.json` (hints: floor line,
   screen hole, where hands/props sit).
3b. **Set** (a location, lit and alive — preferred over a single background for any place characters
   stand in) — `sets/<id>.json`: `layers` split by depth (sky z ≈ 0.05 · far horizon 0.15 · ground
   0.4 · mid props 0.5 · `front: true` foreground occluders 0.85–0.95), `lights` (every light
   source visible in the art: moon, windows, street lamps, signs, TV — the art itself leaves them
   dim; the light gives the glow), `ambient`, `atmosphere`, `focus`, 2–4 `ambient` life layers,
   and `stage` notes (horizon, vanish point, floor, character height by feet position, best
   angles, props that fit).
   **Set art — local AI (route B, chosen 2026-10-15; free, on this PC's GPU):**
   1. Draw the location's layout code-first in `scenes/make.mjs` (horizon, vanishing point, where
      the light sources and props stand) and flatten it at 1088×1920 as the init image.
   2. `node studio/scripts/ai-art/comfy.mjs detail --init <init.png> --prompt "<universe style +
      location>" --denoise 0.85–0.9 --n 4 --out <dir>/<set>.png` (Flux.1-schnell, ~20 s each). Keep
      the universe's look words in every prompt (Noxverse: flat vector cartoon, clean bold shapes,
      subtle grain, deep navy/indigo/slate with warm amber lights, no people, no text). Show the
      candidates as one sheet; the user picks. `gen` (text only) is for looser establishing shots.
   3. **Grade to the universe's palette** (always — AI art drifts in colour, e.g. teal-green on a navy
      world): `node studio/scripts/ai-art/grade.mjs --image <pick.png> --ref <init.png> --out
      <graded.png> --horizon <%> --ref-horizon <%>` matches the colour tone to the code-drawn
      reference (sky to sky, land to land, in Lab), keeps warm lights and bright highlights (moon,
      windows, lamps) their own colour; `--l-amount` (default 0.6) sets how far brightness follows.
      Check it next to the reference; use the graded image from here on.
   4. `<comfyRoot>/python_embeded/python.exe -s studio/scripts/ai-art/depth.py <graded.png> <depth.png>`,
      then `node studio/scripts/ai-art/split.mjs --image <graded.png> --depth <depth.png> --out
      <dir>/<set> --horizon <%>` → backdrop / ground / near planes at 2×.
   5. Write `sets/<id>.json` from the planes (`<set>-planes.json` lists the layers): measure the
      horizon and every light source on the image and put a scene light on each, add ambient
      life and stage notes. `comfy.mjs stop` frees the GPU afterwards.
   Batch: list every location in `sets/prompts.json` (location words; the universe `style` words
   are shared) and run `node studio/scripts/ai-art/batch.mjs <u>/sets/prompts.json [ids] --n 4` →
   `sets/<id>/cands.png` per location; after the pick, `node studio/scripts/ai-art/finish.mjs
   <u>/sets/<id> --pick <n> --horizon <%> --ref-horizon <%>` does grade + depth + split in one go
   (interiors: `--horizon 0 --sky -1`; a counter, desk or ledge that fills whole rows:
   `--front-below <y%>`). Foreground planes a character must stand *behind* (counters, fences,
   door frames) get `"front": true` in the set — set layers otherwise draw behind the shot's
   characters whatever their z. Place each character from the set's `stage` notes and check a
   still: never in water, on a wall or in front of a counter.
   Characters stay rig-drawn (never AI) so they stay identical across videos. Pilot and settings:
   `universes/noxverse/demo/ai-art/README.md`. Code-only planes (`<set>-sky`, `-far`, `-field`… in
   `scenes/make.mjs`) are the fallback when the GPU tools are unavailable. Props placed in sets get a
   `-prop` version without a baked ground patch. Check it with one test shot (a character standing in it) at `demo/<set>/`
   before calling it done; the storyboard uses it as `"set": "<u>/<id>"` (compose.md →
   "Scene light and depth"). Existing flat backgrounds stay as they are (finished videos use
   them); a set is a new id.
4. **Component** — `components/<name>.mjs` with `meta` (`name: '<u>/<name>'`, description, size
   `[w,h] | 'frame' | props => [w,h]`, defaults, props, params, example) and
   `default (props, { at, w, h, format }) => layers` (% of the component box; colours as brand
   roles; timed moments as `{ sync }`/`{ at }` read with `when()` from `_util.mjs`). Add a scene
   using it to `components/demo/storyboard.json`; `node studio/scripts/library.mjs catalog <u>`;
   look once; list it in `universe.json`.
5. **Format** — `formats/<id>.md`: writing pattern (hook, spine, turn, ending, fact rules) + which
   components carry it.

## A new universe (a new animation style)

Only when the user asks. Agree the name, the style (e.g. paper cut-out, clay, whiteboard, anime
flat) and the lead character first. Then create `universes/<id>/`: `universe.json` (use the
Noxverse one as the template, including `useWhen`), `brand.json` (palette + fonts, roles as in a
brand kit), `rig-parts.mjs` + `rig.mjs` (its own body/drawing style as SVG parts with the same `makeRig` + animation-state contract, plus `RIG_META = { feet, views, walk: { stride } }` (where the full body meets the ground, % of its box, so lighting and ground shadows work; `views: true` only once the rig draws turned views and walks from `yaw`/`headYaw`/`walk` state — check with a `--views` sheet); registered in `studio/remotion/src/compose/rig.tsx` → `RIGS`; `build(id)` for the PNGs), the lead character,
its first sets (above — scene light and ambient life are universe-neutral, each universe only
chooses its own values), its components, `look.md` with a **Light and depth** section (night/day
ambient tint, haze colour, rim-light habits, which ambient life fits the world),
`components/demo/storyboard.json` + catalog. Free,
code-drawn first; AI-generated art only with the user's approval of a cost estimate.

## Saving from a finished video (only when asked)

When the user asks to keep elements of a finished universe video: list candidates (new art the
video drew, layer patterns repeated across shots, new sounds), let the user pick, add them to the
universe as above. If the video's own files move into the universe: rewrite its paths to `lib:`,
re-render its contact sheet with old and new paths and confirm pixel-identical, then refresh the
fingerprint in `render/final.json` with a migration note so it stays final; not identical → leave
the video's files where they were.
