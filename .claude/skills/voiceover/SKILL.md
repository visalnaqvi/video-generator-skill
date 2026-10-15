---
name: voiceover
description: Records connected narration passages from an approved studio script and storyboard, auditions free voices, retains word and line timings for scene sync, fits the storyboard and renders a sound preview. Supports Indian English, Hindi and Hinglish. Free by default; ElevenLabs requires explicit paid-generation authorization. Use for voiceover, voice auditions, pace changes and narration timing after storyboard approval.
---

# Voiceover — narration, timing, first preview

**Free by default.** Every step uses free tools (Edge neural voices via `edge-tts`, ffmpeg,
local scripts) — including the final voice-over. The paid **ElevenLabs** voice is used only
if the user explicitly asks for it, or approves it after hearing the free result. Before any
paid call, show the estimate (`--estimate`) and wait for a clear yes; only then pass
`--approved`. Never pass `--approved` on your own judgement.

Input: `videos/<video>/` with an approved `script.md` and an approved `storyboard.json`.
Output:

```
audio/voice-script.json    lines to speak: shot mapping, tts text, Devanagari, pauses
audio/audition/<voice>.mp3 short auditions (hook + names)
audio/clips/<voice>/       passage clips + word timings and original line segments
audio/voiceover.mp3        the voice-over (−16 LUFS)
audio/timings.json         every line's and word's start/end on the track
audio/lipsync.json         mouth shape per frame (only when a universe character talks)
storyboard.json            shot durations fitted to the voice, `audio` set
render/preview.mp4         first video with sound (540p)
```

Scripts live in `.claude/skills/voiceover/scripts/`; run from the studio root. Python for
the free voice: `.venv/Scripts/python.exe` (edge-tts installed there).

## Step 1 — Voice script

`node .claude/skills/voiceover/scripts/voice-script.mjs videos/<video>`

Read the continuous narration before choosing passage boundaries. Split at a real
change of thought or intentional silence; join adjacent beats with `passage` when
the thought should continue. A new storyboard shot is not a reason to restart TTS.

Then edit `audio/voice-script.json` where needed (re-running keeps your edits):
- `tts` — what the voice actually reads. Apply the script's Pronunciations table: spell
  letters out where a voice could misread (`C.A.`, `C.M.A.`), keep numbers in words as the
  script has them. Never change meaning — `text` stays the script's line.
- `ttsDeva` — for Hindi voices: the same line in Devanagari (English words transliterated as
  spoken, e.g. "फ़र्स्ट अटेम्प्ट"). Hindi voices read Hinglish far more naturally this way.
- `narration.groupBy` — new voice scripts default to `"beat"`: connected VO lines in
  a beat are synthesized together. Old scripts without this field retain legacy
  `"line"` behavior until rebuilt. Do not use editorial line breaks as mandatory pauses.
- `passage` on adjacent lines — assign the same nonempty label to join a connected
  thought across beats. No join is needed for a scene cut; scenes use word timings.
- `pauseAfter` — explicit seconds after this line; any numeric value ends its passage.
  Use for intentional pauses from the script, rather than an automatic stop at every
  sentence. A silence marker is converted to this control. New scripts default to
  0.12 s between separate passages in one beat and 0.18 s across beats; review these
  in auditions, retain user-edited gaps, and let punctuation govern pauses inside a passage.
- `rate` / `pitch` on a line — optional Edge controls, e.g. `"-5%"` / `"+0Hz"`.
  A change in either starts a new passage. Global voice settings remain the defaults.
  DELIVERY notes are performance intent: Edge does not automatically interpret
  "stress YOU" or "warm reveal". Apply supported controls explicitly and audition
  the result; do not claim precise emotional or word-emphasis control.

Passage IDs use `P_L04_L06` for multiple lines and `L01` for a single line. Clip
metadata retains each original line's word range, shot and beat via assembly.
`--only L05` regenerates the **whole passage containing L05**, preserving context.
Selecting distant audition lines keeps their original passages separate. Rebuild
and regenerate clips when migrating an old voice script to passage grouping;
existing per-line clips are not silently reused as passage audio.

## Step 2 — Audition (user picks)

Universe video (`universe:` in the brief): audition the universe's default voice first
(`universe.json` → `voice`) alongside 2–3 alternatives.
Pick 3–4 voices that fit the brief's language, audience and tone (e.g. Hinglish:
`en-IN-PrabhatNeural`, `en-IN-NeerjaExpressiveNeural`, `hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`;
English: `en-US-AndrewMultilingualNeural`, `en-US-AvaMultilingualNeural`…; list all with
`edge_tts.list_voices()`). Audition the hook and a connected middle passage as well
as risky names. This tests continuity and pace, not just pronunciation. For example:

```
.venv/Scripts/python.exe .claude/skills/voiceover/scripts/tts_edge.py videos/<video>/audio/voice-script.json --voice <voice> --rate +6% --only L01,L03 --out videos/<video>/audio/audition/<voice>
node .claude/skills/voiceover/scripts/assemble.mjs videos/<video>/audio/voice-script.json videos/<video>/audio/audition/<voice> --only L01,L03 --out audio/audition/<voice>.mp3
```

Send the auditions to the user (they listen; you can't). Ask them to pick a voice and note
anything mispronounced or the wrong pace. Fix `tts`/`ttsDeva`/rate and re-audition if needed.
Save the choice in `voice-script.json` → `voice` {engine, name, rate, pitch}.

**Dialogue** (`VO (Nox): …` lines, `speaker` in the voice script): the narrator stays `voice`;
each speaker speaks in `voices.<speaker>`, seeded from the universe character's saved `voice`
(`characters/<id>/character.json`) — reuse it so the character sounds the same in every video;
audition a speaker only when it has no saved voice (or the user asks), in context with the
narrator:

```
.venv/Scripts/python.exe .claude/skills/voiceover/scripts/tts_edge.py <vs> --speaker narrator --out <dir>/narrator
# per candidate: copy the narrator clips into <dir>/nox-<voice>, then
.venv/Scripts/python.exe .claude/skills/voiceover/scripts/tts_edge.py <vs> --speaker nox --speaker-voice <voice> --speaker-rate=+8% --out <dir>/nox-<voice>
node .claude/skills/voiceover/scripts/assemble.mjs <vs> <dir>/nox-<voice> --out audio/audition/nox-<voice>.mp3
```

The user's pick goes into the character's `voice` (status `approved`) for every later video.
ElevenLabs dialogue needs `voices.<speaker>.elevenId`.

## Step 3 — Voice-over

```
.venv/Scripts/python.exe .claude/skills/voiceover/scripts/tts_edge.py videos/<video>/audio/voice-script.json --voice <name> --rate <rate>
node .claude/skills/voiceover/scripts/assemble.mjs videos/<video>/audio/voice-script.json videos/<video>/audio/clips/<name>
```

Dialogue passages are generated in their speaker's voice into the same clips folder (a change
of speaker always starts a new passage), and assembly adds a `gaps.turn` pause (0.28 s) at each
change of speaker. `timings.json` lists every line's `speaker` and the voices used.

Check the reported length against the script's target. Over by > 10%: raise `--rate` a
little (max ≈ +15% before it sounds rushed) or tighten gaps; still over → tell the user the
script is too long for the target and suggest trims via the write skill. Never cut words.

## Step 4 — Fit the storyboard to the voice

1. Key moments in the storyboard should land on words: add `"sync": "<word>"` (and optional
   `"syncOffset": <frames>`) to layers or `sfx` entries — e.g. the slam on "darr", the "+" on
   "zyada", the stars on "five", the phone number on "seven". Use words as spoken in the VO.
2. `node .claude/skills/voiceover/scripts/fit-timing.mjs videos/<video> --dry` → review the
   report (old → new shot lengths, anchors, warnings), then run it without `--dry`.

It starts each shot just before its first words, holds the last shot ~2 s after the VO
(`--hold`), resolves every `sync`, sets `audio` and bumps `version`. Fix any warning
(an anchor word not spoken in its shot, a shot under ~1.2 s) before rendering.

3. **Talking characters** (universe videos where a character has `talk` in the storyboard):
   `node studio/scripts/lipsync.mjs videos/<video>` → `audio/lipsync.json` (one mouth shape per
   frame from the word timings + loudness; render.mjs picks it up). Re-run it whenever the
   voice-over or `timings.json` changes, with `--fps` matching the storyboard.

## Step 5 — Preview with sound

```
node studio/scripts/render.mjs videos/<video>/storyboard.json --sheet
node studio/scripts/render.mjs videos/<video>/storyboard.json --preview
```

Look at the contact sheet once (timing changes can push text off a frame's `sheetFrame`);
don't watch the MP4. Send `render/preview.mp4` to the user. Ask for: voice OK? pace OK?
anything landing early/late? Apply fixes (gaps, `sync`, rate, `tts`) and re-run Steps 3–5.

## Step 6 — Approve (or upgrade)

- User happy → mark `voice-script.json` `"status": "approved"`; the free voice is final.
  Next stage: **render** (music, sound effects, captions, final export).
- User wants a better voice → ElevenLabs, only now: pick a voice with them (the ElevenLabs
  connector can play samples), run `tts_elevenlabs.mjs … --estimate`, show the credits, and
  on a clear yes run it with `--voice-id <id> --approved` (needs `ELEVENLABS_API_KEY` in
  `.env`, added by the user). Then assemble from `audio/clips/eleven-<id>`, re-fit, re-preview.

## Changes later

- Script line changed → re-run Step 1 (edits kept), regenerate its full passage (`--only`),
  re-assemble, re-fit, re-preview.
- Different voice → Step 2 onwards; storyboard sync anchors stay and re-resolve.
