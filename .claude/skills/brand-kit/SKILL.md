---
name: brand-kit
description: Builds or updates a client's brand kit for this studio (colours mapped to roles, fonts, logo files, tagline, tone, contact and call-to-action details, verified facts, and an asset library of the brand's own images — people, offerings, testimonials, places, work, proof) from their website and any logos, brand guides or graphics the user provides, and saves it once per client at studio/brands/<slug>/ for every later video to reuse. Use when the user starts videos for a new client or brand, gives a website or logo to "get the brand colours", asks to set up, check, fix or refresh a brand kit, or when another studio stage needs a brand kit that doesn't exist yet.
---

# Brand kit

Makes one reusable kit per client at `studio/brands/<slug>/`:

```
studio/brands/<slug>/
├── brand.json     colours by role, fonts, logo, voice, facts, team, offerings, testimonials (+ computed checks)
├── assets.json    index of the asset library (what each image shows, quality, source)
├── assets/        people/ offerings/ testimonials/ places/ work/ proof/
├── swatch.png     one review image for the colours
├── logo/          logo files actually used
└── source/        raw scan output (site.json, probe.json, candidates.json, contact sheets)
```

The **storyboard** and **render** skills read `colors`, `fonts`, `logo` and
`computed`; the **write** skill reads `voice` and `facts`. Schema and role rules:
[references/brand-schema.md](references/brand-schema.md).

Scripts do the measuring; Claude does the judging. Read the scripts' JSON and console
summaries — don't read raw HTML/CSS or take full-page screenshots to find colours.
Run scripts from the studio root (`node .claude/skills/brand-kit/scripts/...`).

## Step 0 — Existing kit?

Look for the brand among existing kits before creating anything: match the user's
words against each `studio/brands/*/brand.json`'s `slug`, `name`, `aka` and website
in `sources` (e.g. "Stargate", "Sanjay Aggarwal Classes" and "stargate.net.in" are
the same kit). Only if nothing matches, pick a new short kebab-case `slug`.

- **Approved kit:** answer from `brand.json` and show `swatch.png` — no scanning,
  no scripts. For a plain question ("what are Stargate's colours?") just answer it.
  Rebuild only when the user asks to refresh or update it.
- **Draft kit:** resume at Step 7 (approval) with the existing swatch; don't re-scan.
- **Approved kit without an asset library** (no `assets.json`): run only Step 5, then
  re-approve. Storyboards ask for this when they need images.
- **Refresh:** re-run from Step 1, keep anything the user set by hand
  (`from: "user"`), and bump `version`.

## Step 1 — Gather sources

Use everything available, in this order of authority:

1. **The user's instructions** ("our blue is #1F3C88") — always win.
2. **Brand guide / logo files** the user gives or puts in the video's `assets/`.
3. **The website.**

Ask once for anything that would change the result and isn't available — usually
just "Do you have the logo file or a brand guide? Otherwise I'll take them from the
website." Don't block on it.

## Step 2 — Scan the website

1. Static scan (always):
   `node .claude/skills/brand-kit/scripts/site-extract.mjs <url> studio/brands/<slug>/source/site.json`
   Gives CSS colours (site vs framework counts, brand CSS variables), fonts, logo
   candidates, meta, contacts and headings.
2. Rendered probe (when the built-in browser is available — it's more accurate,
   because it measures what is actually on screen): open the site, then run the
   contents of [scripts/browser-probe.js](scripts/browser-probe.js) with
   `javascript_tool`. Save its JSON to `source/probe.json`. It reports background
   colours by screen area, text colours by amount of text, button colours, heading and
   body fonts, and logo images.

If the static scan finds no site colours (fully JS-rendered site) and no browser is
available, rely on the logo and say so.

## Step 3 — Logo

Pick the best candidate (`score`, `alt`, size, and the probe's `logos`); prefer SVG or
the largest PNG, avoid favicons unless nothing else exists. Then:

`node .claude/skills/brand-kit/scripts/logo-palette.mjs studio/brands/<slug>/logo <logo-url-or-path> [...]`

This saves the files and reports each one's real colours by share (transparent pixels
ignored) and its tone (which background it needs). Remove any downloaded file that
turned out not to be the logo. If only a favicon or a photo exists, tell the user and
ask for a proper logo file.

## Step 4 — Decide the roles

Fill `brand.json` (format in the schema reference). Judgement rules:

- **Brand colours come from the brand, not from plugins.** Ignore `framework` colours
  and theme defaults unless the probe shows they really dominate the page.
- **Primary** = the logo's main chromatic colour, confirmed by the site (header,
  big blocks, brand variables). If logo and site disagree, prefer the logo and note it.
- **Accent** = the colour of the site's main buttons/CTAs if it differs from primary;
  otherwise the logo's second colour; otherwise derive one (complementary or warm
  contrast) and mark it `derived`.
- **Secondary** only if the brand clearly uses a second colour. Don't fill it for the sake of it.
- **Background, surface, ink, muted** from the site's real background and text colours,
  adjusted for screens: pure #000 text → a near-black tinted toward primary is fine.
- **Highlight** (optional): a light, saturated colour for marker swipes, if the brand
  has one or one fits naturally.
- **Fonts** from the probe (or static scan): heading = what titles use, body = running text.
- **Voice and facts** from the site's headings, meta and contacts: tagline, spoken name,
  default CTA and contact details, tone words, claims to avoid (unprovable superlatives,
  numbers the site doesn't actually show). Every fact gets a source and date.

Set `status: draft`, `version: 1` (or bump), `updated: <today>`.

## Step 5 — Asset library

Collect the brand's own images once, so every video can use real people, products and
proof instead of text-only scenes. Works for any business — the kinds are general:

| Kind | What it covers |
|------|----------------|
| `people` | founders, team, staff, experts (doctors, chefs, faculty, consultants…) |
| `offering` | products, services, courses, menu items, packages, plans |
| `testimonial` | customer photos, review screenshots, result/proof-of-outcome images |
| `place` | premises, store, clinic, classroom, office, events |
| `work` | portfolio, gallery, projects, before/after |
| `proof` | awards, certificates, partner/client logos, press |

1. `node .claude/skills/brand-kit/scripts/collect-assets.mjs studio/brands/<slug> <site-url>`
   (add `--pages url1,url2` for pages it should not miss). It picks pages across all
   kinds, downloads the largest version of each image, drops icons/duplicates/tiny files,
   and writes `source/candidates.json` (size, quality, guessed kind, alt, nearby text)
   plus **one** contact sheet `source/candidates-sheet.png`.
2. Look at the sheet once; use `candidates.json` text (names, quotes, captions) to
   identify subjects. Keep what a video could actually use; skip placeholders, other
   brands' material, and near-duplicates.
3. Write `assets.json` (format in the schema reference): for each kept image its
   `candidate` id, target `file` (`<kind>/<descriptive-name>.jpg`), `kind`, `subject`,
   one-line `description`, `bakedText` (true if the image has text/prices printed on it),
   optional `crop` to remove baked-in labels or borders, and `source`. Note anything
   time-sensitive (prices, dates) in the description.
4. `node .claude/skills/brand-kit/scripts/finalize-assets.mjs studio/brands/<slug>` —
   copies/crops the chosen files into `assets/`, records size and `quality`
   (`full` ≥ 700 px, `card` ≥ 300 px, `avatar-only` below), removes the candidates.
5. Add the matching **text facts** to `brand.json` (each with source + date): `team`
   (name, role, credentials, asset id), `offerings` (name, detail, asset id),
   `testimonials` (name, short verbatim quote, detail, asset id), and `proof` if any.
   Verify claims against the page text before saving — quotes are verbatim.

Tell the user to confirm usage rights with the client for photos of customers.

## Step 6 — Build and check

`node .claude/skills/brand-kit/scripts/build-kit.mjs studio/brands/<slug>`

It computes on-colours, tint scales, contrast checks and Google Font availability,
writes them to `computed`, and renders `swatch.png`. Fix every warning that has a
fix (adjust `muted`/`ink` lightness, swap a font for its closest Google Font with the
original kept in `original`) and re-run until clean or until what's left is
explained. Every warning you accept instead of fixing becomes a one-line rule in
`usage` (e.g. "accent is a fill colour; never accent text on white"), so the
storyboard and render stages respect it. Then look at `swatch.png` once — it's the only image this skill needs to view.

## Step 7 — Approve

Show the user the swatch and a short summary:

- each role → hex, colour name, where it came from (flag anything `derived`)
- fonts (and any substitutions)
- logo file used and which background it needs
- tagline, default CTA, contact, avoid-list
- asset library: counts per kind, anything low-res or with baked-in prices, the rights note
- any warnings left

Apply changes the user asks for (user-set values get `from: "user"`), re-run
`build-kit.mjs`, and once approved set `status: approved` and re-run it once more so
the swatch shows the final status.

## Hand-off

When the kit is approved, put `brand: <slug>` in the video's `brief.md` if a video is
in progress, and tell the user which stages will use it. Keep the closing short:
kit path, primary/accent hex, fonts.
