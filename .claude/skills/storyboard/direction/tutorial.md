# Direction — Tutorial / how-to

Goal on screen: **the viewer can follow along**. Clear, steady, step numbers always visible.

| | |
|-|-|
| Scene length | One scene per step, 3–6 s; long enough to do the step |
| Cuts | Exactly on step boundaries |
| Transitions | Consistent and quiet: `slide` from-right (forward progress), 10–12 frames |
| Screen density | Step number + the exact button/value name; nothing else competing |
| Motion | Snappy but calm; highlight the thing to tap/click |
| Music | Minimal, steady, low |
| SFX density | Low: a soft tick when each step appears, a chime on "done" |

## Beat → scene patterns

| Beat | Typical scenes | Notes |
|------|----------------|-------|
| Hook | NumberSlam (time/steps promise) · TextCard (result) | Show the outcome first |
| What you need | ListCards `marker: check` | Skip if nothing is needed |
| Steps | ListCards `marker: number` (one item per VO step, `at` timed) or one TextCard per step | Button labels in quotes, exactly as in the script |
| Result + check | TextCard with `emphasis` | How the viewer knows it worked |
| Tip | TextCard with `kicker: "Pro tip"` | |
| CTA | EndCard | "Save this" |

Real screen recordings need a **screen-recording template** (not built yet) — ask before planning one.

## Avoid

- Changing layout between steps (viewers lose their place)
- Fancy transitions; they slow learning
