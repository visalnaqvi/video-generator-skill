# Universe story boards — fast path (learned on "Gold in the Backyard", 2026-10-16)

Read with compose.md for any universe story video. Reference video: `videos/2026-10-16-gold-in-the-backyard/`
(board scripts in its `board/` folder, final in `render/final.mp4`).

## 1. Story first — scenes, not explainer cards (user rule)

The user rejected a board where 10 of 21 shots were explainer cards. **Every beat is a scene where the
characters act out the narration**; the script's ON-SCREEN words appear only as overlays and stamps *on* those
scenes (title, label, panel, stamp, call bar, phone post). A cream card is allowed only when nothing can be
acted (aim: zero). Translate an explanation into an action:

| Narration says | Show instead |
|---|---|
| "collectors pay far more… but ask where it came from" | buyer reaches out with cash, stops, pulls it back, "?" over his head |
| "he forges papers" / "the will never mentions a coin" | a character holds up / reads the paper (held prop) |
| "she knows that coin, from a catalogue photo" | her phone laid on the open catalogue: two photos of one coin side by side |
| "they compare every scratch… exact match" | magnifier slides from coin to coin, rings on the same scratch |
| "he tells the investigators" | phone at the ear + call bar with who he calls |
| "they suspect Alex" | investigator pins Alex's photo on the evidence board, ring round it |
| "the house belonged to a soldier" | a 1945 photo drops into the empty location shot |
| "so he decides to hide it" | he picks the thing up and carries it off |

Give every new side role a **named** universe character (Victor the collector, Mira the curator) so later
videos can reuse them, and say who plays the unnamed roles (Nox = the investigator).

## 2. Write the board as a small script

`studio/scripts/lib/board-kit.mjs` (`kit({ root, video, universe })`) gives word timings from the script
(`T(beat, word, offsetInBeat, nth)`), character rigs (`who('alex')`), `pose()`, overlays (`title`, `label`,
`panel`, `stamp`), `prop` (on a desk), `held` (in a hand), `shake`, `shot()` and `write()` (checks every beat's
frames are covered). Keep the script in `videos/<video>/board/gen-board.mjs`, re-run it after any change, then
fit to the voice. Split a beat into shots **at words** (`T(b, 'so')`), never at guessed frames.

Timing conventions that survive re-fitting:
- Everything that lands on a word gets `sync` (+ `syncOffset` frames, `syncNth` for a repeated word) — layers,
  acting beats on rigs, lights that switch on, effects, camera shakes, sfx, component props. `fit-timing.mjs`
  resolves all of them (rig acting and lights since 2026-10-16).
- Two beats on the same word = same `sync`, different `syncOffset` (not `at: T(...) + 4`).
- `exitSync` for a layer that leaves on a word (a closed chest swapped for the open one).
- A shot that should open in a pause before its words: `leadIn: <seconds>`.
- Need room for an action (a walk, a reaction)? Split the VO line into separate `VO:` lines in the script and
  give the voice line a `pauseAfter` (voiceover), e.g. 1.2 s after "So he decides to hide it." for the carry.

## 3. Framing on the big-head rig

The head is ~40 % of the body, so shot sizes read one size tighter than film: `medium` already shows only
head + chest. Use `wide`/`full` for most shots, `medium` for the reaction beat, `medium-close` almost never.
Set `screen: [x, 58–64]` so the cap clears titles at y 14–25. Two characters behind one desk: h ≈ 860,
x ≈ 28 and 73, y so the hips sit at the desk top (study: y 51.6 for a desk at 55 %).

## 4. Held props (rigs have no hand slots)

1. Measure: `node studio/scripts/hands.mjs --set <u>/<set> --char <id> --x --y --h --view --poses point,shrug,up,sign`
   → one sheet with a % grid; read the hand.
2. Place the prop at that point as a plain image at z 0.62 (`held()`), rotate a little.
3. Arm moves with an acting pose change; the prop follows with an enter preset in the same direction
   (`slideRight` as a 3/4-right arm reaches out, `rise` as a hand comes up) and a second copy at the new spot.
4. Carrying something while walking: camera `target` on the walker (`shot: 'full'`, `screen: [..]`) and the
   carried prop `fixed: true` at his chest on screen — the camera keeps him there, so it travels with him.

Measured (Noxverse, 3/4 views): Victor in the study (x 28, h 860, 3/4-right) point hand (43, 49.5), shrug near
hand (40, 51) · Alex arms-up right hand (80–86, 40–42) at x 73 · Mira in the museum (x 34, h 860) point hand
(50, 48.5) · Alex in the penthouse (x 42, h 794) point hand (56.5, 61.5) · Nox in the office (x 34, h 1100)
point hand (54, 58.5). `phone` pose draws its own phone at the ear. In 3/4-left the pointing arm goes
screen-right (away) and profile views hide it — put the reacher on the left facing right.

Objects on a desk or counter use the `noxverse/prop` component (`prop()`), which draws in front of the set's
`front` plane; a plain image there would be hidden by the desk.

## 5. Text that hooks

- Hook title big and on screen from frame 0 (≥ 100 px, gold or pink), the number slamming on its spoken word
  (not 3 s later). A thing that *happens* in the first second (chest `emerge`s from the hole and bursts open).
- Long overlay lines: size 72–84, a `panel` behind them over busy sets; two-part lines ("SELLING IT:" +
  "TRICKY") spaced so they don't touch.
- `sheetFrame` after the last slam has settled (a stamp caught mid-slam looks cut off on the sheet).

## 6. Pre-hook cold open

A 5–7 s flash-forward before the hook (prize → interrogation flash → the price), built as its own small video
in `<video>/prehook/` (script.md, brief.md, storyboard.json, own voice + fit) so the main board's timing
never changes. Join at the end with `node studio/scripts/master.mjs <video>` → `<video>/master/`.

## 7. Review loop: one beat at a time

`node studio/scripts/render-beats.mjs <video> [--beats 5] --scale 0.4` renders each beat as its own 432p clip
with its own slice of the voice (`render/beats/beatNN.mp4`), so a change to one beat re-renders only that beat.
Preview scales that give whole pixels: 0.4 (432×768) or 0.5; 1/3 does not.
Check a few frames before any clip: build a tiny board of the shots with `sheetFrame`s you want and render
`--sheet --scale 0.22` (one image, cheap).
