// Bundles the recorded runs into the static build so demo mode (?demo=live|sample) works with no API.
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const runs = path.resolve(here, '../../../runs');
const out = path.resolve(here, '../public/runs');
await mkdir(out, { recursive: true });
for (const f of ['sample_simulated_run.jsonl', 'sample_approval_run.jsonl', 'demo_run.jsonl']) {
  if (existsSync(path.join(runs, f))) {
    await copyFile(path.join(runs, f), path.join(out, f));
    console.log(`bundled ${f}`);
  }
}
// The gallery: runs/gallery.json lists the recordings (runs/gallery/*.jsonl) that the Demo picker offers.
const manifest = path.join(runs, 'gallery.json');
if (existsSync(manifest)) {
  await copyFile(manifest, path.join(out, 'gallery.json'));
  for (const e of JSON.parse(await readFile(manifest, 'utf8'))) {
    const src = path.join(runs, e.file);
    if (!existsSync(src)) continue;
    await mkdir(path.dirname(path.join(out, e.file)), { recursive: true });
    await copyFile(src, path.join(out, e.file));
  }
  console.log('bundled the gallery');
}
