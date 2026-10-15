# Storyboard files

## storyboard.json

The render contract (`studio/remotion/TEMPLATES.md`) plus concept and deck fields. The
renderer reads `brand`, `style`, `styleOverrides`, `format`, `fps`, `audio` and each scene's
`template`, `props`, `durationInFrames`, `startFrom`, `transition`, `sheetFrame`. The deck
reads `concept`, `music` and each scene's `vo`, `onScreen`, `visual`, `motion`, `sfx`.

```json
{
  "status": "draft",
  "version": 1,
  "video": "2026-10-14-stargate-promo",
  "brand": "stargate",
  "style": "exam-paper",
  "styleOverrides": {},
  "format": "9:16",
  "fps": 30,
  "concept": {
    "title": "The Answer Sheet",
    "bigIdea": "One sentence: the creative thought behind the whole video.",
    "motif": "The recurring visual device.",
    "look": "Base style, backgrounds, textures, photo treatment.",
    "motion": "Camera behaviour, entrances, transitions, signature moments.",
    "arc": "Colour script / emotional arc across the beats.",
    "sound": "Music mood and key sound moments.",
    "typography": "Optional: how type is used."
  },
  "music": { "mood": "upbeat, driving", "notes": "dip under the problem, lift on the reveal" },
  "scenes": [
    {
      "id": "hook",
      "beat": 1,
      "template": "Composed",
      "durationInFrames": 92,
      "startFrom": 0,
      "sheetFrame": 58,
      "props": { "background": {}, "layers": [], "camera": {}, "effects": [] },
      "transition": { "type": "pushCut", "durationInFrames": 8 },
      "vo": ["First attempt. Costing mein eighty-seven marks."],
      "onScreen": ["87", "in CA Final Costing", "1st attempt", "— Eklavya, CA Final"],
      "visual": "What the viewer sees, 1–2 sentences.",
      "motion": "How it moves; the signature moment.",
      "sfx": [ { "at": 6, "cue": "stamp hit" } ],
      "direction": "Why it's designed this way."
    }
  ]
}
```

| Field | Rule |
|-------|------|
| `beat` | Script beat number; every beat has ≥ 1 shot. |
| `durationInFrames` | A beat's shots total its `beats.mjs` frames plus outgoing transitions. Voiceover refits later. |
| `sheetFrame` | Frame (within the shot) where the composition has fully landed — used for the contact sheet and deck. |
| `vo` / `onScreen` | Verbatim from the script. |
| `sfx[].at` | Frame within the shot; plain-word cues — the render stage picks the sounds. |
| `status` / `version` | `draft` until approved; bump `version` on changes after approval. |

## storyboard.md

```markdown
---
status: draft
version: 1
concept: The Answer Sheet
---

# Storyboard — <title>

**Concept:** … · **Format:** 9:16 · **Length:** 31 s · **Music:** …

| # | Beat | Time | On screen | Visual | Motion · transition | SFX |
|---|------|------|-----------|--------|---------------------|-----|
```
