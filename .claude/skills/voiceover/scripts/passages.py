"""Passage planning/alignment equivalent to passages.mjs for free Edge TTS."""
import math
import unicodedata


def norm(text):
    return ''.join(c for c in str(text).lower() if unicodedata.category(c)[0] in 'LMN')


def spoken_text(line, voice=''):
    return line['ttsDeva'] if voice.startswith('hi-') and line.get('ttsDeva') else line.get('tts') or line['text']


def build_passages(vs, only=None):
    mode = vs.get('narration', {}).get('groupBy', 'line')
    if mode not in ('line', 'beat'):
        raise ValueError(f'Unknown narration groupBy: {mode}')
    groups, seen = [], set()
    for line in vs['lines']:
        lid = line['id']
        if not (lid.startswith('L') and lid[1:].isascii() and lid[1:].isdigit()) or lid in seen:
            raise ValueError(f'Invalid or duplicate line ID: {lid}')
        seen.add(lid)
        pause = line.get('pauseAfter')
        if pause is not None and (not isinstance(pause, (float, int)) or not math.isfinite(pause) or pause < 0):
            raise ValueError(f'Invalid pauseAfter on {lid}')
        key = ('passage', line['passage']) if line.get('passage') else (('beat', line['beat']) if mode == 'beat' else ('line', lid))
        prev = groups[-1]['lines'][-1] if groups else None
        # a change of speaker (narrator <-> a character's dialogue) always starts a new passage
        controls_match = prev and prev.get('rate') == line.get('rate') and prev.get('pitch') == line.get('pitch') and prev.get('speaker') == line.get('speaker')
        if groups and groups[-1]['key'] == key and prev.get('pauseAfter') is None and controls_match:
            groups[-1]['lines'].append(line)
        else:
            groups.append({'key': key, 'lines': [line]})
    for group in groups:
        lines = group['lines']
        group['id'] = lines[0]['id'] if len(lines) == 1 else f"P_{lines[0]['id']}_{lines[-1]['id']}"
    if only is None:
        return groups
    unknown = only - (seen | {g['id'] for g in groups})
    if unknown:
        raise ValueError(f'Unknown --only IDs: {sorted(unknown)}')
    return [g for g in groups if g['id'] in only or any(l['id'] in only for l in g['lines'])]


def align_passage(group, words, voice=''):
    expected = [norm(spoken_text(l, voice)) for l in group['lines']]
    if not all(expected) or norm(' '.join(w['text'] for w in words)) != ''.join(expected):
        raise ValueError(f"{group['id']}: word timing text differs from narration; fix TTS spelling/alignment before fitting scenes")
    segments = [{'id': l['id'], 'text': l['text'], 'spokenText': spoken_text(l, voice), 'words': []} for l in group['lines']]
    index, consumed, boundary, previous_end = 0, 0, len(expected[0]), 0
    for word in words:
        size = len(norm(word['text']))
        if not size:
            continue
        start, end = word['start'], word['end']
        if not math.isfinite(start) or not math.isfinite(end) or start < 0 or end < start or start < previous_end - 0.05:
            raise ValueError(f"{group['id']}: invalid word timing")
        if consumed + size > boundary:
            raise ValueError(f"{group['id']}: word timing crosses a script line boundary")
        segments[index]['words'].append(word)
        previous_end = end
        consumed += size
        if consumed == boundary and index + 1 < len(segments):
            index += 1
            boundary += len(expected[index])
    if any(not s['words'] for s in segments):
        raise ValueError(f"{group['id']}: missing line timings")
    return segments
