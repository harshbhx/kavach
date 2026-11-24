// Bundles the recorded runs into the static build so demo mode (?demo=live|sample) works with no API.
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runs = path.resolve(here, '../../../runs');
const out = path.resolve(here, '../public/runs');
await mkdir(out, { recursive: true });
for (const f of ['sample_simulated_run.jsonl', 'demo_run.jsonl']) {
  if (existsSync(path.join(runs, f))) {
    await copyFile(path.join(runs, f), path.join(out, f));
    console.log(`bundled ${f}`);
  }
}
