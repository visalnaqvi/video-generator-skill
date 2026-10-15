# Format — True Case (Noxverse)

A real, documented case (a disappearance, an unsolved mystery, a strange true event) told straight
by a narrator, with Nox (or another Noxverse character) playing the real person. Serious and
respectful: the Noxverse look and characters, none of the Day One humour. First used in
`videos/2026-10-14-noxverse-the-last-call` (Brandon Swanson, 2008).

## For the write stage (words only)

- **Type:** storytelling playbook. ~60 s, ~3 wps measured (Andrew at -3%), third-person narrator,
  past tense from the hook on. The character plays the real person; the VO uses the real name.
- **Hook pattern:** the most chilling documented moment as an open question, ≤ 10 words in the
  first 3 s ("A nineteen-year-old was on the phone with his dad. Then he shouted two words.").
  A `[SILENCE 1s]` after it so the on-screen line lands.
- **Spine:** hook → name the person ("His name was …") → what happened, in order, with a time
  anchor on every event → the decisive moment replayed in context (pays off the hook) → what
  investigators found → the theories as questions → where it stands today → the hook's question again.
- **Joins:** run the first-time-viewer test at every beat (write skill, script-craft §3): name the
  person whenever two people share "he/she", give every action its reason, anchor every event in
  time ("later that same day", "eighteen years later"), answer what the last beat left open.
- **Facts:** source every name, date, number and quote; word them as the source does ("nearly
  twenty-five miles", "about forty-seven minutes"). Theories are questions, never conclusions
  ("Did he …? Or …? Was someone else out there? Nothing has been proven.").
- **Respect:** no jokes, no sensational adjectives, no invented dialogue, no gore or self-harm
  detail. Profanity in a real quote is shown censored on screen ("OH, SH*T!") and never spoken.
- **On screen:** date/place stamp, name + age, one key number per beat, short verdicts
  ("NO BODY", "STILL MISSING"), the theories as one-word questions.
- **Ending:** "<N> years later, <name> is still <missing/unsolved>." + the hook's question again
  (it's the comment prompt). End card: "NOXVERSE — <TITLE>" | "Based on a true, unsolved
  disappearance." (or the true equivalent). No vote card, no "part two".

## For the storyboard

Look: `../look.md`, **toned down**:

- **No score bar and no comedy beats.** Instead, one recurring motif per case that carries the
  story's time or evidence: e.g. `noxverse/call-bar` (a phone call that freezes pink when it
  drops), a map with a line drawing itself, a clock, a missing poster.
- **Pink only** for the key quote, the frozen motif and the verdict stamps.
- **Colour script:** night scene → cream case-file cards (name, numbers, map, theories) → black
  for the climax → cold blue for the search → warm, quiet ending (porch light, empty room).
- **Climax:** hard cut to black, the censored quote as a stamp, shake + flash, a full second of
  silence. Use `"leadIn"` on that shot so it starts on the silence, not on the next word.
- **Absence shots:** the same frame without the character ("the line went dead") and a fast
  pull-out leaving him tiny in the landscape ("lost all along").
- Time jumps fade (15–18 frames); everything else hard cuts. Slow pushes with parallax throughout.
- Nox: `phone-worried` / `phone-shock` for a call, `stand-worried` otherwise; heads for ID cards
  and posters. Scenes: `prairie-night`, `car-ditch`, `car-front`, `fence-fg`, `river-night`,
  `search-dog`, `porch-light` (add new locations to `scenes/` as needed).

## Voice and sound

- **Voice:** audition `en-US-AndrewMultilingualNeural` at **-3%** first (not the Day One +8%),
  with a deeper alternative (`en-US-ChristopherNeural` -2%).
- **Music:** `make-music.mjs --mood tense --bpm ~76`, silence across the climax (`--silence`),
  lift where the search begins, fading out under the final question; end card silent.
- **Sound (very restrained, ~7 per minute):** one ambience per location that matches it
  (crickets on a road, river water at a river; no swelling wind that reads as waves), single
  phone rings, a car if one is on screen. **No booms or stamp hits** — stamps land silently.
  No footsteps unless the character is animated walking. No tone over a silent on-screen line.
