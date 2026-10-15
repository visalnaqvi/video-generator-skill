// Fingerprint of everything that changes a rendered video: shots, style, captions, format and the
// audio file's bytes (+ the lip-sync track). Saved by render.mjs --final (render/final.json); compared by status.mjs.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export async function renderFingerprint(sb, videoDir) {
  const h = createHash('sha1');
  const { scenes, style, styleOverrides, format, fps, captions, brand, universe } = sb;
  h.update(JSON.stringify({ scenes, style, styleOverrides, format, fps, captions, brand, universe }));
  const audio = sb.finalAudio ?? sb.audio;
  if (audio) h.update(await readFile(join(videoDir, audio)).catch(() => Buffer.from('missing')));
  h.update(await readFile(join(videoDir, sb.lipsync ?? 'audio/lipsync.json')).catch(() => Buffer.from('')));
  return h.digest('hex').slice(0, 16);
}
