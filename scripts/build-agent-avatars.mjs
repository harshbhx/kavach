// Renders the seven agent characters (packages/brand/src/AgentAvatar.tsx) to static icons, so the website, the dashboard,
// Band, Lyzr, Devpost and the PDF report all show the same art. One source of truth: edit the component, then run
//
//     pnpm brand:avatars
//
// Output: docs/assets/brand/agents/<id>.svg + <id>.png (256px, on a paper tile), copied to apps/*/public/agents/<id>.png.
// Needs Google Chrome (headless screenshot for the PNGs). No new dependencies: it uses the esbuild that Vite already installs.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/assets/brand/agents');
const COPIES = [join(ROOT, 'apps/dashboard/public/agents'), join(ROOT, 'apps/web/public/agents')];
const SIZE = 256;
const TILE = '#f1f6f2'; // --paper-2

function findEsbuild() {
  const pnpm = join(ROOT, 'node_modules/.pnpm');
  const dir = readdirSync(pnpm).find((d) => d.startsWith('esbuild@'));
  if (!dir) throw new Error('esbuild not found: run pnpm install first');
  return createRequire(join(pnpm, dir, 'node_modules/esbuild/package.json'))('esbuild');
}

function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const hit = candidates.find((c) => existsSync(c));
  if (!hit) throw new Error('Google Chrome not found (set CHROME=path)');
  return hit;
}

// 1. Render the component to markup in a throwaway bundle (so we never duplicate the art)
const tmp = mkdtempSync(join(tmpdir(), 'kavach-avatars-'));
const bundle = join(tmp, 'render.cjs');
const esbuild = findEsbuild();
await esbuild.build({
  stdin: {
    resolveDir: join(ROOT, 'apps/dashboard'),
    contents: `
      import { renderToStaticMarkup } from 'react-dom/server';
      import { createElement } from 'react';
      import { AgentAvatar, AGENT_IDS } from ${JSON.stringify(join(ROOT, 'packages/brand/src/AgentAvatar.tsx').replaceAll('\\', '/'))};
      const out = {};
      for (const id of AGENT_IDS) out[id] = renderToStaticMarkup(createElement(AgentAvatar, { agent: id, size: ${SIZE}, animate: false, follow: false }));
      process.stdout.write(JSON.stringify(out));
    `,
    loader: 'tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  outfile: bundle,
  logLevel: 'error',
});
const markup = JSON.parse(execFileSync(process.execPath, [bundle], { encoding: 'utf8' }));

// 2. Put each one on a rounded paper tile, as a standalone SVG (xmlns, no classes: nothing animates in a static icon)
const svgFor = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${SIZE}" height="${SIZE}">` +
  `<rect width="100" height="100" rx="22" fill="${TILE}"/>` +
  `<g transform="translate(6 7) scale(.88)">${inner}</g></svg>`;

mkdirSync(OUT, { recursive: true });
const chrome = findChrome();
for (const [id, svgText] of Object.entries(markup)) {
  const inner = svgText.slice(svgText.indexOf('>') + 1, svgText.lastIndexOf('</svg>')).replace(/ class="[^"]*"/g, '');
  const svgPath = join(OUT, `${id}.svg`);
  writeFileSync(svgPath, svgFor(inner), 'utf8');

  // 3. PNG through headless Chrome, framed by a page so the window size does not matter
  const page = join(tmp, `${id}.html`);
  writeFileSync(page, `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:transparent}img{display:block;width:${SIZE}px;height:${SIZE}px}</style><img src="${pathToFileURL(svgPath).href}">`);
  const png = join(OUT, `${id}.png`);
  const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--window-size=${SIZE},${SIZE}`, `--screenshot=${png}`, pathToFileURL(page).href], { encoding: 'utf8' });
  if (r.status !== 0 || !existsSync(png)) throw new Error(`Chrome failed for ${id}: ${r.stderr}`);
  const w = readFileSync(png).readUInt32BE(16);
  if (w !== SIZE) console.warn(`  note: ${id}.png is ${w}px wide (Chrome clamped the window); run with a newer Chrome or resize`);
  for (const dir of COPIES) {
    mkdirSync(dir, { recursive: true });
    copyFileSync(png, join(dir, `${id}.png`));
  }
  console.log(`  ${id}.svg + ${id}.png`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Wrote ${Object.keys(markup).length} agent icons to docs/assets/brand/agents and apps/*/public/agents`);
