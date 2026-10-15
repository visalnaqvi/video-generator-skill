# Video studio

This folder is a self-contained video production studio. Every video is written,
storyboarded, voiced and rendered here, and stored in its own folder under `videos/`.

## Pipeline

Each stage is a skill in `.claude/skills/`. Stages hand off through files in the
video's folder; each file must be `status: approved` before the next stage runs.

| # | Skill | Reads | Writes | State |
|---|-------|-------|--------|-------|
| 1 | `brand-kit` | client website, logos, brand guide | `studio/brands/<slug>/brand.json`, `swatch.png`, `logo/` (once per client) | built |
| 2 | `write` | user brief + brand `voice`/`facts` | words only: `brief.md`, `hook.md`, `story.md`, `script.md` | built |
| 3 | `storyboard` | `script.md` + `brand.json` + `assets.json` | concept → style frames → composed shots → `storyboard.json`, contact sheet, **PDF deck** (no MP4) | built |
| 4 | `voiceover` | `script.md` + `storyboard.json` | voice audition → `audio/voiceover.mp3`, `timings.json`, storyboard fitted to the voice, first `render/preview.mp4` (free Edge voices; ElevenLabs only when asked/approved) | built |
| 5 | `render` | storyboard (fitted), voice-over, timings | music (library or code-made), SFX from the studio library, captions, mix (-14 LUFS) → `render/final.mp4`, `cover.png`, `qc.json` | built |
| 6 | `produce` | `status.mjs` (reads every stage's files) | runs the stages in order, resumes any video, enforces every approval gate, reports status | built |

Skills hand off through files, never by calling each other. `brand-kit` runs only
when the client has no approved kit; `brief.md` records which kit a video uses
(`brand: <slug>`).

**Universes** (`studio/library/universes/`, skill `universe`): named animation worlds with
recurring characters, a shared character rig, scene art, components and look rules — now the
**Noxverse** with **Nox**. Use one **only when the user names the universe or its character** in
the request; then `brief.md` records `universe:` + `characters:` and its palette replaces the brand
kit. Never suggest or ask about universes otherwise, and combine a client brand with a universe
only when the user explicitly asks — everything else runs the regular pipeline.

## Folder layout

```
studio/library/         universes/<u>/ (rig, characters, scenes, components, formats, look) · music/ · sfx/
                        — browse: node studio/scripts/library.mjs [<universe> | who <character>]
studio/brands/<slug>/   one brand kit per client, reused by every video
videos/<YYYY-MM-DD>-<slug>/
├── assets/          user-provided logos, photos, footage, notes
├── brief.md  hook.md  story.md  script.md
├── storyboard.json
├── audio/
└── render/
```

## Rules

- In this folder, use the local pipeline skills above for video work rather than the
  global `video-studio`, `storyboard-to-ad` or `character-animator` skills, unless the
  user asks for one of those by name.
- Never overwrite an approved file silently: bump `version`, and mark later files
  `stale` when an earlier stage changes.
- Video types and their writing rules live in `.claude/skills/write/playbooks/`.
  Add a new type by adding a playbook with the same sections.
- Save tokens where it doesn't cost quality: let scripts measure and report compact
  JSON, review images as one small contact sheet rather than many full frames, and
  use free drafts (draft voice, low-res preview) before any paid or final generation.

## Working with the user (standing preferences — follow on every PC)

The owner is a freelance digital marketer making client and story videos; casual English,
content often Hinglish. Quality first, but token-conscious.

- **Recommend, then build step by step.** Give the recommendation and the reason first; build in
  stages and stop for approval at each gate. Variants are built side by side and adopted only on
  the user's say-so.
- **Free tools first.** Edge voice, code-made music/SFX, local AI art (ComfyUI + Flux on this
  PC's GPU) are the defaults — including for finals. Paid tools (ElevenLabs, paid image APIs) run
  only after the user asks or approves a cost estimate in chat.
- **Save tokens without losing quality:** scripts print compact JSON; review one contact sheet,
  not many frames; free drafts before any paid or final generation.
- **Single-purpose skills:** write = words only; visuals and direction = storyboard; brand kits =
  brand-kit. Keep `videos/` + `studio/brands/` as they are.
- **Connected beats.** Every script join must make sense to a first-time viewer: one possible
  referent per pronoun (name the person when two people are "he"), a stated reason for every
  action, a time anchor for every new event, and the next beat answers the question the last one
  opened (write skill → script-craft.md §3; show the Joins line). The user has had to repeat this
  — check it before showing any script.
- **Restrained sound.** Only signature moments (≈ 1 cue per 2 s at most), SFX ≈ -12 dB under
  voice and music, no whoosh on every transition (opt-in). Every sound matches what is on screen
  (no footsteps unless the character walks, ambience fits the place, no tone over a silent text
  moment, one ring not two). No "boom" stamp hits in serious or mystery stories.
- **Universes are opt-in.** Use one (Noxverse / Nox) only when the user names it or its
  character; never suggest it; never mix a client brand with a universe unless asked.
- **AI set art keeps the universe's palette.** Always grade AI art to the code-drawn reference
  (`studio/scripts/ai-art/grade.mjs`) and show it next to the reference; the user rejects colour
  drift (e.g. teal-green on the navy Noxverse).
- **Upgrades are proven on test shots,** in a demo folder with a before/after clip — never by
  re-rendering or editing a video the user has already posted. Build every engine/skill upgrade
  universe-neutral (per-universe values live in the universe's files) and off by default, so
  finished videos render unchanged.
- **Git:** the repo is `github.com/visalnaqvi/video-generator-skill`. Commit or push only when
  the user asks; media (`videos/`, demo folders, AI working files) stays out of git.

## Setup on a new PC

`npm run setup` (Node packages, Remotion's browser, the Python voice env) · `npm run setup -- --ai`
(adds ComfyUI + Flux.1-schnell for making new AI sets, ~19 GB, Windows + NVIDIA, checksum-verified)
· `npm run doctor` (health check with the fix for anything missing). Tool paths are per PC
(`studio/scripts/ai-art/paths.mjs`), never hard-coded. Existing sets render without the AI tools.

## Studio setup — status (v1, 2026-10-14)

Status of any video: `node studio/scripts/status.mjs [videos/<video>]`.

Done:
- Installed locally (package.json): Remotion 4.0.535 (+ cli, renderer, bundler,
  transitions, google-fonts, shapes, paths, noise), React 19, rough.js, sharp, culori,
  ffmpeg-static (ffmpeg 6.1 at `require('ffmpeg-static')`), ffprobe-static, TypeScript.
  No system ffmpeg — use the local binary. npm's allow-scripts warning for esbuild and
  ffmpeg-static is harmless (both verified working).
- Remotion project `studio/remotion/` — brand layer (`brand.ts`, `BrandContext.tsx`
  loads the brand's Google Fonts, `ui.tsx` helpers), 8 scene templates, and the `Video`
  composition that plays a `storyboard.json`. Catalogue + storyboard contract:
  **`studio/remotion/TEMPLATES.md`** — read it instead of the template code.
- `studio/scripts/render.mjs` — `--sheet` (contact sheet), `--preview` (540p MP4),
  `--final`. Stages brand logo/assets/audio into `studio/.stage/` (temporary).

- Style system: `src/style.ts` tokens + 7 ready styles in `studio/styles/*.json`
  (swiss-kinetic, clean-premium, bold-gradient, neobrutalism, dark-luxury,
  data-infographic, glass). 5 more are listed as "needs build" in the storyboard skill's
  `styles.md` (exam-paper, whiteboard-doodle, editorial, documentary, pop-art) — build
  only when chosen and approved.
- storyboard skill built (`.claude/skills/storyboard/`): direction playbooks per type,
  `styles.md`, `scripts/beats.mjs` (beat timings from script.md), SKILL.md.

- **Composed-scene engine** (`studio/remotion/src/compose/`): scenes = background + layers
  (text with kinetic splits/highlights, images with masks/treatments/cut-outs, shapes,
  hand-drawn rough.js strokes, counters, lucide icons, particles, Matter.js `physics`
  (cards that drop, stack, burst), p5.brush `brush` marks (pencil/charcoal/marker strokes,
  watercolour fills, hatching — standalone WebGL2 build, painted once and revealed by mask), groups) + camera
  (zoom/pan/tilt/shake, parallax by depth) + effects (grain, vignette, light sweep, light
  leak, flash, scanlines, motion blur). Design guide: `.claude/skills/storyboard/references/compose.md`.
- `studio/scripts/cutout.mjs` — local background removal (@imgly). Its bundled old `sharp`
  can't load in the same process as ours (handled via a child process); npm audit flags
  that nested sharp/zod — accepted, it only processes images the studio chose.
- `studio/scripts/deck.mjs` — client PDF deck (cover, concept, style frames, shot pages,
  approval) via Remotion's chrome-headless-shell (Windows path).
- All 12 styles have token files in `studio/styles/`.
- Extra libraries: @remotion/motion-blur, light-leaks, layout-utils, animation-utils,
  three/@remotion/three/@react-three/fiber, @remotion/lottie, lucide-react.

Next:
1. Stargate storyboard approved (v2).
2. Stargate voice-over approved (free voice en-IN-PrabhatNeural +15%, 33.4 s; video 35 s).
3. Stargate video FINAL (render/final.mp4, 35 s, 13 SFX, QC passed).
4. produce skill built. **Studio v1 closed 2026-10-14** — the user wants to keep iterating
   on quality; see `ROADMAP.md` for the ranked improvement list.
- Render tools: `studio/scripts/make-sfx.mjs` (code-made SFX library → `studio/library/sfx/`,
  cue words → files in index.json), `make-music.mjs` (code-made fallback music with a drop),
  `mix.mjs` (VO + ducked music + SFX → audio/mix.wav), `qc.mjs`; `render.mjs` adds captions
  (`storyboard.captions`) and `--cover`. Music library: `studio/library/music/` (user adds
  free tracks + index.json).
- Live character rig (2026-10-15): universe characters are drawn every frame from
  `<universe>/rig-parts.mjs` by `studio/remotion/src/compose/rig.tsx` (breath, blinks, glances,
  weight shift, lip-sync via `talk` + `studio/scripts/lipsync.mjs` → `audio/lipsync.json`). Dialogue: `VO (Nox): …`
  in script.md is spoken in the character's saved voice; `talk: true` = his lines only; `acting` beats
  on words drive pose changes, looks and gestures (`compose/acting.ts`); `rig.mjs` still
  builds the PNGs, unchanged. Next phases in `ROADMAP.md` §8.
- Scene light and depth (2026-10-15, Phase 1 of ROADMAP §10): lights, lit/rim-lit layers,
  ground shadows, haze, depth of field, `ambient` life layers (`compose/light.tsx`,
  `compose/ambient.tsx`) and universe **sets** (`universes/<u>/sets/<id>.json`, used as
  `"set": "<u>/<id>"`). Universe-neutral; off unless a scene uses it. Guide: compose.md
  "Scene light and depth". Test: `universes/noxverse/demo/scene-depth/`.
- Camera language and staging (2026-10-15, Phase 2): framed shot sizes that follow a target,
  angles, hand-held, rack focus, `fixed` overlays (`compose/camera.ts`); rig views at any angle,
  head/body turns and walks with planted feet (`compose/staging.ts`, `poseTurned` in rig-parts.mjs,
  `RIG_META.views`). Guide: compose.md "Camera language and character staging". Test:
  `universes/noxverse/demo/camera-views/`.
- Local AI set art (2026-10-15, Phase 3 route B): ComfyUI portable v0.40.0 + Flux.1-schnell fp8
  in `<home>/studio-tools/ComfyUI_windows_portable` by default (RTX 5060, ~20 s/image, free), driven by
  `studio/scripts/ai-art/` (`comfy.mjs` gen/detail, `grade.mjs` palette match, `depth.py` Depth Anything V2, `split.mjs` planes;
  per-PC paths via `paths.mjs`; install with `npm run setup -- --ai`). Universe skill → "Sets". Pilot: `universes/noxverse/demo/ai-art/`.
- Storyboard QC for universe boards (2026-10-15, Phase 5): `node studio/scripts/board-check.mjs <video>`
  (coverage + staging: pasted-on characters, framing variety, horizon, foreground, screen direction)
  → storyboard-check.json; status.mjs blocks storyboard approval while it has errors.
- Python lives in `.venv/` (edge-tts for the free voice). Paid tools (ElevenLabs) run only
  after the user asks or approves in chat — never by default.
