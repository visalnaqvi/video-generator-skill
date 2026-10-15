// Parallel ranged download with resume and a SHA-256 check (used by setup.mjs for the big AI files).
//   await download({ url, sha256 }, outFile, parts, log)
// Pieces go to <out>.part<i> (re-running resumes them); a verified file gets <out>.sha256 and is skipped next time.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export async function sha256(file) {
  const h = createHash('sha256');
  await pipeline(createReadStream(file), h);
  return h.digest('hex');
}
export async function fetchRetry(url, init, tries = 10) {
  for (let i = 0; ; i++) {
    try { const r = await fetch(url, { redirect: 'follow', ...init }); if (r.ok || r.status === 206) return r; throw new Error(`HTTP ${r.status}`); }
    catch (e) { if (i >= tries) throw e; await new Promise((res) => setTimeout(res, 3000)); }
  }
}
/** Parallel ranged download with resume, then a checksum check. Skips when the file is already verified. */
export async function download({ url, sha256: want }, out, parts = 6, log = console.log) {
  const mark = `${out}.sha256`;
  if (existsSync(out) && existsSync(mark) && (await readFile(mark, 'utf8')).trim() === want) { log(`  ${out} already verified`); return; }
  await mkdir(dirname(out), { recursive: true });
  const size = Number((await fetchRetry(url, { method: 'HEAD' })).headers.get('content-length'));
  if (!(existsSync(out) && statSync(out).size === size)) {
    const chunk = Math.ceil(size / parts);
    const files = Array.from({ length: parts }, (_, i) => `${out}.part${i}`);
    let last = 0;
    const timer = setInterval(() => {
      const got = files.reduce((s, f) => s + (existsSync(f) ? statSync(f).size : 0), 0);
      log(`  ${(got / 1e9).toFixed(2)} / ${(size / 1e9).toFixed(2)} GB  ${((got - last) / 5 / 1048576).toFixed(1)} MB/s`); last = got;
    }, 5000);
    await Promise.all(files.map(async (f, i) => {
      const a = i * chunk, b = Math.min(size, a + chunk) - 1;
      for (let attempt = 0; attempt < 30; attempt++) {
        const have = existsSync(f) ? statSync(f).size : 0;
        if (have >= b - a + 1) return;
        try {
          const r = await fetchRetry(url, { headers: { Range: `bytes=${a + have}-${b}` } });
          await pipeline(Readable.fromWeb(r.body), createWriteStream(f, { flags: 'a' }));
        } catch { await new Promise((res) => setTimeout(res, 3000)); }
      }
      throw new Error(`part ${i} did not finish — re-run setup to resume`);
    })).finally(() => clearInterval(timer));
    await rm(out, { force: true });
    for (const f of files) { await pipeline(createReadStream(f), createWriteStream(out, { flags: 'a' })); }
    if (statSync(out).size !== size) throw new Error(`size mismatch for ${out} — re-run setup`);
    for (const f of files) await rm(f, { force: true });
  }
  log('  checking SHA-256…');
  const got = await sha256(out);
  if (got !== want) { await rm(out, { force: true }); throw new Error(`checksum mismatch for ${out} (got ${got}) — deleted, re-run setup`); }
  await writeFile(mark, want);
  log('  verified');
}

