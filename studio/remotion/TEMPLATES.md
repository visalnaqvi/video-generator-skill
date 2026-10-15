# Scene templates

What the storyboard skill can put in `storyboard.json`. Read this file — not the
template code — to choose templates and props. All templates take colours, fonts and
logo from the brand kit; never pass hex values. Sizes adapt to every format.

`surface` (most templates): `background` | `surface` | `primary` | `secondary` | `accent`
— the canvas colour. Text colour follows automatically (light text on primary/secondary).

| Template | Use for | Props (★ required) | Default surface | Good length |
|----------|---------|--------------------|-----------------|-------------|
| **NumberSlam** | A big result/number hook | ★`value` (string), ★`label`, `caption`, `tag` (attribution under the card) | secondary | 2.5–3.5 s |
| **TextCard** | One statement; words rise in | ★`text`, `kicker` (small line above), `emphasis` (words with marker swipe), `align` center/left | background | 2–4 s |
| **LogoReveal** | Brand reveal | `title` (default brand name), `tagline` | background | 2–3 s |
| **NameCards** | Introduce 1–3 people | ★`people` [{★`name`, `role`, `photo` (asset path)}], `heading`, `stagger` (frames, default 14) | surface | 2.5–4 s |
| **StatCounter** | A number counting up | ★`value` (number), ★`label`, `prefix`, `suffix` (pops in a marker), `decimals`, `countFrames` (default 30) | primary | 2.5–3 s |
| **ListCards** | 2–4 benefits/steps one by one | ★`items` [string or {`text`, `at` (frame)}], `heading`, `marker` check/number, `stagger` (default 18) | background | 1.5–2.5 s per item |
| **RatingStars** | Ratings / reviews | ★`rating` (string, e.g. "5.0"), `outOf` (5), `label`, `count` | secondary | 3 s |
| **EndCard** | Offer + call to action | ★`headline`, ★`cta`, `subline`, `showLogo` (true) | background | 4–5 s |
| **PersonSpotlight** | One person: founder, expert, staff | ★`photo`, ★`name`, `role`, `kicker`, `focus` top/center | surface | 2.5–4 s |
| **Testimonial** | A customer quote | ★`quote`, ★`name`, `detail`, `photo` (avatar), `stars`, `backdrop` (image behind, dimmed) | secondary | 3.5–6 s (≈ 2.5 words/s to read) |
| **OfferCards** | Products / services / courses / menu items | ★`items` [{`image`, `title`, `detail`, `at`}], `heading`, `stagger` (8), `fit` cover/contain | background | 2.5–4 s |
| **PhotoScene** | Full-bleed photo, slow zoom | ★`image`, `caption`, `kicker`, `zoom` in/out, `focus`, `captionPosition` bottom/center | — (photo) | 2–4 s |

NumberSlam also takes `photo` (avatar shown beside the `tag`).

**Images:** `photo`/`image` props take `brand:<path>` for the brand kit's asset library
(`studio/brands/<slug>/assets/<path>`, listed in its `assets.json`) or a path relative to
the storyboard's folder (the video's own `assets/`). Check each asset's `quality`:
`avatar-only` images only in avatar slots; `bakedText` images never under a caption.

## storyboard.json (render contract)

```json
{
  "brand": "stargate",
  "style": "clean-premium",
  "styleOverrides": { "motion": "snappy" },
  "format": "9:16",
  "fps": 30,
  "audio": "audio/voiceover.mp3",
  "scenes": [
    { "id": "hook", "template": "NumberSlam", "durationInFrames": 100,
      "props": { "value": "87", "label": "CA Final Costing" },
      "transition": { "type": "pushCut", "durationInFrames": 10 },
      "sheetFrame": 60 }
  ]
}
```

- `style`: a token file in `studio/styles/<id>.json` (radius, shadow, card look, backdrop,
  heading case/weight/tracking, motion, emphasis). `styleOverrides` changes single tokens
  for this video only. Token reference: `src/style.ts`.
- `format`: `9:16` | `16:9` | `1:1` | `4:5`. `audio` and asset props are paths relative to the storyboard's folder.
- `transition` goes **into the next scene** and overlaps both (default 10 frames), so it
  shortens the total: total = Σ durations − Σ transitions.
  Types: `none`, `fade`, `slide` (direction `from-left|right|top|bottom`), `wipe`
  (same + diagonals like `from-top-left`), `flip`, `iris`, `pushCut`.
- `startFrom` (optional): skip this many frames of the template's entrance animation —
  use on the first scene so the hook is already readable on frame 1 (≈ 8–12).
- `sheetFrame` (optional): frame within the scene used for the contact sheet (default 70%).
- Extra fields (direction notes, beat refs) are allowed and ignored by the renderer.

## Commands

```
node studio/scripts/render.mjs <storyboard.json> --sheet     # contact sheet → storyboard-sheet.png (~1k tokens to view)
node studio/scripts/render.mjs <storyboard.json> --preview   # 540p MP4 → render/preview.mp4 (~15 s for 30 s video)
node studio/scripts/render.mjs <storyboard.json> --final     # full-res MP4 → render/final.mp4
node studio/scripts/render.mjs <storyboard.json> --styles a,b,c --scene hook   # one scene in 3 styles → style-options.png
npx remotion studio studio/remotion/src/index.ts             # live preview of every template
```

## Adding a template

1. `src/templates/<Name>.tsx` — wrap in `<Scene surface>`; use `useHeading()`, `useCard()`,
   `useSurface()`, `useUnit()` (sizes × u) and `useEnter()` so every style token applies.
2. Register it in `src/templates/index.ts` and add sample props in `Root.tsx`.
3. Add a row above. Keep brand rules: accent/highlight are fills with their on-colour text.
