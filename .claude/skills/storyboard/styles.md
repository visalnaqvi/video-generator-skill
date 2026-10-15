# Style library

A style is the **base look** a concept builds on: a token file `studio/styles/<id>.json`
(heading case/weight/tracking, motion feel, card look, corner radius, emphasis) that every
layer and template inherits. The concept then designs the actual scenes with composed
layers (backgrounds, textures, strokes, photos, effects — see references/compose.md).
Colours always come from the brand kit. All 12 styles are available.

| Style | Video types | Mood | Brand fit / composed-scene ingredients |
|-------|-------------|------|------------------------------------------|
| `swiss-kinetic` | promo, explainer, social | bold, credible, editorial | Any brand; strongest for confident, results-led messaging |
| `clean-premium` | promo, explainer, tutorial | calm, trustworthy, polished | Education, finance, health, B2B; safe default |
| `bold-gradient` | promo, social | energetic, modern | Brands with a strong saturated primary; youth audiences |
| `neobrutalism` | social, promo | loud, playful, Gen-Z | Needs high-contrast palette; not for serious/premium topics |
| `dark-luxury` | promo, storytelling | premium, cinematic | Premium/luxury brands, launches; all scenes on dark |
| `data-infographic` | explainer, tutorial, promo (proof) | analytical, clear | Number-heavy scripts, reports, finance |
| `glass` | promo, social, explainer | modern, tech, soft | Tech/apps; needs a dark or saturated secondary |
| `exam-paper` | promo, explainer, tutorial, social | familiar, studious, warm | Education brands. `grid-paper`/`lined-paper` backgrounds, `hand` font, red-pen `stroke` circles/ticks/underlines, marker highlights; `brush` layer for real pencil ticks and highlighter washes |
| `whiteboard-doodle` | explainer, tutorial | friendly, simple | `paper` background, `hand` font, `stroke` boxes/arrows/underlines drawn on, icons; `brush` layer (marker/charcoal lines, watercolour fills, hatching) for a tactile hand-drawn finish |
| `editorial` | promo, storytelling | magazine, refined | `serif` font for headlines, framed/cropped photos, generous space, thin rules |
| `documentary` | storytelling | cinematic, archival | `photo` backgrounds with slow zoom, duotone/grayscale, `mono` date/place stamps, grain + vignette |
| `pop-art` | social, promo | loud, comic | `dots` and `burst` shapes, hard shadows, thick outlines, `slam` entrances |

## Choosing a base look for a concept

1. Filter by the brief's video type, brand fit (`usage` rules, palette, premium vs playful)
   and audience/tone.
2. Each concept names one base style; concepts offered together should differ clearly.

## Per-style direction notes

- **swiss-kinetic** — Uppercase headings, tight grid, no shadows. Prefer `pushCut`/`wipe`.
  Emphasis = inverted box. Keep text left-aligned for long statements (`align: left`).
- **clean-premium** — Soft shadows, generous space, smooth motion, underline emphasis.
  Prefer `fade`/`slide`. Good with light surfaces throughout.
- **bold-gradient** — Light surfaces are remapped to primary; gradient backdrops, glass
  cards, bouncy motion. Prefer `slide`/`iris`.
- **neobrutalism** — Thick ink borders, hard offset shadows, dot backdrop, uppercase,
  bouncy. Prefer hard cuts and `pushCut`.
- **dark-luxury** — Everything on the brand's darkest colour, thin outlines, wide tracking,
  slow motion, colour emphasis. Prefer long `fade`s. Fewer words per scene.
- **data-infographic** — Grid backdrop, flat cards, snappy counters. Favour StatCounter,
  RatingStars, numbered ListCards.
- **glass** — Animated colour-mesh backdrop on dark, frosted cards. Prefer `fade`/`slide`.

Token overrides for one video go in `storyboard.json` → `styleOverrides` (e.g.
`{ "motion": "smooth" }`), not in the shared style file.
