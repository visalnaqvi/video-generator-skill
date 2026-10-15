# Studio library

```
studio/library/
├── universes/<universe>/   a named animation world, used ONLY when the user names it or its character
│   ├── universe.json       what it is, when to use it, characters, components, formats, music, voice
│   ├── brand.json          its palette + fonts (brand-kit format; replaces the brand kit unless a client brand is requested)
│   ├── look.md             animation rules + look-frames.png / look-board.png
│   ├── rig-parts.mjs       shared character body as SVG parts: outline, proportions, ARMS, FACE_PARTS (+ live animation state)
│   ├── rig.mjs             builds the still PNGs from rig-parts → `node rig.mjs <character>` (live version: remotion/src/compose/rig.tsx)
│   ├── characters/<id>/    character.json (colours on the rig, poses, heads, notes) · poses/ · heads/ · sheet.png
│   ├── scenes/             code-drawn scene art · index.json (tags + placement hints) · make.mjs · sheet.png
│   ├── components/         reusable elements (<universe>/<name>) · _util.mjs · demo/ · catalog.png
│   └── formats/            story formats (writing pattern + the components that carry it)
├── music/                  shared tracks + index.json (generator: studio/scripts/make-music.mjs)
└── sfx/                    shared sound effects + index.json (generator: studio/scripts/make-sfx.mjs)
```

Universes now: **Noxverse** — lead character **Nox** (`node studio/scripts/library.mjs noxverse`).

## How a video uses a universe

Only when the user names it ("a reel with Nox", "in the Noxverse") — never offered otherwise:
`brief.md` gets `universe:` + `characters:`, the storyboard uses the universe's look, characters
(`lib:universes/<u>/characters/<id>/poses/<pose>.png`), scene art (`lib:universes/<u>/scenes/<id>.png`)
and components (`{ "type": "component", "use": "<u>/<name>", "props": {…} }`), and
`storyboard.json` has `"universe": "<u>"`. render.mjs stages `lib:` paths, expands components
(`studio/scripts/lib/components.mjs`) and takes the palette from the universe when there's no
`brand`. Details: the `universe` skill.

## Rules

- **Additive only.** Finished videos re-render from these files: never change what an existing
  pose, scene file or component renders by default. New look → new id or an opt-in prop.
- **Same universe = same rig.** New characters reuse `rig-parts.mjs` so they animate consistently; a new
  animation style is a new universe with its own rig and components.
- **Generic, not client-specific.** Client logos/photos stay in `studio/brands/<slug>/assets/`.
- **Code-drawn or licensed.** Note the source/licence of anything not generated here.
