// Shared passage planning and alignment. Old voice scripts without `narration`
// retain per-line clips; newly built scripts default to connected beat passages.
const norm = (text) => String(text).toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');

export function spokenText(line, voice = '') {
  return voice.startsWith('hi-') && line.ttsDeva ? line.ttsDeva : line.tts || line.text;
}

/** Voice for a line: its speaker's entry in `voices`, else the narrator `voice`. */
export function lineVoice(vs, line) {
  return line.speaker ? vs.voices?.[line.speaker] ?? null : vs.voice;
}

export function buildPassages(vs, only = null) {
  const mode = vs.narration?.groupBy ?? 'line';
  if (!['line', 'beat'].includes(mode)) throw new Error(`Unknown narration groupBy: ${mode}`);
  const groups = [];
  const seen = new Set();
  for (const line of vs.lines) {
    if (!/^L\d+$/.test(line.id) || seen.has(line.id)) throw new Error(`Invalid or duplicate line ID: ${line.id}`);
    seen.add(line.id);
    if (line.pauseAfter != null && (!Number.isFinite(line.pauseAfter) || line.pauseAfter < 0)) {
      throw new Error(`Invalid pauseAfter on ${line.id}`);
    }
    const key = line.passage ? `passage:${line.passage}` : mode === 'beat' ? `beat:${line.beat}` : `line:${line.id}`;
    const prevGroup = groups.at(-1);
    const prev = prevGroup?.lines.at(-1);
    // a change of speaker (narrator ↔ a character's dialogue) always starts a new passage
    const controlsMatch = prev && (prev.rate ?? null) === (line.rate ?? null) && (prev.pitch ?? null) === (line.pitch ?? null) && (prev.speaker ?? null) === (line.speaker ?? null);
    if (prevGroup?.key === key && prev.pauseAfter == null && controlsMatch) prevGroup.lines.push(line);
    else groups.push({ key, lines: [line] });
  }
  for (const group of groups) {
    group.id = group.lines.length === 1 ? group.lines[0].id : `P_${group.lines[0].id}_${group.lines.at(-1).id}`;
  }
  if (!only) return groups;
  const known = new Set([...seen, ...groups.map((g) => g.id)]);
  for (const id of only) if (!known.has(id)) throw new Error(`Unknown --only ID: ${id}`);
  // Select complete original passages, never combine separated audition lines.
  return groups.filter((g) => only.has(g.id) || g.lines.some((l) => only.has(l.id)));
}

export function alignPassage(group, words, voice = '') {
  const expected = group.lines.map((l) => norm(spokenText(l, voice)));
  if (expected.some((s) => !s) || norm(words.map((w) => w.text).join(' ')) !== expected.join('')) {
    throw new Error(`${group.id}: word timing text differs from narration; fix TTS spelling/alignment before fitting scenes`);
  }
  const segments = group.lines.map((l) => ({ id: l.id, text: l.text, spokenText: spokenText(l, voice), words: [] }));
  let lineIndex = 0;
  let consumed = 0;
  let boundary = expected[0].length;
  let previousEnd = 0;
  for (const word of words) {
    const size = norm(word.text).length;
    if (!size) continue;
    if (!Number.isFinite(word.start) || !Number.isFinite(word.end) || word.start < 0 || word.end < word.start || word.start < previousEnd - 0.05) {
      throw new Error(`${group.id}: invalid word timing`);
    }
    if (consumed + size > boundary) throw new Error(`${group.id}: a word timing crosses a script line boundary`);
    segments[lineIndex].words.push(word);
    previousEnd = word.end;
    consumed += size;
    if (consumed === boundary && lineIndex + 1 < segments.length) boundary += expected[++lineIndex].length;
  }
  if (segments.some((s) => !s.words.length)) throw new Error(`${group.id}: missing line timings`);
  return segments;
}

export function validateSegments(group, meta) {
  if (meta.text !== group.lines.map((l) => spokenText(l, meta.voice ?? '')).join(' ')) {
    throw new Error(`${group.id}: clip text is stale; regenerate this passage`);
  }
  const segments = meta.segments ?? (group.lines.length === 1 ? [{ id: group.lines[0].id, text: group.lines[0].text, words: meta.words ?? [] }] : null);
  if (!segments || segments.length !== group.lines.length || segments.some((s, i) => s.id !== group.lines[i].id || s.text !== group.lines[i].text)) {
    throw new Error(`${group.id}: clip line mapping is stale; regenerate this passage`);
  }
  if (meta.segments) {
    const aligned = alignPassage(group, meta.words ?? [], meta.voice ?? '');
    if (segments.some((s, i) => JSON.stringify(s.words) !== JSON.stringify(aligned[i].words))) {
      throw new Error(`${group.id}: clip alignment is inconsistent; regenerate this passage`);
    }
  }
  return segments;
}
