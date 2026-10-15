# Noxverse — look and animation rules

> The rules below are the Day One defaults (darkly funny, score bar, vote ending). Serious real-case
> videos follow **[formats/true-case.md](formats/true-case.md)**, which tones this look down (no score bar or
> humour, one motif, quiet sound, slower voice). Read the format the brief names first.

The visual bible for every Noxverse video. References: `look-frames.png` (approved style frames)
and `look-board.png` (the 14-shot board of the first video). The storyboard adapts these rules
to each new script; it doesn't copy shots.

## Ingredients

| Part | What | Where |
|------|------|-------|
| Palette + fonts | Night Navy, Ink Black, Motel Neon pink, Case-file Cream; Inter + JetBrains Mono + Caveat | `brand.json` |
| Characters | Nox (and later cast) on the shared rig, **live**: breathes, blinks, glances, shifts weight (idle acting follows the face); acts on words (`acting`: pose changes, looks, gestures); no extra loop; speaks his own dialogue (`VO (Nox): …`, his saved voice) and lip-syncs only those lines (`talk: true`) | `characters/`, `noxverse/character` |
| Scenes | flat-vector night illustrations layered for parallax (bg 0.1 · props 0.4–0.6 · character 0.6–0.7 · fg 0.8) | `scenes/` |
| Cards | cream `paper` background, mono label "PROBLEM n · THE X", heavy Inter statements | — |
| Signature | neon-pink rubber stamps slam with shake + flash on the word | `noxverse/stamp` |
| Score bar | 2–4 columns pinned at the top in every shot from the setup on; changes on the exact word | `noxverse/hud-tally` |
| Props | blank certificate + marker cross, ID card + stamp, TV news banner, helicopter searchlight | `noxverse/document`, `id-card`, `tv-screen`, `searchlight` |
| Ending | character bust in front of a pink glow + two vote buttons + Part 2 line | `noxverse/character` (head), `noxverse/choice-buttons` |

## Shot rhythm (≈ 45–60 s, 12–15 shots, cut every ~3.5 s)

1. Hook on a night scene, title readable on frame 0 (mono kicker + two-line Inter Black title, one word pink).
2. Setup: the plan / the stakes; the big number slams in; the score bar fades in.
3. The turn: a cream card with the statement and a handwritten pink "… yet"-style reversal (Caveat) slammed on the turn word.
4. Problems: alternate a scene shot (what happens) with a card shot (the consequence stamp).
5. Cliffhanger: screen / door / phone in cold blue light; music drops to silence; one sound.
6. Vote card.

## Motion and finish

- Slow pushes (zoom 1.08 → 1.0, ease out), parallax 1.2–1.4; the score bar stays pinned (z 0).
- Stamps: `slam` + camera shake (0.9–1, 10 frames) + white flash 1 frame later, all synced to the word.
- Hard cuts by default; `pushCut` into an impact card; `fade` 12–18 frames for time jumps.
- Grain 0.35–0.5, vignette 0.25 (cards) / 0.55 (night); scanlines 0.2 on screens.
- Colour script: navy night → cream cards → pink neon → cold TV blue → black vote card.
- Captions on (y 83), pink highlight; move them up where a character stands low in frame.

## Light and depth (2026-10-15)

Scene shots use **sets** (`sets/*.json`, `"set": "noxverse/<id>"`), never a single flat background
with a pasted pose. Approved 2026-10-15: `demo/scene-depth/` (Last Call shots 4 and 6, before/after).

- Night default: `ambient` #4a5a8c at 0.5 (navy unlit side), `atmosphere` #1e2c4c at 0.4, sky
  layer `haze` 0.1–0.12 so the stars stay, `focus` on the character's z (blur 5).
- Key light: cool moonlight (#a9bfff, directional, top-left). Rim light: one warm or neon source
  per shot from the story (town glow #f4c66b, taillight/neon Motel pink #ff3d7f, porch lamp
  #ffd27a); screens are cold (#9fd3ff, phone/TV) and switch on on their word.
- Nox is always the live rig in a set (shading, rim, ground shadow come with it); grass, fence
  or a counter overlaps his lower body in most shots.
- Ambient life, subtle: twinkling stars, two fog bands (far + near), wind in the foreground
  grass, a blinking tower beacon or a flickering window; fireflies/moths only where they fit.
- Cards (cream case files) and vote/end cards stay flat — no set lighting.
- Set art is **AI-detailed and graded to this palette** (deep navy / indigo / plum, warm amber
  lights, Motel-pink neon — never teal-green): use the `-ai` sets first; the code-drawn scenes are
  their layouts and the fallback. Story props (car, boat, helicopter, dog, TV) and Nox stay
  code-drawn so they look the same in every video.

## Camera and staging (2026-10-15)

Shots inside a set are covered like a film, not one frontal view: open a location wide, go
closer as it gets tense, close-up on the reaction word; Nox walks (profile across, back toward
a goal, front toward camera), turns his head on sounds and looks over his shoulder; back views
/ over-the-shoulder show what he sees (the town lights, the TV, the door) with a rack focus.
Low angle for threat (headlights, a figure), high angle when he is small and alone. Hand-held
0.2–0.3 only in tense moments. HUDs (score bar, call bar) are `fixed`. Test:
`demo/camera-views/`; turnaround and walk cycle: `characters/nox/views.png`.

## Sound and voice

- Music: `make-music.mjs --mood tense`, lift on the turn word, `--silence` before the cliffhanger sound, ticking clock under the vote.
- SFX: restrained (~10 per minute) — stamps, one pen/marker, one ambience per location, the cliffhanger sound.
- Voice: free `en-US-AndrewMultilingualNeural` at +8% — dry, darkly funny.
