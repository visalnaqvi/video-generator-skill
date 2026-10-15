# brand.json

One file per client at `studio/brands/<slug>/brand.json`. Claude writes everything
except `computed`, which `build-kit.mjs` fills in. Later stages read it:
**write** uses `voice` and `facts`; **storyboard** and **render** use `colors`,
`fonts`, `logo` and `computed`.

```json
{
  "slug": "stargate",
  "name": "Sanjay Aggarwal Classes",
  "aka": ["Stargate"],
  "status": "draft",
  "version": 1,
  "updated": "2026-10-14",
  "sources": [
    { "type": "website", "ref": "https://stargate.net.in/", "read": "2026-10-14" },
    { "type": "file", "ref": "logo/stargate-logo.png" }
  ],

  "colors": {
    "primary":    { "hex": "#1f3c88", "name": "Stargate Blue", "from": "logo + header" },
    "secondary":  { "hex": "#...", "name": "...", "from": "..." },
    "accent":     { "hex": "#f5a623", "name": "...", "from": "buttons" },
    "highlight":  { "hex": "#ffe066", "name": "...", "from": "derived" },
    "background": { "hex": "#ffffff", "name": "White", "from": "site background" },
    "surface":    { "hex": "#f4f6fb", "name": "...", "from": "derived" },
    "ink":        { "hex": "#14181f", "name": "...", "from": "body text" },
    "muted":      { "hex": "#5b6472", "name": "...", "from": "derived" }
  },

  "fonts": {
    "heading": { "family": "Poppins", "weights": [600, 800], "from": "site h1–h3", "original": null },
    "body":    { "family": "Inter", "weights": [400, 500], "from": "site body", "original": null }
  },

  "logo": {
    "primary": "logo/stargate-logo.png",
    "onDark": null,
    "icon": null,
    "safeBackground": "light",
    "notes": "Wordmark is dark blue — place on white or very light backgrounds."
  },

  "voice": {
    "spokenName": "Sanjay Aggarwal Classes",
    "tagline": "Greatness Achieved Through Excellence",
    "tone": ["confident", "mentor-like", "warm"],
    "cta": { "default": "Book your free career counselling", "phone": "7210032621", "url": "https://stargate.net.in/", "whatsapp": null },
    "contact": { "phones": ["011-43053800", "7210032621"], "email": null, "address": "..." , "social": [] },
    "say": ["CA and CMA, Foundation to Final"],
    "avoid": ["India's No.1 faculty (unprovable)"]
  },

  "facts": [
    { "claim": "Founders have taught CA students for 25+ years", "source": "https://stargate.net.in/", "checked": "2026-10-14" }
  ],

  "usage": ["Accent orange is a fill colour; never orange text on white (2.2:1)."],
  "notes": "",

  "computed": { "on": {}, "scales": {}, "contrast": [], "fonts": {}, "warnings": [], "built": "2026-10-14" }
}
```

## Content facts (any business)

Added in Step 5 alongside the asset library; the write skill uses them as material,
the storyboard links them to images via `asset` ids.

```json
"team":         [ { "name": "...", "role": "...", "credentials": "...", "asset": "<asset id>", "source": "...", "checked": "YYYY-MM-DD" } ],
"offerings":    [ { "name": "...", "detail": "...", "asset": "<asset id>", "source": "...", "checked": "..." } ],
"testimonials": [ { "name": "...", "quote": "verbatim, short", "detail": "...", "asset": "<asset id>", "source": "...", "checked": "..." } ],
"proof":        [ { "claim": "...", "asset": "<asset id>", "source": "...", "checked": "..." } ],
"assets": "assets.json"
```

## assets.json

```json
{
  "brand": "<slug>",
  "updated": "YYYY-MM-DD",
  "rights": "Where the images come from; what needs client confirmation.",
  "assets": [
    { "id": "jane-doe-portrait", "file": "people/jane-doe.jpg", "kind": "people",
      "subject": "Dr Jane Doe — founder", "description": "Waist-up portrait, clinic background.",
      "bakedText": false, "size": "1080x880", "quality": "full", "source": "https://..." }
  ]
}
```

Kinds: `people`, `offering`, `testimonial`, `place`, `work`, `proof`, `graphic`.
`quality`: `full` (≥ 700 px short side — full-screen OK), `card` (≥ 300 px — cards/frames),
`avatar-only` (small circles only). `bakedText: true` = the image has words/prices printed
on it: never put a caption over it, and check prices/dates are still current.

## Colour roles

Styles in the storyboard skill refer to these roles, never to raw hex values.

| Role | Required | Use | Rule |
|------|----------|-----|------|
| `primary` | yes | The brand's signature colour: big blocks, title cards, end card | Must pass 3:1 on `background` |
| `secondary` | no | A second brand colour, if the brand really has one | Don't invent one to fill the slot |
| `accent` | yes | Calls to action, key numbers, the one thing to look at | Must differ clearly from `primary` (hue or lightness) |
| `highlight` | no | Marker swipes, emphasis behind text | `ink` must pass 4.5:1 on it |
| `background` | yes | Default canvas | Usually white/off-white or near-black |
| `surface` | yes | Cards and panels on the background | A few % lighter/darker than `background` |
| `ink` | yes | Main text | 4.5:1 on `background` and `surface` (aim for 7:1) |
| `muted` | yes | Secondary text, labels, captions | 4.5:1 on `background` |

`from` records where each colour came from: `logo`, `header`, `buttons`, `site
background`, `body text`, `brand guide`, `user`, or `derived` (made by Claude to
fill a role). Only `primary`, `secondary` and `accent` should come from real brand
sources whenever they exist.

## Usage rules

`usage` holds plain-language rules that later stages must follow, written whenever a
contrast warning is accepted rather than fixed (e.g. "accent is a fill colour only")
or the logo has placement limits. Keep each rule to one line.

## Fonts

- Prefer the site's real fonts. If a font isn't on Google Fonts (paid, custom,
  system-only), put its name in `original` and use the closest Google Font as `family`.
- Heading weights: the bold weight(s) actually used for titles. Body: regular + medium.
- Scripts other than Latin: pick a family that covers the video's on-screen language
  (e.g. Hindi in Devanagari → "Noto Sans Devanagari", "Mukta", "Hind").

## Facts

Only things stated on the brand's own site, brand guide or by the user — each with
its source and the date checked. The write skill may use these without re-checking,
but should re-check anything older than 90 days (ratings, prices, offers change).
