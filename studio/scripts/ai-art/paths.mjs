// Where the local AI tools live on this PC — never hard-coded in the repo. Resolution order:
//   1. env STUDIO_COMFY_ROOT
//   2. studio/scripts/ai-art/config.local.json { "comfyRoot": "…" } (per PC, gitignored; setup.mjs writes it)
//   3. <home>/studio-tools/ComfyUI_windows_portable (where setup.mjs installs by default)
// Shared settings (model file, depth model, port) stay in config.json.
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_TOOLS = join(homedir(), 'studio-tools');

export function aiConfig() {
  const cfg = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
  const localFile = join(HERE, 'config.local.json');
  const local = existsSync(localFile) ? JSON.parse(readFileSync(localFile, 'utf8')) : {};
  const comfyRoot = process.env.STUDIO_COMFY_ROOT ?? local.comfyRoot ?? join(DEFAULT_TOOLS, 'ComfyUI_windows_portable');
  return { ...cfg, ...local, comfyRoot, python: join(comfyRoot, 'python_embeded', 'python.exe'), checkpoint: join(comfyRoot, 'ComfyUI', 'models', 'checkpoints', cfg.model) };
}
