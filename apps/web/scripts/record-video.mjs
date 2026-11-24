// Records the demo video from the running site: an intro card, the landing hero, the dashboard playing a recorded run
// with presenter captions, and an outro card. Silent 1080p MP4, about a minute. Add a voice-over or music on top.
//
//   pnpm --filter @kavach/web build && pnpm --filter @kavach/web start   # in one terminal (or any deployed URL)
//   pnpm --filter @kavach/web video                                       # in another
//
// Options: --url http://localhost:3000  --run live|sample (default: live if runs/demo_run.jsonl was bundled)
//          --speed 1.6  --out ../../runs/video/kavach-demo.mp4  --chrome /path/to/chrome
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const URL_BASE = arg('url', 'http://localhost:3000').replace(/\/$/, '');
const SPEED = arg('speed', '1.6');
const OUT = path.resolve(here, arg('out', '../../../runs/video/kavach-demo.mp4'));
const WORK = path.join(path.dirname(OUT), 'scenes');
const CHROME =
  arg('chrome') ??
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) =>
    existsSync(p),
  );
const W = 1920;
const H = 1080;
const ENC = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', '30'];

if (!CHROME) throw new Error('Chrome not found: pass --chrome <path> or set CHROME_PATH');
mkdirSync(WORK, { recursive: true });

async function runChoice() {
  const asked = arg('run');
  if (asked) return asked;
  const r = await fetch(`${URL_BASE}/dashboard/runs/demo_run.jsonl`, { method: 'HEAD' }).catch(() => null);
  return r?.ok ? 'live' : 'sample';
}

/**
 * Films the page as JPEG screenshots (quality 92) at whatever rate the machine manages, then encodes them at 30 fps
 * with each frame held for its real duration. Steadier than a screencast on busy pages.
 */
async function film(page, name, { seconds, until, tail = 0 }) {
  const dir = path.join(WORK, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const stamps = [];
  const t0 = Date.now();
  let doneAt = null;
  for (let i = 0; ; i++) {
    const file = path.join(dir, `${String(i).padStart(5, '0')}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 92 });
    stamps.push([file, Date.now()]);
    const elapsed = (Date.now() - t0) / 1000;
    if (seconds && elapsed >= seconds) break;
    if (until && doneAt === null && (await until())) doneAt = Date.now();
    if (doneAt !== null && Date.now() - doneAt >= tail * 1000) break;
  }
  const list = stamps
    .map(([f, at], i) => `file '${f}'\nduration ${(((stamps[i + 1]?.[1] ?? at + 100) - at) / 1000).toFixed(3)}`)
    .join('\n');
  writeFileSync(path.join(dir, 'frames.txt'), `${list}\nfile '${stamps.at(-1)[0]}'\n`);
  const total = (stamps.at(-1)[1] - t0) / 1000;
  const fade = `fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(total - 0.5, 0.5).toFixed(2)}:d=0.5`;
  const mp4 = path.join(WORK, `${name}.mp4`);
  const tmp = mp4.replace(/\.mp4$/, '.tmp.mp4');
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'frames.txt'),
    '-vf', `scale=${W}:${H},fps=30,${fade}`, ...ENC, '-an', tmp,
  ]);
  renameSync(tmp, mp4);
  rmSync(dir, { recursive: true, force: true });
  console.log(`scene ${name}: ${total.toFixed(1)}s from ${stamps.length} frames`);
}

const CARD_CSS = `
  body{margin:0;width:${W}px;height:${H}px;display:grid;place-items:center;background:#e6efe9 url(/print/rosette-large.svg) no-repeat right -260px top -220px/1100px;font-family:var(--font-plex),system-ui,sans-serif;color:#0e231c;overflow:hidden}
  .wrap{display:flex;flex-direction:column;align-items:center;gap:28px;text-align:center}
  .mark{display:block;margin:0 0 8px}
  h1{font-family:var(--font-plex),system-ui,sans-serif;font-weight:600;letter-spacing:-0.035em;font-size:112px;line-height:1;margin:0}
  h1 span{color:#5f7a70;font-size:.6em;margin-left:.3em}
  p{font-size:34px;margin:0;color:#3a574c;max-width:1300px;line-height:1.35}
  .small{font-size:26px;color:#5f7a70}
  .band{position:fixed;left:0;right:0;height:28px;background:url(/print/band.svg) repeat-x;background-size:auto 100%}
`;

async function card(page, html) {
  await page.goto(`${URL_BASE}/`, { waitUntil: 'load' });
  const logo = await page.$eval('.kv-logo svg', (el) => el.outerHTML);
  await page.evaluate(
    (css, body, logoSvg) => {
      document.body.className = '';
      const big = logoSvg.replace(/\swidth="[^"]*"/, ' width="168"').replace(/\sheight="[^"]*"/, ' height="168"');
      document.body.innerHTML = `<style>${css}</style>${body.replace('{{LOGO}}', `<span class="kv-logo kv-logo--attack mark" style="height:168px">${big}</span>`)}`;
    },
    CARD_CSS,
    html,
    logo,
  );
  await page.evaluate(() => document.fonts.ready);
}

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('kv-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'kv-caption';
      el.style.cssText =
        'position:fixed;left:50%;bottom:44px;transform:translateX(-50%);z-index:9999;max-width:1240px;padding:16px 28px;border-radius:16px;background:rgba(14,35,28,.92);color:#f1f6f2;font:500 28px/1.35 var(--font-plex),system-ui,sans-serif;text-align:center;box-shadow:0 20px 60px rgba(14,35,28,.35);transition:opacity .3s';
      document.body.appendChild(el);
    }
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = t;
      el.style.opacity = '1';
    }, 250);
  }, text);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--hide-scrollbars', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
try {
  const page = await browser.newPage();
  const run = await runChoice();
  console.log(`recording with the ${run} run from ${URL_BASE}`);

  // 1. Intro card
  await card(
    page,
    `<div class="band" style="top:0"></div><div class="wrap">{{LOGO}}<h1>Kavach<span lang="hi">कवच</span></h1><p>Seven AI agents attack and harden a support bot that can move money.</p></div><div class="band" style="bottom:0"></div>`,
  );
  await film(page, '1-intro', { seconds: 4 });

  // 2. Landing hero: the refund slip, paid on v1, voided on v2
  await page.goto(`${URL_BASE}/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await caption(page, 'A ₹54,999 refund on someone else’s order. Guardrail v1 pays it: a breach.');
  setTimeout(() => caption(page, 'After Kavach, the same message comes back void and is held for a human.').catch(() => {}), 5400);
  await film(page, '2-hero', { seconds: 10 });

  // 3. Dashboard: the recorded run with presenter captions (fresh tab, so nothing from the hero scene lingers)
  await page.close();
  const dash = await browser.newPage();
  await dash.goto(`${URL_BASE}/dashboard/?demo=${run}&narrate=1&speed=${SPEED}`, { waitUntil: 'load' });
  await sleep(400);
  await film(dash, '3-dashboard', {
    until: () => dash.evaluate(() => /COMPLETE/.test(document.querySelector('header')?.innerText ?? '')),
    tail: 4.5,
  });

  // 4. Outro card
  const outro = dash;
  await card(
    outro,
    `<div class="band" style="top:0"></div><div class="wrap">{{LOGO}}<h1>Kavach</h1><p>Breaches caught by code. Patches that keep customers served.</p><p class="small">github.com/harshbhx/kavach, built with Lyzr, Band, Agent37 and AdaL for Diwali Festiverse 2026</p></div><div class="band" style="bottom:0"></div>`,
  );
  await outro.evaluate(() => document.querySelector('.kv-logo')?.classList.replace('kv-logo--attack', 'kv-logo--secured'));
  await film(outro, '4-outro', { seconds: 5 });
} finally {
  await browser.close();
}

const list = path.join(WORK, 'list.txt');
writeFileSync(list, ['1-intro', '2-hero', '3-dashboard', '4-outro'].map((n) => `file '${n}.mp4'`).join('\n') + '\n');
const tmp = OUT.replace(/\.mp4$/, '.tmp.mp4');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', tmp]);
renameSync(tmp, OUT);
const secs = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', OUT]).toString().trim();
console.log(`\nwrote ${OUT} (${Math.round(Number(secs))}s)`);
