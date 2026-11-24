// Lifts the latest UI for the Kavach film (docs/film/BRIEF.md): drives the landing page and the dashboard into every
// state the film shows and saves, per state, the DOM, the stylesheet, measured regions and a 1920x1080 still, plus the
// run's real numbers. The film rebuilds its UI scenes from this, so they match the product exactly.
//
//   pnpm --filter @kavach/web build && pnpm --filter @kavach/web start     # in one terminal
//   pnpm --filter @kavach/web film:lift [--run live|sample] [--url http://localhost:3000]
//
// Writes runs/film/ (gitignored): manifest.json, numbers.json, <state>/{dom.html,rects.json,still.png}, <app>.css
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const URL_BASE = arg('url', 'http://localhost:3000');
const OUT = path.join(root, 'runs/film');
const CHROME =
  arg('chrome') ??
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => existsSync(p));
if (!CHROME) throw new Error('Chrome not found: pass --chrome <path> or set CHROME_PATH');

const liveFile = path.join(root, 'runs/demo_run.jsonl');
const RUN = arg('run', existsSync(liveFile) ? 'live' : 'sample');
const runFile = RUN === 'live' ? liveFile : path.join(root, 'runs/sample_simulated_run.jsonl');

/** The figures the film may show, straight from the run log. */
function numbers() {
  const events = readFileSync(runFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const of = (type) => events.filter((e) => e.type === type);
  const started = of('run.started')[0]?.data ?? {};
  const simulated = started.brain_provider === 'fake' || started.target_model === 'fake';
  const rounds = of('round.scored').map((e) => ({
    round: e.data.round,
    config: e.data.config_attacked,
    attacks: e.data.total_attacks,
    breaching: e.data.breaching,
    breach_rate: e.data.breach_rate,
    vetoes: e.data.vetoes,
    applied: e.data.applied_version,
    utility: e.data.utility_applied,
    tth_seconds: e.data.tth_seconds,
    findings: e.data.findings_by_rule,
  }));
  const audits = of('audit.result').map((e) => ({
    round: e.round,
    attempt: e.data.attempt,
    candidate: e.data.candidate_version,
    decision: e.data.decision,
    exploits_still_landing: `${e.data.replay?.still_breaching ?? 0} of ${e.data.replay?.total ?? 0}`,
    utility: e.data.utility?.score,
    served: `${e.data.utility?.passed} of ${e.data.utility?.total}`,
    refused: (e.data.utility?.failed ?? []).map((f) => ({ id: f.id, message: f.message, why: f.why })),
  }));
  const done = of('run.completed')[0]?.data ?? {};
  return {
    run: RUN,
    run_id: events[0]?.run_id,
    label: simulated ? 'Simulated run, scripted agents' : `Recorded live run, target ${started.target_model}`,
    simulated,
    target_model: started.target_model,
    brain_provider: started.brain_provider,
    target_url: started.target_url,
    rounds,
    breach_story: rounds.map((r) => `${Math.round(r.breach_rate * 100)}%`).join(' → '),
    audits,
    final_breach_rate: done.final_breach_rate,
    final_utility: done.final_utility,
    total_exploits: done.total_exploits,
    owasp: done.owasp_breakdown,
    deployed_version: done.deployed_version,
    tth_seconds: rounds.find((r) => r.tth_seconds)?.tth_seconds ?? null,
  };
}

/** Bounding boxes of the regions the camera frames, found by data-film / data-panel hooks in the components. */
const REGIONS = {
  dashboard: {
    header: '[data-film=header]',
    rounds: '[data-film=rounds]',
    counters: '[data-film=counters]',
    room: '[data-panel="The Kavach room"]',
    calls: '[data-panel="Intercepted tool calls"]',
    chart: '[data-panel="Breach and utility"]',
    patches: '[data-panel="Patch amendments"]',
    drawer: '[data-film=drawer]',
  },
  landing: { hero: 'h1', slip: '[data-film=slip]', utility: '#utility', agents: '#signatories', rules: '#features' },
};

async function measure(page, app) {
  return page.evaluate((regions) => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return Object.fromEntries(
      Object.entries(regions).map(([k, q]) => [k, box(document.querySelector(q))]),
    );
  }, REGIONS[app]);
}

async function save(page, app, state) {
  const dir = path.join(OUT, state);
  mkdirSync(dir, { recursive: true });
  const dom = await page.evaluate(() => {
    const copy = document.body.cloneNode(true);
    copy.querySelectorAll('script,noscript,iframe').forEach((n) => n.remove());
    return copy.outerHTML;
  });
  writeFileSync(path.join(dir, 'dom.html'), dom);
  writeFileSync(path.join(dir, 'rects.json'), JSON.stringify(await measure(page, app), null, 2));
  await page.screenshot({ path: path.join(dir, 'still.png') });
  const css = path.join(OUT, `${app}.css`);
  if (!existsSync(css)) {
    const text = await page.evaluate(() =>
      [...document.styleSheets]
        .flatMap((s) => {
          try {
            return [...s.cssRules].map((r) => r.cssText);
          } catch {
            return [];
          }
        })
        .join('\n'),
    );
    writeFileSync(css, text);
  }
  console.log(`lifted ${state}`);
  return { state, app, dir: path.relative(root, dir) };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hasText = (page, text, timeout = 120000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout, polling: 250 }, text);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
const states = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  for (const [state, slip] of [
    ['landing-slip-paid', 'v1'],
    ['landing-slip-held', 'v2'],
  ]) {
    await page.goto(`${URL_BASE}/?slip=${slip}`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await wait(1200);
    states.push(await save(page, 'landing', state));
  }
  for (const id of ['utility', 'signatories']) {
    await page.evaluate((i) => document.getElementById(i)?.scrollIntoView({ block: 'start' }), id);
    await page.evaluate(() => window.scrollBy(0, -90));
    await wait(900);
    states.push(await save(page, 'landing', `landing-${id}`));
  }

  const demo = RUN === 'live' ? 'live' : 'sample';
  await page.goto(`${URL_BASE}/dashboard/?demo=${demo}&speed=2`, { waitUntil: 'load' });
  await hasText(page, 'BREACH');
  await wait(800);
  states.push(await save(page, 'dashboard', 'dash-first-breach'));
  await hasText(page, 'VETOED');
  await wait(800);
  states.push(await save(page, 'dashboard', 'dash-veto'));
  await page.waitForFunction(() => /COMPLETE/.test(document.querySelector('header')?.innerText ?? ''), { timeout: 180000, polling: 500 });
  await wait(6000);
  states.push(await save(page, 'dashboard', 'dash-complete'));
  await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].find((x) => x.textContent?.startsWith('Breaches'))?.click());
  await wait(900);
  states.push(await save(page, 'dashboard', 'dash-breaches'));
  await page.evaluate(() => document.querySelector('ul button')?.click());
  await wait(1000);
  states.push(await save(page, 'dashboard', 'dash-drawer'));
} finally {
  await browser.close();
}

const assets = {
  avatars: ['recon', 'injection', 'social', 'referee', 'monitor', 'patcher', 'auditor'].map((a) => `apps/web/public/agents/${a}.png`),
  print: ['rosette-large', 'rosette-seal', 'band', 'band-rose', 'lattice'].map((p) => `apps/web/public/print/${p}.svg`),
  logo: 'packages/brand/src/KavachLogo.tsx',
  fonts: [
    'apps/dashboard/node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2',
    'apps/dashboard/node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2',
    'apps/dashboard/node_modules/@fontsource/ibm-plex-sans-devanagari/files/ibm-plex-sans-devanagari-devanagari-500-normal.woff2',
  ],
};
writeFileSync(path.join(OUT, 'numbers.json'), JSON.stringify(numbers(), null, 2));
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ lifted_at: new Date().toISOString(), url: URL_BASE, run: RUN, states, assets }, null, 2));
console.log(`\nwrote ${path.relative(root, OUT)}: ${states.length} states, numbers from ${path.relative(root, runFile)}`);
