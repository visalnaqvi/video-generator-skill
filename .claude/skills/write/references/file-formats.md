# File formats

All files are Markdown with YAML frontmatter. Later skills parse these, so keep the
field names and the beat heading format exactly as shown.

Common frontmatter fields:

| Field | Values |
|-------|--------|
| `status` | `draft` → `approved`; `stale` when an earlier file changed after this one was approved |
| `version` | integer, starts at 1, bump on every change after approval |
| `type` | `promo` \| `explainer` \| `storytelling` \| `tutorial` \| `social-short` |

---

## brief.md

```markdown
---
status: approved
version: 1
type: explainer
created: 2026-10-14
---

# Brief — <working title>

- **Topic:** How UPI payments work in under a second
- **Goal:** Viewer understands the 4 parties involved and trusts UPI more
- **Audience:** Indian smartphone users, non-technical, 18–35
- **Viewer situation:** They have just paid and wonder what happens between the tap and confirmation
- **Belief change / central promise:** The payment is a coordinated relay, not an unexplained jump
- **Reason to believe:** A sourced explanation of the parties and their roles
- **Platform & format:** YouTube Shorts + Reels, 9:16
- **Target length:** 50 s
- **VO language:** English (on-screen: English)
- **Tone:** curious, friendly, confident
- **CTA:** Follow for more "how it works" videos
- **Required in VO:** explain the role of the bank in plain language
- **Required somewhere:** NPCI, the bank, the PSP app
- **Supporting material:** other background facts only if they advance the explanation
- **Notes for visuals:** (optional) any look/feel ideas the user mentioned, passed on to the visual skill
- **Avoid:** naming specific apps as better/worse
- **Assets:** assets/logo.png
```

---

## hook.md

```markdown
---
status: approved
version: 1
type: explainer
chosen: B
---

# Hook

## Chosen — B

- **Formula:** Hidden process
- **Angle:** The unseen relay behind a familiar tap
- **Continuation:** Follow the request through the participating parties
- **Payoff:** Explain what produces confirmation; do not imply unsupported timing guarantees
- **VO:** You tap pay. One second later the money's gone. Here's everything that happened in that second.
- **ON-SCREEN:** "1 second. 4 companies."
- **Why it works:** Everyone has done this tap; the "4 companies" number opens a loop.
- **Paid off in:** Beat 3

## Alternatives

### A — Myth vs fact
- **VO:** ...
- **ON-SCREEN:** ...
- **Why it works:** ...

### C — ...
```

---

## story.md

```markdown
---
status: approved
version: 1
type: explainer
target_length_s: 50
hook_payoff_beat: 3
spine: "You tap pay, and in one second four companies pass your money along like a relay, so it lands safely."
---

# Story — <working title>

**Spine:** You tap pay, and in one second four companies pass your money along like a relay, so it lands safely.

## Narration

<Complete connected draft VO, composed before the table. Derive the table from
these exact words; don't write two different versions.>

## Production beats

| # | Beat | Time | Voice-over | On-screen text | Delivery |
|---|------|------|-----------|----------------|--------------------------|
| 1 | Hook | 0:00–0:04 | You tap pay. One second later, the money's gone. So what happened in that second? | "1 second. 4 companies." | quick, intriguing; tiny pause after "gone" |
| 2 | Setup | 0:04–0:12 | ... | ... | ... |
| 3 | Core | 0:12–0:35 | ... | ... | ... |
```

The table is the same one shown to the user in chat (see SKILL.md, **Showing beats
to the user**). In `story.md` the voice-over is a draft; `script.md` holds the final
lines.

---

## script.md

Beat headings must be `## Beat <n> — <Name> (<m:ss>–<m:ss>)`. Every beat has all
three fields in this order. A VO line may contain multiple connected sentences.
Keep the heading and field syntax stable; voiceover groups passages independently
of editorial line breaks. Do not add a duplicate narration section to script.md;
join its VO lines for the narration-only view shown in chat.

```markdown
---
status: approved
version: 1
type: explainer
title: How UPI works in one second
language: en
format: "9:16"
target_length_s: 50
estimated_length_s: 49
word_count: 122
wps: 2.5
---

# Script — How UPI works in one second

## Beat 1 — Hook (0:00–0:04)
VO: You tap pay. One second later the money's gone.
VO: Here's everything that happened in that second.
ON-SCREEN: "1 second. 4 companies."
(universe video with a character: `VO (Nox): Wait. Where did my money go?` — his line, his voice)
DELIVERY: quick, intriguing; tiny pause after "gone"

## Beat 2 — Setup (0:04–0:12)
VO: ...
ON-SCREEN: ...
DELIVERY: ...

## Pronunciations
| Word | Say it as | Notes |
|------|-----------|-------|
| UPI | U-P-I | spell out letters |
| NPCI | N-P-C-I | spell out letters |

## Sources
1. NPCI — UPI product overview — https://...
```

### Field rules

- **VO:** exactly what the narrator says. Plain speakable text, numbers as spoken,
  no symbols, no emojis, no stage directions. Fully punctuated for the voice with
  `, . ? ! …` and apostrophes only (see script-craft.md section 5). `VO: [SILENCE 1s]` is allowed for a
  deliberate beat with no narration.
- **VO (Name):** a character's own spoken line (dialogue), same text rules —
  e.g. `VO (Nox): Wait. That's my landlord.` Only for a universe character the brief
  lists (`characters:`), or a speaking role the user asked for. Plain `VO:` is always the
  narrator. Each tag becomes its own voice (the character's saved voice) and only those
  lines move the character's mouth. Keep dialogue short (≤ 8 words a line), in character,
  and clearly his: the narrator says "you", the character says "I". Put it on its own line
  in the beat, in the order it is spoken.
- **ON-SCREEN:** in quotes; `ON-SCREEN: none` if the beat has no text card. Separate
  multiple cards with ` | `. Words only — no placement, size, style or animation.
- **DELIVERY:** tone, pace, pauses, stressed words (stress written in CAPS inside
  DELIVERY only, never in VO).
  These are performance notes, not guaranteed TTS controls. Use explicit silence
  markers for mandatory gaps; voiceover chooses supported rate/pitch settings.
- **Sources:** required for explainer, storytelling and tutorial when specific
  facts are stated; omit for promo unless claims came from public sources.

### Speaking rate (wps) by language

Use the playbook's wps for English. For other languages, start from these and
adjust for the playbook's pace (fast types +10%, calm types −10%):

| Language | wps |
|----------|-----|
| English | 2.5 |
| Hindi / Hinglish | 2.6 |
| Spanish, Portuguese | 2.8 |
| French, Italian | 2.7 |
| German | 2.2 |
| Arabic, Urdu | 2.3 |
| Japanese, Chinese | count characters: ~6–7 chars/s (ja), ~4–5 chars/s (zh) |

These are starting estimates, not quotas. Count the actual VO rather than copying
a count from the outline. Include intentional silences and end-card room in the
runtime budget; state assumptions instead of inventing a precise duration.
Comparable measured audio from the selected language and voice is better evidence
than the generic table. A required phone number or several names need additional
room. Trim optional content before increasing the assumed rate. A hook window
applies to spoken duration, not merely its assigned time label.

The voiceover stage replaces estimates with real timings. Do not change an
approved script silently to satisfy audio timing.
