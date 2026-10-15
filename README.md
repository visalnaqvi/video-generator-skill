# Video studio

A local video production studio run by Claude Code: brand kits, scripts, storyboards, voice-over and
Remotion renders, plus animated universes (the Noxverse with Nox). How it works: [CLAUDE.md](CLAUDE.md).

## Setup (Windows)

Needs [Node.js 20+](https://nodejs.org) and [Python 3.9+](https://www.python.org) (tick "Add to PATH").

```
git clone https://github.com/visalnaqvi/video-generator-skill.git
cd video-generator-skill
npm run setup
```

That installs the Node packages, Remotion's render browser and the Python voice environment
(`.venv` + edge-tts), then runs the health check.

To make **new** AI set art for universes (existing sets render without it), add the local AI tools —
ComfyUI portable + Flux.1-schnell (~19 GB, needs an NVIDIA GPU; downloads resume and are
checksum-verified):

```
npm run setup -- --ai
npm run setup -- --ai --tools D:\studio-tools
```

The second form puts them somewhere other than `<home>\studio-tools`.

Check the studio at any time:

```
npm run doctor
```

## Use

Open the folder in Claude Code and ask for a video ("make a promo for …", "continue the Stargate
video", "a reel with Nox"). The `produce` skill runs the pipeline and stops for your approval at
every stage. Status of all videos: `node studio/scripts/status.mjs`.

Videos (`videos/`) and test renders stay on the machine that made them; they are not in git.
