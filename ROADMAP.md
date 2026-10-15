# Studio roadmap

## v1 — 2026-10-14 (closed)

First complete pipeline, proven end to end on one video (Stargate / Sanjay Aggarwal Classes
promo, 9:16, 35 s): brand-kit → write → storyboard → voiceover → render, orchestrated by
produce. All free tools (Edge voice, code-made music and SFX, local background removal).
The user approved it as a **first version, not yet fully satisfied** — iterate on quality.

## Improve next (v2 candidates)

Ranked by expected impact on how professional the output feels:

1. **Music** — code-made music is the weakest element. Fill `studio/library/music/` with
   real free tracks (YouTube Audio Library / Pixabay); consider beat-synced cuts.
2. **Motion design depth** — done 2026-10-14: `physics` layer (Matter.js) and `brush` layer
   (p5.brush). Still open: more signature animations in the engine (3D objects via
   @remotion/three, Lottie animations, text effects like glitch/typewriter/3D extrude,
   masked photo reveals, match-cut transitions between shots, zoom-through transitions).
3. **Visual polish per shot** — iterate on the composed scenes against reference videos the
   user considers professional (none collected yet).
4. **Voice** — free Edge voice is decent but plain; the ElevenLabs path is built and gated
   behind approval. Also: per-line emphasis/pace control.
5. **Length control** — the write skill's timing estimate (2.9 wps) was optimistic for real
   voices (~2.5 wps); calibrate so scripts land on target length.
6. **Second-video test** — run a different business and video type (explainer for a clinic,
   café or SaaS) through produce to find what is still Stargate-specific.
7. **Formats** — 16:9 and 1:1 layouts of the same storyboard.
8. **Character animation (Noxverse)** — Phase 1 done 2026-10-15: live rig (`rig-parts.mjs` +
   `compose/rig.tsx`): breathing, blinks, glances, weight shift, follow-through, sweat drip, idle
   moods; test clip `characters/nox/demo/still-vs-live.mp4`. Phase 2 done 2026-10-15: lip-sync — 9
   mouth shapes per emotion (`mouths.png`), `studio/scripts/lipsync.mjs` (word timings + spelling
   rules + loudness → `audio/lipsync.json`), `talk` on the character, nods/brow lifts on stress,
   line-end blinks; test `characters/nox/demo/talking.mp4`. Dialogue done 2026-10-15: `VO (Nox): …` speaker tags, a voice per speaker
   (Nox's saved voice in character.json, provisional Brian Multilingual +10%), turn pauses,
   speaker-tagged captions, `talk: true` = his lines only; demo `characters/nox/demo/dialogue/`.
   Optional upgrade: Rhubarb Lip Sync
   (free, offline, reads the audio itself) — needs the user's OK to download.
   Phase 3 done 2026-10-15: acting (`compose/acting.ts`) — `acting` beats on words: pose changes
   with anticipation/overshoot/settle, face swaps inside blinks, look shifts (eyes → head → body),
   gestures nod/shake/shrug/flinch/gulp/take/lookBack/point; new poses point-*, shrug-*; demo
   `characters/nox/demo/dialogue/render/acting.mp4`. Nox voice approved 2026-10-15 (Brian
   Multilingual +10%).
   Phase 4 2026-10-15: faked-death re-rendered as a variant (`storyboard-live.json`, 7 Nox
   layers → live rig + 18 acting beats; ID photo and TV face stay still) → `render/live/
   final-live.mp4` + `before-after.mp4`. Adopted by the user the same day: storyboard v3 +
   final.mp4 are the live version; stills v2 kept in `render/backup/v2-stills/`. Variant workflow:
   `fit-timing.mjs <video> --storyboard storyboard-live.json` resolves its sync words.
   Next: more gestures/poses as videos need them; dialogue in a real Noxverse script.
9. **Version control** — `git init` (excluding media) when the user wants it.
10. **Scene depth for universes** (plan agreed 2026-10-15: plain backgrounds, pasted-on
    characters, one frontal angle). Phase 1 built 2026-10-15, universe-neutral:
    scene `lights` (moon/point, glow, beam, flicker, blink, switch-on, drawn at their depth),
    lit layers (ambient tint + diffuse shading + rim light via SVG filter on the layer's
    alpha), ground shadows (contact + cast from the key light; rigs declare `RIG_META.feet`),
    `atmosphere` haze by depth, `focus` depth of field, `ambient` life layer (fog, grass,
    stars, fireflies, moths, dust, rain, snow, traffic), and **sets**
    (`universes/<u>/sets/<id>.json`, `"set": "<u>/<id>"` expands at render with the shot's
    own layers/lights merged). First set: noxverse/prairie-road (4 layered planes).
    Approved by the user 2026-10-15. Test (not a re-render of the posted video): `universes/noxverse/demo/scene-depth/`
    (before-after.mp4). Docs: compose.md "Scene light and depth", quality.md, universe skill
    "Sets", noxverse look.md "Light and depth". Existing videos render unchanged (all of it
    is off unless a scene sets lights/atmosphere/focus/set).
    Phase 2 built and approved by the user 2026-10-15: rig views at any angle
    (`yaw`/`headYaw` state → `poseTurned` in rig-parts.mjs; face wraps round the head with a
    profile cheat, cap peak + back strap swing round, oval torso), walk cycle with planted feet
    (`compose/staging.ts`: `view`, `turn`/`turnHead` beats with head-leads-body, `walk` moves with
    perspective scale), camera language (`compose/camera.ts`: shot sizes framing a target and
    following it, push-ins, low/high/dutch angles, hand-held), rack focus, `fixed` overlays,
    lit layers supersampled under zoom, set planes at 2×. Front-view stills unchanged
    (pixel-checked). Turnaround: `characters/nox/views.png` (`rig.mjs nox --views`). Test:
    `universes/noxverse/demo/camera-views/`.
    Phase 3: the user chose route B (local AI) 2026-10-15. Installed ComfyUI portable v0.40.0 +
    Flux.1-schnell fp8 (sha256-verified) in `C:\Users\admin\studio-tools\`; tools in
    `studio/scripts/ai-art/` (comfy.mjs, depth.py, split.mjs); pilot set
    `sets/prairie-road-ai.json` (status pilot) + `universes/noxverse/demo/ai-art/pilot-b.mp4`.
    Approved by the user 2026-10-15 after a colour fix (grade.mjs: AI art graded to the code-drawn
    palette — it had drifted teal-green).
    Phase 4 built and approved by the user 2026-10-15: six more AI sets — coast-night-ai, motel-exterior-ai,
    motel-desk-ai, motel-room-ai, river-night-ai, farm-porch-ai (sets/prompts.json → batch.mjs →
    pick → finish.mjs → make-sets.cjs); review clip `universes/noxverse/demo/ai-sets/ai-sets.mp4`.
    Phase 5 built 2026-10-15: studio/scripts/board-check.mjs — coverage + staging QC for universe
    boards (errors: flat-character, pose-png-in-set, above-horizon; warnings: same-coverage,
    front-only, opens-close, no-foreground, screen-direction, little-life, static, hud-zooms) →
    storyboard-check.json; status.mjs shows check ✓/✗ and blocks approval on errors; storyboard
    skill Step 4, quality.md and produce gate 7 use it. Tested: the posted Last Call and faked-death
    boards fail on exactly the original complaints (pasted-on, repeated framing, front-only); the
    new set-based boards pass. Scene-depth plan (Phases 1–5) complete.
