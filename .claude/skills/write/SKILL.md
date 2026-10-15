---
name: write
description: Writes or revises an audience-specific creative angle, hook and connected narration for an ad or video in this studio, then divides the narration into timed production beats. Use for new videos, hooks, stories and voice-over scripts for promos, explainers, storytelling, tutorials and social shorts. Writes text only, using the user's existing approval preferences before handing off to storyboard.
---

# Write — hook, story, script

Stage 1 of the studio pipeline. Produces four files in the video's project folder,
each approved by the user before moving on:

```
videos/<YYYY-MM-DD>-<slug>/
├── brief.md    audience situation, belief change, proof, scope, runtime
├── hook.md     3 angle-linked hooks + the chosen opening and payoff
├── story.md    continuous draft narration, spine and derived beat table
└── script.md   final script: VO, on-screen text, delivery notes
```

**Words only.** This skill writes what is said and what text appears — nothing about
how the video looks. No shots, images, layouts, camera moves, colours, transitions or
animation. Visuals, direction and style belong to the visual/storyboard skill, which
reads the script and decides them. If the user offers a visual idea, note it in
`brief.md` under **Notes for visuals** and move on.

`script.md` is the contract with the later stages. The **storyboard** skill reads its
beats, the **voiceover** skill reads only its `VO:` lines and pronunciation list,
and **render** builds captions from the VO text. Follow the formats in
[references/file-formats.md](references/file-formats.md) exactly.

**Craft.** Read [references/script-craft.md](references/script-craft.md) before writing
the story or script and before any revision. It covers the spine, the links between
beats, punctuation for the voice, and the read-through.

## Showing the narration and production beats

For story and script review, show the continuous spoken narration first so the user
can judge how it sounds without production labels. Then show the six-column table
below, derived from the same words. Do not compose the narration by filling table
cells. If the user asks only for narration, a passage or a concise revision, honor
that request; the saved files still contain the complete production contract.

```
**<Working title>** · <story draft | script v<n>> · <total s> s · <beat count> beats · <VO word count> words
**Spine:** <the one-sentence story from story.md>

**Narration:** <exact VO joined into connected prose; omit silence markers and labels>

| # | Beat | Time | Voice-over | On-screen text | Delivery |
|---|------|------|-----------|----------------|--------------------------|
| 1 | Hook | 0:00–0:04 | What if your class notes could turn into a mock test? | "Notes in. Test out." | curious, light; small lift on "notes" |
| … |

**Joins:** 1→2 <last words of 1> → <first words of 2>: <relationship in a few words> · 2→3 …
**Changed:** <revisions only: one line per changed beat; leave out on the first showing>
**Next:** <one question: approve, or what to change>
```

- **Voice-over** is always the exact words the narrator will say, fully punctuated,
  never a description of the beat ("explains the filters") or a list of points.
- **On-screen text** is the exact words on the text cards, in quotes, or `none`.
- **Delivery** is tone, pace and stressed words only.
- **Joins** is mandatory for every story and script showing: one entry per beat
  boundary, built from the first-time viewer test in script-craft section 3 (who, why,
  when, what it answers). Example: `2→3 "couldn't find him" → "So Brandon set off on
  foot… to meet them": problem → his response, named, reason given`. A join you can only
  describe as "continues the story" or "next event" is broken: rewrite before showing.
- Pronunciations and Sources go below the table when they exist. Beat names are
  production labels and must not leak into VO as redundant spoken headings.

## Step 0 — Find or create the project

- If the user names an existing video, or there's an obvious one in progress under
  `videos/`, open it and check which files exist and their `status:` frontmatter.
  Resume from the first file that is missing or not `approved`. If the user asks to
  redo one stage ("redo the hook"), jump straight to that stage.
- Otherwise create `videos/<today's date>-<short-kebab-slug>/` plus an empty
  `assets/` folder inside it for anything the user provides.

## Step 1 — Brief

Collect the details below. Take everything you can from the user's message and any
files they point to (or put in the project's `assets/`); then ask for **only the
missing items, all in one message**. Offer a sensible default for each so the user
can just say "defaults are fine".

| Field | Default if not given |
|-------|----------------------|
| **Type** — promo, explainer, storytelling, tutorial, social-short | infer from the request; ask if unclear |
| **Topic / product** | — (must have) |
| **Goal** — what the viewer should think, feel or do afterwards | from the type's playbook |
| **Audience** — who, what they already know | infer a specific viewer from the brief or brand; flag an assumption |
| **Viewer situation** — the moment, task or frustration they recognize | infer from supplied context; don't invent customer research |
| **Belief change / central promise** — one thing to understand or believe by the end | derive from the goal; one focus |
| **Reason to believe** — sourced mechanism, demonstration or proof | strongest relevant supported detail; flag missing proof |
| **Platform & format** — Reels/Shorts/TikTok 9:16, YouTube 16:9, both | 9:16 |
| **Target length** | from the playbook |
| **Voice-over language** (and on-screen text language if different) | English |
| **Tone** | from the playbook |
| **Call to action** | from the playbook; for promos ask for the exact offer/link |
| **Required in VO** — exact spoken requirements | only items explicitly required to be spoken |
| **Required somewhere** — may be VO or on screen | other mandatory facts, names, claims |
| **Supporting material** — optional features and facts | available material, not a checklist |
| **Things to avoid** | none |

**Brand kit:** if the video is for a brand with a kit at
`studio/brands/<slug>/brand.json`, record `brand: <slug>` in the brief's frontmatter
and take the defaults from it instead of asking: spoken brand name, tagline, CTA and
contact (`voice`), the avoid-list (`voice.avoid`) and usable facts (`facts`, already
sourced — re-check any older than 90 days). The kit's `team`, `offerings` and
`testimonials` are ready material for any business — real names, products/services and
verbatim customer quotes the script can feature (quotes stay verbatim). Content that has
a matching image in the kit's asset library makes for a stronger storyboard. If there's no kit yet, carry on without
one; don't run the brand-kit skill from here.

**Universe:** only when the user names a universe or one of its characters ("with Nox", "a
Noxverse reel"; resolve a name with `node studio/scripts/library.mjs who <name>`), record
`universe: <id>` and `characters: <id, …>` in the brief's front matter — and no `brand:` unless
the user explicitly asked for a client brand as well. If they name a format ("a Day One reel")
or the request plainly is one, read `studio/library/universes/<u>/formats/<format>.md` and follow
its writing pattern (hook, spine, turn, ending, fact rules) on top of the playbook. Never add a
universe the user didn't name.

**Dialogue:** a universe character may speak his own lines between the narration —
`VO (Nox): …` (format: [references/file-formats.md](references/file-formats.md)). Write them only
when the user asks for the character to talk, or the universe format calls for it; otherwise
the character acts silently while the narrator speaks. Each line passes the first-time-viewer
test on its own: it answers what the narrator just said, in the character's voice ("I", not "you").

When an inherited brief says "must include" without specifying placement, preserve
the requirement and state where it will be covered. Do not silently move explicitly
spoken requirements on screen. If scope cannot fit, propose a longer runtime or a
narrower focus and resolve the conflict before presenting a final script.

Save `brief.md` and show a 3–4 line summary including the viewer situation, belief
change and reason to believe. Don't add a separate brief approval gate; move to
angle-linked hooks unless a material ambiguity remains.

## Step 2 — Load the playbook

Read **only** the matching playbook from `playbooks/`:

| Type | File |
|------|------|
| Promo / ad / product / launch | [playbooks/promo.md](playbooks/promo.md) |
| Explainer / how it works / concept | [playbooks/explainer.md](playbooks/explainer.md) |
| Story / history / documentary / true events | [playbooks/storytelling.md](playbooks/storytelling.md) |
| Tutorial / how-to / step by step | [playbooks/tutorial.md](playbooks/tutorial.md) |
| Fast trend-style Reel/Short/TikTok, listicle, hot take | [playbooks/social-short.md](playbooks/social-short.md) |

If a request fits two types (e.g. a product explainer), pick the one matching the
**goal** (selling → promo, understanding → explainer) and borrow hook formulas from
the other if useful. If a new type is needed often, suggest adding a playbook for it
following the same sections.

The playbook supplies type-specific defaults for tone, length, hooks and CTA.
Its structures and percentages are coverage guides, not mandatory beat templates.
The narration-first workflow and continuity checks apply to every playbook.

## Step 3 — Creative angle and hook (3 options)

Develop an angle before drafting standalone hooks: viewer situation → belief change
→ supported mechanism or proof → payoff and CTA. Write **3 hook options**, exploring
distinct angles or useful openings for the strongest angle. Different formulas
alone do not make options meaningfully different. Use this table:

| Option | Angle | Voice-over | On-screen text | Continuation and payoff |
|--------|-------|-----------|----------------|-------------------------|
| A | One test from notes to submissions | Your notes could become a test. | "Start with your notes" | Show drafting and teacher review, then follow the test to member submissions; no marking claim |

- **Voice-over** is the exact spoken line, fully punctuated, timed to fit the playbook's
  hook window.
- **On-screen text** is short and doesn't copy the VO.

Before showing them, check each against the playbook's hook rules (first-second
pull, a promise or open loop that the video actually pays off, no bait the video
can't deliver). Under the table, give your recommendation and the reason in one line.

Ask the user to choose an angle-linked opening, mix compatible options or request more,
unless their existing instructions already authorize you to choose. Save `hook.md`
with the chosen angle, hook, immediate continuation and planned payoff on top;
keep the other options below as alternatives;
set `status: approved` once chosen.

## Step 4 — Continuous story, then production beats

Follow [references/script-craft.md](references/script-craft.md):

1. Write the **spine**: one sentence that tells the whole video as one story. For a
   product or feature tour, follow one thing through its life, not the app's menu.
2. Draft the **complete narration as connected prose**, including the approved hook,
   its continuation, development, payoff and ending. No beat labels or time boxes yet.
   Place alternative paths before their convergence; preserve actual prerequisites.
3. Run the observable checks in script-craft section 6. Repair logic, generic copy,
   redundant announcements and rhythm in the prose before dividing it.
4. Divide the narration at changes in meaning. Derive beat names, time budgets,
   on-screen text and delivery from it. Merge, omit or reorder playbook functions as
   needed. Note the hook payoff beat. Do not add filler to meet a percentage.
5. Show narration followed by the beat table and ask for approval or changes, subject
   to the user's existing authorization. Never substitute key points for spoken words.

Save `story.md` with the spine, continuous narration and matching table. Both views
must contain exactly the same spoken words in the same order.

## Step 5 — Script

Polish the approved narration as a whole, then update the production divisions.
Keep its logical progression and payoff, and save it in the format from
[references/file-formats.md](references/file-formats.md): `VO`, `ON-SCREEN`,
`DELIVERY` and a time estimate for every beat.

Writing rules for all types (the playbook adds its own; script-craft.md has the detail):

- **One connected story.** Every beat advances the spine through a meaningful
  relationship; connectors are optional. Cut redundant section announcements.
- **Write like a professional copywriter, for the ear.** Complete sentences with
  varied rhythm. Contractions, concrete details, sharp verbs. No brochure clichés, no
  parentheses, no "the former/latter", no lists longer than three spoken items.
- **Punctuate for the voice.** Commas at natural clause and breath points, full stops,
  question marks, and `!` or `…` only when the thought and delivery call for them.
  No dashes, colons, semicolons, brackets or quotation marks in VO.
- **Every VO line must be speakable as written.** Spell out what should be said:
  numbers as the narrator should read them in context ("twenty twenty-six",
  "three point five million"), no symbols (%, &, /, →) and no emojis in VO.
- **ON-SCREEN text supports, not duplicates.** Max ~6 words per card; key number,
  keyword or label. Write the words only — not where, how big or how they animate.
  Captions of the VO are added automatically later — don't write them.
- **Each line follows from the one before.** Read the VO start to finish as one
  piece: every line must answer, build on or turn from the previous line. No jumps
  to a new thought without a meaningful relationship. Don't force a bridge phrase.
- **Introduce before you reference.** Never use a name, term or "he/she/it/this" in
  VO before the viewer has heard who or what it is. If a name only appears on
  screen, the VO can't rely on it.
- **Word claims exactly as the source supports.** Don't round up or reshape facts:
  "5.0 average from 105 ratings" is not "105 five-star ratings"; "25+ years" is not
  "25 years"; a testimonial is not "all our students".
- **Timing:** count actual spoken words and estimate speech plus intentional pauses
  and end-card room (file-formats.md). Use comparable measured voice timings when
  available. Fit the target within ±10%; trim nonessential material rather than
  assuming a faster voice. Never pad a finished story merely to fill the runtime.
- **Pronunciations:** list every brand name, person/place name, acronym or
  foreign-language word that a voice engine could get wrong, with a phonetic respelling.
- **Facts:** never invent statistics, quotes, dates, prices or claims.
  - Promo: use only facts from the brief/assets. If a claim needs a number you don't
    have, leave `[NEED: …]` and ask.
  - Explainer, storytelling, tutorial: verify specific facts (web search if available)
    and list sources in the `Sources` section. Mark anything unverified `[UNVERIFIED]`
    and tell the user.
- **Language:** write VO in the requested language as a native speaker would say it,
  not a literal translation. For mixed-language VO (e.g. Hinglish), write it the way
  people actually speak and keep the script consistent in its choice of script/spelling.

Before showing the script, run the self-check:

- [ ] Hook is the approved one, word for word
- [ ] Hook's promise is paid off in the beat noted in story.md
- [ ] Every beat has VO, ON-SCREEN, DELIVERY, time estimate
- [ ] No visual direction anywhere (shots, images, layout, motion, colours)
- [ ] Continuous narration works with all headings and on-screen labels hidden
- [ ] No redundant section announcements; instructional numbering is justified
- [ ] Actions follow prerequisites; alternatives precede convergence
- [ ] Every new passage has a meaningful relationship to the previous one
- [ ] First-time viewer test passed at every boundary: no ambiguous pronoun (name the
      person when two share a pronoun), every action has a stated reason, every event
      has a time anchor, every open question from the last beat is picked up
- [ ] Joins line written, one relationship per boundary, none vague
- [ ] Copy uses a relevant sourced situation, mechanism or proof, not interchangeable praise
- [ ] Ending resolves the opening and motivates the CTA; no orphan features or filler
- [ ] All mandatory content is covered in its required channel
- [ ] No orphan sentences, no verbless label fragments ("The test library, with filters.")
- [ ] Punctuation follows the thought; no stage directions or unspeakable symbols in VO
- [ ] Shown in the standard beat table, all six columns
- [ ] No name or term in VO before the viewer has heard who or what it is
- [ ] Every claim worded exactly as its source supports
- [ ] Total VO time within ±10% of target; hook fits the playbook's hook window
- [ ] No symbols/emojis/unspeakable text in VO; numbers written as spoken
- [ ] Pronunciation list covers all risky words
- [ ] No `[NEED: …]` left, or the user has been asked about each
- [ ] CTA matches the brief exactly (offer, link, handle)
- [ ] Playbook's "avoid" list respected

Show the continuous narration, followed by the standard beat table (runtime, beat
count and word count), then Pronunciations and Sources. Ask for approval or
line edits. Apply edits, re-run the self-check, save `script.md` with
`status: approved`.

## Revisions

- Show the revised narration and table for full script review, with `Changed:`
  listing material edits. Honor requests for just a passage or concise changes.
- **Keep the chain.** When a beat changes, re-read the beats before and after it and
  repair their meaning and phrasing so the story connects both ways. Re-time the beats
  if lengths changed. Then do the read-through again.
- Editing one stage after later stages exist: update that file, bump its `version`,
  and set any later file that depends on it (story → script) to `status: stale`.
  Tell the user which files need redoing and offer to redo them now.
- Small line edits to an approved script don't need the whole flow — edit, re-run
  the self-check, bump `version`, keep `approved`.
- Never delete alternatives or old content the user may want back; previous hook
  options stay in `hook.md`.

## Hand-off

When `script.md` is approved, tell the user the script is ready and that the next
step is the **storyboard**. Keep the closing message short: runtime, beat count,
file path.
