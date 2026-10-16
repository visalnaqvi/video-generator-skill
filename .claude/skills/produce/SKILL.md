---
name: produce
description: Runs this studio's whole video pipeline from a brief or idea to the final MP4 — brand kit (new clients only) → write (hook, story, script) → storyboard (concepts, style frames, shots, PDF deck) → voiceover → render (music, sound, captions, final, QC) — stopping for the user's approval at every gate, resuming any video from wherever it stopped, and reporting status. Use when the user wants a new video made end to end ("make a video for…", "new promo/explainer/reel for…"), wants to continue or check on a video ("continue the Stargate video", "where are we?", "what's next?"), or asks for the status of all videos. Orchestrates the stage skills; never does their work itself.
---

# Produce — brief to final video

The conductor for the studio. Each stage is its own skill and does its own work; this skill
decides **which stage runs next**, makes sure every gate is approved before moving on, and
keeps the user oriented. Stages hand off through files in `videos/<video>/`, never by
calling each other's scripts directly.

```
brand-kit (new client only) → write → storyboard → voiceover → render
```

## Where things stand

`node studio/scripts/status.mjs videos/<video>` — reads the video's files and prints each
stage (done / awaiting approval / stale / not started), the **next action**, and writes
`videos/<video>/status.md`. With no argument it lists every video and its next step.
Run it at the start of every produce session and after each stage.

## Starting a new video

1. Get the request: client/brand (website?), what it's for, and any brief details the user
   already gave. Don't interrogate — the write skill collects the brief.
2. Brand: if the client has no approved kit in `studio/brands/`, run the **brand-kit** skill
   (it includes the asset library). Existing approved kit → reuse it.
   **Universe:** only if the user names a universe or one of its characters (e.g. "with Nox",
   "in the Noxverse"), the video uses that universe (**universe** skill): its palette replaces
   the brand kit unless the user explicitly asks for a client brand too. Never suggest or ask
   about universes otherwise — the regular flow runs.
3. Run the **write** skill. It creates `videos/<YYYY-MM-DD>-<slug>/` and the brief, then
   hook → story → script with approvals.

## Continuing a video

Run `status.mjs`, then invoke the skill for the next action:

| Next action from status | Skill |
|-------------------------|-------|
| brand kit missing / unapproved / no asset library | `brand-kit` |
| universe named in the brief but missing | `universe` |
| brief, hook, story or script not approved | `write` |
| storyboard not started, awaiting approval, or stale | `storyboard` |
| voice-over not started, not fitted, awaiting approval, or stale | `voiceover` |
| final not rendered, awaiting approval, or stale | `render` |
| done | tell the user it's final; offer variations or a new video |

Invoke stage skills with the Skill tool and follow their instructions fully — including
their own approval steps. Don't shortcut a stage's process from here.

## Gates (always stop for the user)

1. Brand kit (new clients) · 2. Hook · 3. Story · 4. Script · 5. Concept · 6. Style frames ·
7. Storyboard + deck · 8. Voice (audition + preview) · 9. Final video.

Universe videos: the storyboard is shown for approval (gate 7) only once
`studio/scripts/board-check.mjs` passes — status.mjs shows `check ✓` / `check ✗` on the
storyboard line and points to the check while it fails.

Approval must come from the user in chat for **this** video and gate. "Looks good",
"approved", "go ahead" count; silence or a question doesn't. One approval never covers
the next gate. After each gate, give a one-line status and the next step.

## Iterating after the first preview (how the user works on longer story videos)

Once voice and storyboard exist, the user reviews **beat by beat**, giving words and animation changes for a
few beats at a time. Loop per message: words → write (script.md + story.md, grammar tidied, present tense
kept, said in one line), visuals → storyboard (the board script in `<video>/board/`), voice → re-record only
the changed lines (all lines if ids shifted), fit, then `render-beats.mjs --beats <changed>` and send just those
432p clips. A cold open the user asks for goes in `<video>/prehook/` as its own small video; at the end
`master.mjs` joins the parts and the render stage runs once on `<video>/master/`. Fast path for universe
boards: `.claude/skills/storyboard/references/board-kit.md`.

## Changes after approval

- Name the stage that owns the change: words → write; look, animation, transitions, sound
  cues → storyboard; voice, pace, timing → voiceover; music, captions, mix, export → render.
- The owning skill bumps `version`; later stages become stale (status shows ⚠️). Re-run only
  what's stale, in order. Never leave stale files behind — remove outputs that no longer
  match (e.g. an old preview) once they're superseded.

## Studio rules (apply at every stage)

- **Free first.** Paid tools (ElevenLabs voice, AI images, AI music) only when the user asks
  or approves a cost estimate in chat.
- **Restrained sound.** Signature moments only; no whoosh on every transition.
- **Words come from the script.** Only the write skill changes words.
- **Save tokens without losing quality:** scripts measure and report JSON; look at contact
  sheets, not individual frames; don't watch MP4s — send them to the user.
- Keep the user oriented: after each stage, a short summary + what's next.

## Reporting

When asked "where are we?" or at the end of a session: run `status.mjs` (all videos or one),
and summarise in a short table: video · stage · next step · anything waiting on the user.
