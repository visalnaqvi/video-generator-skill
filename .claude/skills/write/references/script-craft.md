# Script craft — draft narration, then divide it into beats

Read before writing or revising a story or script. Beats are production divisions
of a connected piece of speech, not separate boxes to fill from a template.

## 1. Choose a reason to listen

Identify one viewer in a specific situation, the belief or understanding that
should change, and the sourced detail that makes the change credible. Choose a
creative angle around these. A feature list is source material, not an angle.
For a promo, choose one central promise and a reason to believe it. For an
explainer, choose one question and a mechanism that answers it. Do not invent pain,
guarantees, testimonials or capabilities to make an angle work.

Develop the hook with its continuation and payoff. A result-led opening should
lead to a credible explanation of that result; a question should receive its
answer. An attractive hook whose body is a different story is not ready.

## 2. Write continuous narration first

Write the spine in one sentence, then draft the complete spoken narration in
prose, from the approved opening to the ending. Do this before making the beat
table, allocating seconds or writing on-screen labels. Refine the argument and
rhythm, then divide the prose at changes in meaning. The playbook's structure is
a coverage guide; merge, omit or reorder functions when the story benefits.

For a product walkthrough, follow one thing through its life. Model the actual
sequence and prerequisites. Alternatives belong at the same decision point:
create manually or draft with AI, review, publish, distribute, receive submissions.
Do not publish a test and then return to creating it unless an intentional rewind
is explained and useful. Do not imply a capability because a familiar workflow
usually includes it. Receiving submissions does not prove automatic marking or
diagnostic recommendations.

The spine explains why the events belong together, rather than naming all the
sections. Save it as `spine:` in `story.md`.

## 3. Connections come from meaning

At each boundary, identify the relationship: cause and consequence, question and
answer, obstacle and response, prerequisite and next action, or a contrast that
advances the argument. The next sentence should pick up that relationship.

Use "so", "but", "once" or "now" when needed. Do not add a connector at every scene
boundary. Read adjacent sentences without their opening connectors: if they still
have no relationship, fix the order or content.

### The first-time viewer test (every beat boundary)

The user has rejected scripts several times for joins that only made sense to the
writer. Topic continuity is not a connection. At each boundary, read the last sentence
of one beat and the first sentence of the next as a viewer who knows nothing but what
was already said, and answer:

1. **Who?** Every "he/she/they/it" has exactly one possible referent. When two people
   of the same pronoun are in play (a son and his dad), name the person at the start
   of each new beat and at every key action ("Brandon shouted", not "he shouted").
2. **Why?** Every action has a reason the viewer has heard. "So he walks toward the
   lights" needs the reason (to meet his parents in town) in the same or previous line.
3. **When?** Every new event in a story has a time anchor relative to the last one
   ("forty-seven minutes into the call", "later that same day", "a year later").
   An event without one makes the viewer guess the gap.
4. **What does it answer?** If the previous beat left a question open (his parents
   couldn't find him), the next beat must answer it or say it stays open, not drop it.
5. **Same tense** across the join unless a time jump is announced.

Write the answer down as a one-line join (see SKILL.md, **Joins**). If you can't
state the relationship in one line, the join is broken; fix the words, not the label.

Keep labels such as "Make it", "Share it", "Results" and "Our benefits" in beat names
or ON-SCREEN text. Cut narration that merely announces a section, such as "First,
make the test" followed by sentences already describing making it. Numbered steps
can help a genuine instructional tutorial or explicit list; they are not the
default for an ad or product explainer.

## 4. Select details, don't recite the brief

Every passage advances the central promise or explanation. Tie a feature to the
viewer's current need and the mechanism or evidence that addresses it. Specificity
comes from relevant detail, not from cramming in names and numbers.

Distinguish mandatory spoken content, mandatory content that may appear on screen,
and optional supporting material. Never silently demote something explicitly
required in VO. If mandatory material cannot fit naturally, flag the conflict and
propose a longer runtime or narrower scope. Available brand facts are not
automatically must-includes.

Cut orphan features. Avoid making every scene repeat the same benefit-feature
formula. Let the product action demonstrate value where possible. A customer's
result belongs to that customer; it is not a promised outcome for every viewer.

## 5. Write for the ear

Talk to one person in the requested language naturally. Prefer concrete verbs,
contractions and varied sentence lengths. Avoid brochure fillers such as
"seamless", "game-changer", "unlock your potential" and "all-in-one solution",
unless explicitly required as a quote. Deliberate fragments can land a punch,
but consecutive feature labels sound like a brochure being read aloud.

Use commas, full stops and question marks according to the thought. Use an
exclamation mark or ellipsis when the delivery needs it, without quotas. Avoid
dashes, colons, semicolons, brackets, symbols and stage directions inside VO.
Spell numbers and abbreviations as spoken. Put performance intent in DELIVERY;
punctuation does not guarantee a voice engine's emotion or emphasis.

A `VO:` line may contain several connected sentences. Line and beat breaks are
editorial divisions, not mandatory pauses or separate TTS calls. Use
`VO: [SILENCE 1s]` only for intentional silence. Voiceover groups connected passages
and retains word timings for scene cuts.

## 6. Review observable behavior

Read only the narration as one uninterrupted piece, with headings and production
notes hidden. Repair failures before showing the draft:

- **Section announcement:** Does a sentence merely announce what the next sentence
  does? Remove it unless the audience needs instructional signposting.
- **Sequence:** Does an action precede its prerequisite, or return to a completed
  stage? Repair the sequence; place alternatives before convergence.
- **Connection:** What does each new passage inherit from the previous one? If
  several middle passages could be shuffled without changing the argument, rebuild
  the spine. Independent items are an intentional exception for a requested listicle.
- **Specificity:** Could a competitor use the copy by replacing the name? Use a
  relevant sourced mechanism, situation or proof instead of generic praise.
- **Payoff:** Does the ending resolve the opening and lead naturally to the requested
  action? A repeated slogan alone does not answer the question.
- **Economy:** Does each sentence add information, tension, evidence or useful
  rhythm? Cut labels and tangents. Don't pad a finished thought to hit a runtime.
- **Claims:** Are attribution, scope and qualifiers preserved? Are spoken and
  on-screen claims supported? Keep unknowns visible until resolved.
- **Timing:** Count actual spoken words. Estimate speech plus intentional pauses
  and end-card room. Check the hook separately; don't rush a dense opening to fit.

When revising, read the whole narration, repair surrounding logic and rhythm, then
regenerate the table from the prose.

## Example — workflow without spoken headings

Before:

> First, make the test. Upload your notes and the AI drafts it. You approve and
> publish it. Or write it yourself. Next, share it. Finally, see the results.

After (illustrative wording; use the actual brief and supported access rules):

> Upload your class notes, and MockPilot drafts the questions. You can also write
> your own, with equations and pictures. Review the test before publishing, then
> choose who can take it. Once your institute's students submit their attempts,
> you can find them by test, student or date.

The alternatives happen before publishing. Students' actions motivate the move to
submissions. No sentence announces a heading or implies automated marking.
