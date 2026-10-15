# Designing composed scenes

Every scene is `"template": "Composed"` with `props: { background, layers, camera, effects, motionBlur }`.
(Older single-purpose templates in `TEMPLATES.md` still work, but professional boards use
Composed scenes.) Full field list: `studio/remotion/src/compose/types.ts` — read only if
something below is unclear.

## Units and colours

- `x`, `y` = layer centre in **% of the frame**. `anchor: left|right|top|bottom` changes the reference point.
- Sizes (`size`, `w`, `h`) are **px at 1080 wide**; they scale to every format.
- Colours: brand roles `primary secondary accent highlight background surface ink muted`,
  `white`, `black`, with optional opacity `"white/30"`, `"primary/40"`. A raw hex only if the
  brand kit contains it (e.g. a logo colour noted in brand.json).
- Images: `lib:universes/<u>/…` for a universe's characters and scene art (universe videos only),
  `brand:<file>` from the asset library, `logo` for the brand logo, or a path in the
  video's `assets/`. Cut-outs (`*-cutout.png`) float with a drop shadow; use `fade: "bottom"`
  to soften a cut-out's waist line.
- `z` = depth 0 (far) … 1 (near). The camera's movement is multiplied by depth → parallax.

## Layers

| type | Key props | Use |
|------|-----------|-----|
| `text` | `text` (`\n` for lines), `font` heading/body/hand/mono/serif, `size`, `color`, `split` none/lines/words/letters, `stagger`, `outline` (px, ghost type), `highlight` {words, style marker/box/underline/color}, `maxWidth`, `align`, `case` | Every word on screen |
| `image` | `src`, `w`, `h`, `fit`, `mask` circle/arch/blob/diagonal, `radius`, `frame` polaroid/card, `treatment` duotone/grayscale/tint/bright, `border`, `zoom` [from,to], `fade`, `focus` | People, products, places, logos |
| `shape` | `shape` rect/circle/ring/line/blob/burst/triangle/dots/stripes, `w`, `h`, `fill`, `stroke`, `radius`, `grow` left/right/up/down | Panels, bars, halos, accents, buttons |
| `stroke` | `kind` circle/underline/arrow/scribble/check/cross/box/bracket/star, `w`, `h`, `color`, `width`, `roughness` — draws itself on over `enter.dur` | Hand-drawn emphasis (pen, marker) |
| `counter` | `to`, `from`, `prefix`, `suffix`, `frames`, `size`, `font` | Numbers that count |
| `icon` | `name` (lucide PascalCase: Phone, PhoneCall, GraduationCap, BookOpen, Award, Star, Users, MapPin, Clock, CheckCircle2, TrendingUp…), `size`, `color`, `bg` | Clear visual shorthand |
| `particles` | `kind` dots/sparks/bokeh/confetti, `count`, `colors`, `speed` | Atmosphere, celebration |
| `physics` | `bodies` [{`text`, `icon`, `image`, `shape` pill/card/circle, `fill`, `color`, `x`, `at`, `fixed`}], `size`, `stagger`, `gravity`, `bounce`, `floor` (% from top), `walls`, `burst` {at, x, y, strength}, `release` (frame) | Word cards / icons that drop, bounce and pile up (Matter.js); pile bursts apart or falls out |
| `brush` | `w`, `h` (layer box), `marks` [{`kind` ring/underline/arrow/check/cross/scribble/wave/box/blob or `points`, `x y w h` (% of box), `brush` pencil/soft-pencil/hard-pencil/color-pencil/pen/fineliner/charcoal/marker/spray, `color`, `weight`, `fill` + `fillOpacity`/`bleed` (watercolour), `hatch` {gap, angle}, `stroke: "none"`, `at`, `dur`, `reveal`}], `stagger` | Real pencil, charcoal and marker strokes, watercolour washes and hatching (p5.brush), drawn on over time |
| `group` | `layers`, `w`, `h` | Move several layers as one |
| `component` | `use: "<universe>/<name>"`, `props` (timed moments as `{ "sync": "<word>" }`) | **Universe videos only.** A universe's ready element (score bar, stamp, ID card…) — expands into a group at render; list: `library.mjs <universe>`. Characters (`<u>/character`) are **live rigs**: they breathe, blink, glance and shift weight by themselves (`idle`, `look`, `amount`, `seed`) and lip-sync with `talk: true` = only the character's own dialogue lines (`VO (Nox): …` in the script; the voiceover stage builds `audio/lipsync.json`), `"all"` = every line, or line ids ; `acting` beats on words: `{ "sync": "<word>", "pose": "<id>" | "face": "<id>", "look": "right", "do": "nod|shake|shrug|flinch|gulp|take|lookBack|point", "hold": <frames> }` — no `loop` on them |

| `ambient` | `kind` fog/grass/stars/fireflies/moths/dust/rain/snow/traffic, `area` [x, y, w, h] %, `count`, `color`/`colors`, `size`, `speed`, `wind`, `dir`, `seed` | Life in a set: drifting fog bands, wind in grass (a foreground occluder the character stands in), twinkling stars, fireflies, moths round a lamp, dust in a beam, weather, distant traffic |

Every layer: `enter {preset, at, dur}`, `exit`, `loop` float/pulse/sway/spin/breathe,
`shadow` soft/hard/long, `glow`, `rotate`, `opacity`, `blend`. Scene light (below): `lit`,
`rim`, `castShadow`, `feet`, `haze`.
Enter presets: `fade rise drop slideLeft slideRight pop slam blurIn maskUp maskDown maskLeft maskRight zoomOut spinIn flipUp`.

## Background, camera, effects

- `background.kind`: `solid gradient radial mesh paper grid-paper lined-paper photo stripes`
  (+ `colors`, `angle`, `animate`, `image`, `blur`, `dim`, `treatment`).
- `camera`: `from`/`to` {zoom, x, y (% pan), rotate, tiltX, tiltY}, `ease` inOut/out/in/linear,
  `shake` [{at, frames, intensity}], `parallax` (1 = normal, 1.5 = deep).
- `effects`: `grain` · `vignette` · `lightSweep {at, dur, angle}` · `lightLeak {at, dur, colors}` ·
  `flash {at}` · `scanlines`. `motionBlur: true` for fast impact scenes (slower to render).

## Scene light and depth (illustrated worlds: universes, story scenes)

Makes a character stand *in* a place instead of on top of it. Off unless a scene sets it, so
graphic/card scenes are unaffected. Engine: `compose/light.tsx`, `compose/ambient.tsx`.

- **`set: "<universe>/<id>"`** (universe videos) brings a whole location from
  `universes/<u>/sets/<id>.json`: depth-layered art, lights, `ambient`, `atmosphere`, `focus`,
  ambient life. The shot adds only its story: props, characters, its own lights, overlays.
  Order: set layers → the shot's image/rig/ambient layers → set layers marked `front`
  (foreground grass, fence) → the shot's text/components. Shot `lights` add to the set's
  (same `id` replaces, `{ "id": "x", "off": true }` removes); `setHide: [ids]` drops set
  layers/lights; shot `ambient`/`atmosphere`/`focus` replace the set's. Read the set's `stage`
  notes (horizon, floor, character height by feet position, props) before placing anything.
- **`lights`** [{`id`, `kind` point/moon, `x`, `y` (% of frame, may be off-screen), `color`,
  `intensity`, `radius` px, `glow` px (+ `glowAspect`), `beam` {angle, spread, length, opacity},
  `flicker`, `blink` (frames), `at`/`dur` (switch on at a word), `under` (draw at its own
  depth instead of over everything), `z`}]. `moon` = soft directional light (moon, sky, a far
  town); `point` falls off by `radius` (lamp, headlight, phone screen, TV, fire).
- **`ambient`** {color, amount}: the scene's light level on lit layers — night ≈ navy 0.5.
- **`atmosphere`** {color, amount}: far layers fade toward it by amount × (1 − z). Keep the sky
  readable (`haze: 0.1` on the sky layer).
- **`focus`** {z, blur}: depth of field; put focus on the character's z, blur 4–6.
- Layer props: `lit` (default on for rigs), `rim` (default on for rigs, off for images — a
  baked ground patch or box edge would glow), `castShadow` true / {contactOnly, length,
  opacity, dir} (default on for full-body rigs), `feet` (% of the box where it meets the
  ground; rigs know their own), `haze` override.

**Rules that make it read as one world**
1. Every light is motivated by something we can see or infer (moon, lamp, car, screen,
   town). Name it in the shot's `visual`. One key light + one coloured rim light per shot is
   the default; 3–4 light sources at most on a character.
2. Characters always cast at least a contact shadow on a floor; props that touch the ground
   get `castShadow: { "contactOnly": true }` plus a grass/fog band over their base.
3. Something in front of the character on most shots (grass, fence, counter, a doorframe) —
   depth comes from overlap, not only from parallax.
4. 2–4 ambient life layers per location, subtle: they should be felt, not watched. Never
   add life that raises a story question (a passing car in a "nobody came" scene).
5. Props drawn for sets have **no baked ground patch** (the set supplies the ground);
   use the `-prop` version of a scene image when there is one.
6. Light changes are story beats: a phone screen switching on at "called", a lamp
   flickering on a scare, headlights sweeping on an arrival — sync them to the word.

## Camera language and character staging (illustrated scenes)

Off unless a shot uses it. Engine: `compose/camera.ts`, `compose/staging.ts`.

- **Framed shots:** give the subject an `id` and set `camera.target` + `camera.shot`:
  `extreme-wide · wide · full · medium (waist up) · medium-close (chest up) · close (head and
  shoulders) · extreme-close (face)`. `shot: ["medium", "close"]` pushes in over the shot (camera
  `ease`); the camera follows the target while it walks. `screen: [x, y]` places the framed part
  (default centre, a little high). `angle`: `eye · low (looks up, power/threat) · high (looks down,
  small/alone) · dutch / dutch-left (unease)`. `handheld` 0.2–0.4 for tense/documentary moments.
  `clamp: false` only when the set art is wide enough. Zooms past ~1.5 need set planes drawn at 2×.
- **Rack focus:** `focus: { z, blur, to, at, dur }` pulls focus from one depth to another (a
  character in the foreground → the thing they look at).
- **Character views** (rigs with `RIG_META.views`): `view` = `front · 3/4-right · profile-right ·
  back-3/4-right · back · back-3/4-left · profile-left · 3/4-left` or degrees (+ = facing screen
  right). Acting beats `{ "sync": "<word>", "turn": "<view>" }` turn the whole body (the head leads),
  `{ "turnHead": "<view>" }` turns only the head (a look over the shoulder), `"turnHead": "body"`
  brings it back.
- **Walks:** `walk: { to: [x, y], at, dur, h, end }` (or a list) — the character faces the way it
  walks (profile across, front toward camera, back away), steps with planted feet, scales to `h`
  (perspective: read the set's `stage.scale`), then turns to `end`. ~1 s per 20 % of frame width
  at full-shot size reads as a calm walk.
- **`fixed: true`** on text/HUD/component layers keeps them on screen while the camera moves
  (titles, call bars, score bars, captions-like labels).

**Coverage rules for a scene with characters** (the board must vary these):
1. Each location opens wide (the set + where the character is), then goes closer as the
   emotion rises; the big line or reaction gets a close or extreme-close.
2. Never two consecutive shots at the same size *and* angle; alternate sides of the subject
   with a cut, but keep screen direction (a character walking right keeps walking right across
   cuts — the 180° rule).
3. Use the back view / over-the-shoulder to show what a character sees (their goal, a threat),
   then cut to their face for the reaction.
4. Low angle for power or threat, high angle for helplessness, dutch for unease — once or twice
   a video, motivated.
5. Movement inside the shot beats camera movement: let characters walk, turn and look; the
   camera follows or pushes slowly.

## Recipes

- **Slam reveal:** key word/number `enter slam` + `camera.shake` at the same frame + `flash` or `lightSweep` 2–4 frames later.
- **Depth portrait:** ghost `outline` name text far (z .1) → halo ring/blob (z .35) → cut-out (z .7, `fade bottom`, shadow long) → lower-third panel + name (z .9); camera slow push + pan, parallax 1.5.
- **Hand-drawn proof:** paper/grid-paper background, `hand` font numbers, `stroke circle` drawn on after the number lands, `check`/`underline` strokes follow.
- **Product/offer showcase:** 2–3 images with `frame card`/`polaroid`, rotated ±4°, staggered `pop`, slight float loop; heading `maskUp`.
- **Quote/testimonial:** big quote text `split words`, person avatar `mask circle` + name; `paper` or soft gradient background.
- **Stat moment:** `counter` large + `suffix` in a highlight shape `pop` at the end + `particles sparks` once.
- **CTA:** logo badge (white circle + `logo`), offer in `hand` font `slam`, button = `shape rect` radius ½h `pop` + `loop pulse` + icon + text; `stroke arrow` pointing at it; `lightSweep` over the button.
- **Pile-up (physics):** 4–8 short word cards (the things the line lists: features,
  subjects, problems) drop one by one and stack at the bottom while a heading holds the top
  third. Keep `floor` above the 9:16 bottom safe band (≈ 78–82) and the heading clear of the
  drop zone. Use it for "all of this" lines: piling problems up, or features landing
  in one place. Exit with `release` (the floor opens and everything falls away) or
  `burst` on the next VO beat. One physics moment per video, two at most: it's a
  signature move.
- **Tactile hand-made (brush):** a `brush` layer over a `paper`/`grid-paper` background: a
  watercolour `blob` (`fill`, `stroke: "none"`) blooms behind the key word, then a `marker`
  or `charcoal` `ring` circles it, a `pencil` `check` or `underline` follows. Brush marks
  are heavier and more textured than `stroke` (rough.js): use `stroke` for clean pen
  doodles, and `brush` when the look should feel physically made. The `marker` brush is
  translucent like a highlighter; use `pen` or `charcoal` for bold dark lines.
- **Kinetic statement:** text `split words` `maskUp` stagger 3–4, one word `highlight`, camera slow push; solid or gradient background.

## Timing

- Frame 0 of the first scene must already show the hook (enter `at` ≤ 2, or `startFrom` on the scene).
- Stagger elements 3–8 frames apart; main message first, decoration after.
- Hold the finished composition long enough to read: ~0.4 s per short line after it lands.
- **Physics:** a card dropped from above the frame takes ~30–40 frames to land and ~15 more
  to settle. The last card's `at` + ~50 frames must fall inside the shot, and the pile
  should settle before the VO line that names it ends. Check a `sheetFrame` after settling.
  Give the pile one soft sound cue (e.g. `"cards landing"`) at the first landing, not one
  per card.
- **Brush:** each mark draws on over its `dur` (default 18 frames, `stagger` 8 between
  marks). Fills (`reveal: bloom`) look best at 18–24 frames, and lines at 10–16. The marks are
  painted once and cached, so the strokes stay still while they reveal.
