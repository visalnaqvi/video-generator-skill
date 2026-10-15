"""Free voice: generates connected passages with Microsoft Edge neural voices
(edge-tts) and saves word timings next to each clip.

Usage (from the studio root):
  .venv/Scripts/python.exe .claude/skills/voiceover/scripts/tts_edge.py <voice-script.json> --voice en-IN-PrabhatNeural
      [--rate +0%] [--pitch +0Hz] [--out <dir>] [--only L01,L02]

Writes <out>/<passage-id>.mp3 and .json with words and original line segments.
--only selects whole passages containing the requested line IDs, preserving context.
Dialogue (lines with a `speaker`, from `VO (Nox): …`) is spoken in voices.<speaker> — all clips
land in the same folder, so assemble.mjs builds one track. --speaker nox limits a run to one
speaker; --speaker-voice tries another voice for it (auditions).
For hi-IN voices a line's `ttsDeva` (Devanagari) is used when present, else `tts`, else `text`.
"""
import argparse
import asyncio
import json
import os
import sys

import edge_tts
from passages import build_passages, align_passage, spoken_text


def pick_text(line, voice):
    return spoken_text(line, voice)


async def make(passage, voice, rate, pitch, out):
    text = ' '.join(pick_text(line, voice) for line in passage['lines'])
    rate = passage['lines'][0].get('rate') or rate
    pitch = passage['lines'][0].get('pitch') or pitch
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    words, audio = [], bytearray()
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            start = chunk["offset"] / 1e7
            words.append({"text": chunk["text"], "start": round(start, 3), "end": round(start + chunk["duration"] / 1e7, 3)})
    segments = align_passage(passage, words, voice)
    with open(os.path.join(out, f"{passage['id']}.mp3"), "wb") as f:
        f.write(audio)
    with open(os.path.join(out, f"{passage['id']}.json"), "w", encoding="utf-8") as f:
        json.dump({"text": text, "voice": voice, "rate": rate, "pitch": pitch, "words": words, "segments": segments}, f, ensure_ascii=False, indent=1)
    return len(words)


def passage_voice(vs, passage, a):
    """Narrator passages use --voice/--rate/--pitch; dialogue passages use voices.<speaker>."""
    speaker = passage['lines'][0].get('speaker')
    if not speaker:
        return a.voice, a.rate, a.pitch
    if a.speaker_voice and a.speaker == speaker:
        return a.speaker_voice, a.speaker_rate or '+0%', a.speaker_pitch or '+0Hz'
    v = (vs.get('voices') or {}).get(speaker) or {}
    if not v.get('name'):
        raise ValueError(f"no voice for speaker '{speaker}': set voices.{speaker}.name in the voice script")
    return v['name'], a.speaker_rate or v.get('rate') or '+0%', v.get('pitch') or '+0Hz'


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--voice", help="narrator voice (default: the voice script's voice.name)")
    ap.add_argument("--rate", default=None)
    ap.add_argument("--pitch", default=None)
    ap.add_argument("--out")
    ap.add_argument("--only")
    ap.add_argument("--speaker", help="only this speaker's passages ('narrator' for the narration)")
    ap.add_argument("--speaker-voice", help="audition: try this voice for --speaker instead of its saved one")
    ap.add_argument("--speaker-rate", help="audition: rate for --speaker-voice")
    ap.add_argument("--speaker-pitch", help="audition: pitch for --speaker-voice")
    a = ap.parse_args()
    vs = json.load(open(a.script, encoding="utf-8"))
    nv = vs.get('voice') or {}
    a.voice = a.voice or nv.get('name')
    a.rate = a.rate or nv.get('rate') or '+0%'
    a.pitch = a.pitch or nv.get('pitch') or '+0Hz'
    if not a.voice:
        raise SystemExit("no narrator voice: pass --voice or set voice.name in the voice script")
    out = a.out or os.path.join(os.path.dirname(os.path.abspath(a.script)), "clips", a.voice)
    os.makedirs(out, exist_ok=True)
    only = set(a.only.split(",")) if a.only else None
    passages = build_passages(vs, only)
    if a.speaker:
        want = None if a.speaker == 'narrator' else a.speaker
        passages = [p for p in passages if p['lines'][0].get('speaker') == want]
    failures = 0
    for passage in passages:
        try:
            voice, rate, pitch = passage_voice(vs, passage, a)
            n = await make(passage, voice, rate, pitch, out)
            who = passage['lines'][0].get('speaker') or 'narrator'
            print(f"{passage['id']} · {who} · {voice} · {n} words · {len(passage['lines'])} lines")
        except Exception as e:  # network or voice errors: report and continue
            failures += 1
            print(f"{passage['id']} · FAILED: {e}", file=sys.stderr)
    print(f"Clips {out}")
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    asyncio.run(main())
