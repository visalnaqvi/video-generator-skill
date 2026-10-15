# Music library

Drop royalty-free tracks here (MP3/WAV) and list them in `index.json`. The render skill
picks from this library first and only generates fallback music in code when nothing fits.

Good free sources (download them yourself — each site has its own terms; keep the licence
note): **YouTube Audio Library** (studio.youtube.com → Audio library, "no attribution
required" filter), **Pixabay Music** (pixabay.com/music).

Useful moods to collect for ads, explainers and Reels (2–3 each):

| Mood tag | What to look for |
|----------|------------------|
| `upbeat` | Bright, driving, light percussion, 100–125 bpm — promos, social |
| `corporate` | Clean, positive, steady — explainers, B2B, education |
| `inspiring` | Builds from soft to big — stories, launches, results |
| `cinematic` | Tension, pulses, big hits — storytelling, reveals |
| `calm` | Soft piano/pads — tutorials, healthcare, finance |
| `trendy` | Lo-fi / hip-hop / pop beats — Gen-Z social shorts |

`index.json` format:

```json
{
  "tracks": [
    { "file": "bright-drive.mp3", "moods": ["upbeat", "corporate"], "bpm": 116, "length": 92,
      "source": "YouTube Audio Library — Bright Drive by …", "licence": "no attribution required" }
  ]
}
```
