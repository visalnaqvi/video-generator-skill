---
name: storyboard
description: Creates a professional, client-ready storyboard for a video in this studio from an approved script — proposes 2–3 creative concepts (big idea, visual motif, look, motion language), renders style frames for approval, then designs every shot as a layered motion-graphics scene (camera moves, parallax, kinetic type, hand-drawn strokes, cut-out photos from the brand's asset library, light and texture effects) and delivers a contact sheet plus a branded PDF storyboard deck for clients and sales pitches. The storyboard is exactly what the render stage builds. Use when a script is approved and the user wants the storyboard, concept, look, style frames, visuals or direction of a video, or says "storyboard this", "make the storyboard", "change the concept", "redo shot 3". Stage 3 of the studio pipeline (brand-kit + write → storyboard → voiceover → render); owns visuals, never rewrites the script's words.
---

# Storyboard — concept, style frames, shot design, deck

The storyboard **is** the video: the render stage adds voice, music and sound to exactly
these shots. So the bar is a creative, professional piece with clear messaging — never a
slideshow of templates. Quality rules: [references/quality.md](references/quality.md).

Input: approved `script.md` (+ `brief.md`) in `videos/<video>/`, the approved brand kit
(`brand: <slug>`) and its asset library. Output in the video folder:

```
concept/concept.md          the chosen concept (+ the alternatives offered)
concept/style-frames.json   3 hero frames as composed scenes
concept/style-frames.png    their contact sheet
storyboard.json             every shot: composed scene + VO, on-screen text, visual, motion notes
storyboard.md               readable shot table
storyboard-sheet.png        contact sheet of all shots
storyboard-deck.pdf         client-ready deck (cover, concept, style frames, shots, approval)
```

No MP4 at this stage — the first video file comes from the voiceover/render stages, with
sound. Render `--preview` only if the user explicitly asks.

**Read only:** [direction/<type>.md](direction/), [references/compose.md](references/compose.md)
(how to design scenes), [references/quality.md](references/quality.md),
[styles.md](styles.md), the brand kit's `brand.json` + `assets.json`. Don't read engine
source code; don't open asset images unless `assets.json` is unclear.

**Universe videos.** Only when `brief.md` names a `universe:` (the user asked for it or one of
its characters): read `studio/library/universes/<u>/look.md` and `node studio/scripts/library.mjs <u>`
instead of styles.md, and follow the **universe** skill's "Using a universe" steps — the concept is
the universe's look adapted to this script (Step 1 becomes a one-concept confirmation), characters,
scene art (`lib:universes/<u>/…`) and components (`{ "type": "component", "use": "<u>/<name>" }`)
come from the universe, and missing pieces are added to the universe, not drawn one-off.
`storyboard.json` gets `"universe": "<u>"` (+ `brand` only if the brief has one). No `universe:`
in the brief → never use universe assets; follow the steps below as written.

**Universe story videos — fast path: read [references/board-kit.md](references/board-kit.md) first.**
It holds what the user asked for on "Gold in the Backyard": every beat is a **scene where the characters act
the narration** (no explainer cards — words only as overlays on scenes), side roles as named universe
characters, the board written as a small script with `studio/scripts/lib/board-kit.mjs`, held props at
measured hands (`studio/scripts/hands.mjs`), desk props via `<u>/prop`, framing one size wider on the
big-head rig, a big hook title on frame 0, a separate pre-hook clip, and one-beat-at-a-time review renders
(`studio/scripts/render-beats.mjs`, 432p).

**Words are not yours to change.** On-screen text comes from the script's ON-SCREEN lines
(splitting a line across layers, reusing its words as a label, or echoing a word the VO is
speaking — e.g. a handwritten "Kaise?" — is fine; adding new claims, names, numbers or
slogans is not). Need different words → ask, or send the user to the
write skill.

## Step 0 — Inputs

- `script.md` approved; brand kit approved. No kit → stop and offer brand-kit (or default palette).
- Asset library: no `assets.json` → offer the brand-kit asset step first. Make cut-outs of
  people/products you plan to feature: `node studio/scripts/cutout.mjs <image> [...]`
  (creates `<name>-cutout.png`; add it to `assets.json`).
- Beats and timings: `node .claude/skills/storyboard/scripts/beats.mjs videos/<video>/script.md`
- Existing `storyboard.json`: approved → apply only the requested change; draft → resume.

## Step 1 — Creative concepts (user picks one)

Propose **2–3 concepts** that fit the brief, audience, brand and video type
([direction/<type>.md](direction/)). Each concept, in a few lines:

- **Big idea** — the one creative thought that ties the video together.
- **Visual motif** — the recurring device (e.g. red-pen marks on an answer sheet, a
  spotlight, a single brand shape, a phone screen, a map pin).
- **Look** — base style from [styles.md](styles.md) + backgrounds, textures, photo treatment.
- **Colour script** — how the palette moves with the story (e.g. dark tension → brand light).
- **Motion language** — camera behaviour, entrances, transitions, signature moments.
- **Sound** — music mood and key sound moments.

Make them genuinely different (e.g. one grounded in the audience's world, one bold-typographic,
one cinematic). Recommend one. Save the chosen concept (and the others, briefly) to
`concept/concept.md`.

**AI-generated imagery:** if a concept would clearly benefit from images the asset library
can't supply, say what, why and the estimated cost, and ask. Without explicit approval,
design with code-generated visuals only (shapes, type, textures, icons, particles,
strokes, brush marks, physics, real assets).

## Step 2 — Style frames (user approves the look)

Design **3 hero frames** as composed scenes — usually the hook, the key middle moment
(person/product/proof) and the CTA — in `concept/style-frames.json` (same format as
`storyboard.json`, with `sheetFrame` at the moment everything has landed and a `caption`
per scene). Apply [references/quality.md](references/quality.md) fully.

`node studio/scripts/render.mjs videos/<video>/concept/style-frames.json --sheet --scale 0.4 --out videos/<video>/concept/style-frames.png`

Look at the sheet; fix layout problems (overflow, collisions, safe zones, contrast) before
showing it. Present the frames with one line each on how they move. Iterate until approved.

## Step 3 — Shot design (the full board)

Design every shot as a `Composed` scene, extending the approved style frames' language
([references/compose.md](references/compose.md) — layers, camera, effects, recipes):

- Every beat gets ≥ 1 shot; a beat's shots total its `frames` from `beats.mjs` plus the
  outgoing transition. Split long beats so no shot breaks the playbook's max length.
- Reuse the style frames' compositions for their beats; keep motif, type treatment and
  colour script consistent across shots.
- Real assets first (people, offerings, testimonials, places, proof) — rules in `assets.json`
  (`avatar-only` small, never a caption over `bakedText`).
- Universe videos: the universe's components for its recurring elements (one `component` layer,
  timed moments in props as `{ "sync": "<word>" }`) and its scene art (placement hints in
  `scenes/index.json`). **Locations are sets**: every shot in a place uses
  `"set": "<u>/<id>"` (`library.mjs <u>` → `sets`), so it arrives lit, layered and alive; the
  shot adds props, the live rig (never pose PNGs in a set), its motivated lights (headlights,
  phone, lamp) and overlays — rules in compose.md "Scene light and depth". A location the
  universe has no set for yet is built first as a set (universe skill → "Sets"), not drawn as a
  flat one-off background. **Cover scenes like a film** (compose.md → "Camera language and
  character staging"): framed shot sizes on the character (`camera.target` + `shot`), views and
  turns (`view`, `turn`, `turnHead`), walks with planted feet, back views / over-the-shoulder for
  what they see, rack focus, low/high angles when motivated — and follow the coverage rules
  there (wide → closer as emotion rises, no two consecutive shots at the same size and angle,
  keep screen direction). Characters act: give each shot's character `acting` beats on the words
  that motivate them — `{ "sync": "theft", "pose": "hands-up-shock" }`, `{ "sync": "Mostly",
  "do": "shrug" }`, `{ "sync": "door", "look": "right" }` — 2–4 per shot, each one a reaction a
  first-time viewer can read (cause in the VO → reaction on screen), with holds between. Gestures:
  nod, shake, shrug, flinch, gulp, take (double take), lookBack, point. `talk: true` where he speaks.
- Time entrances to the VO: an element lands when its words are spoken (≈ `wps` from beats).
- Preserve the narration's progression across shots. A cut does not require a new
  sentence, spoken heading or pause. Continue an action, object or question into the
  next shot when the script does; do not reset to an unrelated feature card at each
  beat. Passage audio may span several shots and is fitted by word timings.
- Motivated transitions (pushCut on impacts, wipe in the direction of movement, fade for
  time/space jumps); the first shot shows the hook on frame 0 (`at` ≤ 2 or `startFrom`).
- Per shot, also write the deck fields: `vo` (the VO lines spoken during the shot),
  `onScreen` (list), `visual` (what we see, 1–2 sentences), `motion` (how it moves and
  the signature moment), `sfx` cues, `direction` (why).
- Top level: `concept` {title, bigIdea, motif, look, motion, arc, sound, typography} and `music`.

Format: [references/storyboard-format.md](references/storyboard-format.md).

**Missing capability?** If a shot needs something the engine can't do (a layer type,
effect or template), say what's missing and the closest alternative; build it only with
the user's approval (in `studio/remotion/src/compose/`, documented in compose.md). In a universe
video, a reusable element that existing layers can already express becomes a universe component
instead (universe skill) — no engine change needed. When the user asks for a specific animation (e.g. "the
chest comes up out of the hole"), that request is the approval: build the smallest opt-in engine piece (like
the `emerge` enter preset), document it in compose.md, and prove it on a frame strip before the full board.

**Checking frames cheaply:** before a contact sheet or clip, put just the shots you changed into a temporary
board with the `sheetFrame`s you want to see (start, mid-action, landed) and render `--sheet --scale 0.22` —
one small image instead of a preview MP4.

## Step 4 — Review: contact sheet + deck

```
node studio/scripts/render.mjs videos/<video>/storyboard.json --sheet
node studio/scripts/deck.mjs videos/<video>
```

Universe boards (characters in sets) also run the coverage and staging check — it catches what
a contact sheet hides (pasted-on characters, still pose PNGs in a set, feet above the horizon,
repeated framing, front-only boards, a location opening close, no foreground, flipped screen
direction, HUDs zooming with the camera):

```
node studio/scripts/board-check.mjs videos/<video>
```

Errors must be fixed before the board is shown (status.mjs reports the result and blocks
approval while it fails). Fix each warning or say in the shot table why it stays (e.g. "static
on purpose: the stillness before the knock").

Look at the contact sheet once and run the full [quality checklist](references/quality.md)
plus: every beat covered in order · text verbatim · total length within ±10% of the
script estimate. Fix and re-render before showing. Don't open the PDF — it's built from the
same frames; give the user its path.

Show the user: contact sheet, deck path, a compact shot table (shot · time · what happens),
total length, anything flagged. Write `storyboard.md`. Apply changes as JSON edits; re-run
the sheet, then the deck (`--no-render` if only text fields changed).

## Step 5 — Approve and hand off

On approval set `status: approved` in `storyboard.json` and `storyboard.md` and rebuild the
deck so it shows "Approved". Next stage: **voiceover** (it refits shot timings to the real
narration). Keep the closing short: concept, shots, length, deck path.

## Changes later

- "Change the concept/look" → back to Step 1 or 2; keep timings; redesign shots.
- "Redo shot 3" → edit that scene, re-render sheet + deck, bump `version`.
- Script changed after approval → mark `storyboard.json` `stale`; redesign affected beats only.
