// Renders the GitHub social card and the Devpost thumbnail in the security-paper style.
// Usage (from apps/web, Chrome installed): node scripts/make-brand-cards.mjs
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'

const here = dirname(fileURLToPath(import.meta.url))
const out = resolve(here, '../../../docs/assets/brand')
const fonts = pathToFileURL(resolve(here, '../../dashboard/node_modules')).href
const print = pathToFileURL(resolve(here, '../public/print')).href
const chrome = process.env.CHROME_PATH ?? '/usr/bin/google-chrome'

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Plex;src:url(${fonts}/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2);font-weight:100 700;font-stretch:85% 100%}
@font-face{font-family:PlexDeva;src:url(${fonts}/@fontsource/ibm-plex-sans-devanagari/files/ibm-plex-sans-devanagari-devanagari-500-normal.woff2);font-weight:500}
@font-face{font-family:Mono;src:url(${fonts}/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2);font-weight:500}
*{box-sizing:border-box;margin:0}
html,body{width:var(--w);height:var(--h);overflow:hidden}
body{background:#E6EFE9;color:#0E231C;font-family:Plex,PlexDeva,sans-serif;position:relative}
.rosette{position:absolute;right:-22%;top:-38%;width:95%;opacity:.55}
.band{position:absolute;left:0;right:0;height:22px;background:url(${print}/band.svg) repeat-x;background-size:auto 100%;border-bottom:1px solid #B9CDC2}
.band.top{top:0}.band.bot{bottom:0;border-top:1px solid #B9CDC2;border-bottom:0}
.micro{position:absolute;left:0;right:0;top:22px;font:500 9px/14px Mono;letter-spacing:.06em;color:#2E7D6F;opacity:.55;white-space:nowrap;overflow:hidden}
.wrap{position:absolute;inset:0;padding:var(--pad);display:flex;flex-direction:column;justify-content:center}
.logo{display:flex;align-items:center;gap:18px}
.logo svg{width:var(--mark);height:var(--mark)}
.word{font:600 calc(var(--mark)*.62)/1 Plex,PlexDeva,sans-serif;letter-spacing:-.02em}
.deva{font:500 calc(var(--mark)*.5)/1 Plex,PlexDeva,sans-serif;color:#5F7A70;margin-left:6px;padding-left:16px;border-left:1.5px solid #B9CDC2}
h1{font:600 var(--h1)/1.02 Plex,PlexDeva,sans-serif;letter-spacing:-.035em;margin-top:var(--gap);max-width:var(--h1w)}
p{font-size:var(--p);line-height:1.4;color:#3A574C;margin-top:calc(var(--gap)*.6);max-width:var(--pw)}
.stamp{position:absolute;right:var(--sr);bottom:var(--sb);transform:rotate(-7deg);border:4px solid #0B6E7F;color:#0B6E7F;border-radius:10px;padding:10px 22px 6px;font:700 var(--st)/1 Plex,PlexDeva,sans-serif;font-stretch:85%;letter-spacing:.08em;text-align:center;mix-blend-mode:multiply;opacity:.92}
.stamp small{display:block;font:600 calc(var(--st)*.3)/1.3 Plex,PlexDeva,sans-serif;font-stretch:100%;letter-spacing:.02em;margin-top:4px}
.stamp.red{border-color:#C8203F;color:#C8203F;right:var(--pr);bottom:var(--pb);transform:rotate(5deg);opacity:.6}
.foot{position:absolute;left:80px;bottom:40px;font:500 15px/1 Plex,PlexDeva,sans-serif;color:#5F7A70;letter-spacing:.01em}
.foot b{color:#0E231C}
</style></head><body>
<img class="rosette" src="${print}/rosette-large.svg">
<div class="band top"></div><div class="micro">KAVACH RED VS BLUE FOR TOOL USING AGENTS BREACHES ARE CAUGHT BY CODE KAVACH RED VS BLUE FOR TOOL USING AGENTS BREACHES ARE CAUGHT BY CODE KAVACH RED VS BLUE FOR TOOL USING AGENTS BREACHES ARE CAUGHT BY CODE KAVACH RED VS BLUE FOR TOOL USING AGENTS</div>
<div class="wrap">
 <div class="logo"><svg viewBox="0 0 128 128"><rect x="25.5" y="22" width="18" height="84" rx="9" fill="#0B6E7F"/><polyline points="93.5,24 55.5,64 93.5,104" fill="none" stroke="#C8203F" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="word">Kavach</span><span class="deva">कवच</span></div>
 <h1>Your support bot can issue refunds. So can anyone who talks to&nbsp;it.</h1>
 <p>Seven AI agents attack and harden a tool-using bot. Code catches every breach; a patch ships only if real customers still get help.</p>
</div>
<div class="stamp red">PAID<small>₹54,999 on someone else's order</small></div>
<div class="stamp">HELD<small>guardrail v2</small></div>
<div class="foot">Built with <b>Lyzr</b>, <b>Band</b>, <b>Agent37</b> and <b>AdaL</b></div>
<div class="band bot"></div>
</body></html>
`

const jobs = [
  { file: 'kavach-devpost-thumbnail.png', w: 1200, h: 800, vars: '--w:1200px;--h:800px;--pad:72px 80px 90px;--mark:58px;--h1:74px;--h1w:860px;--gap:38px;--p:24px;--pw:600px;--st:56px;--sr:70px;--sb:58px;--pr:92px;--pb:196px' },
  { file: 'kavach-social-card.png', w: 1280, h: 640, vars: '--w:1280px;--h:640px;--pad:56px 80px 76px;--mark:50px;--h1:62px;--h1w:820px;--gap:28px;--p:22px;--pw:620px;--st:48px;--sr:70px;--sb:70px;--pr:84px;--pb:200px' },
]

const tmp = resolve(here, '../.brand-card.html')
writeFileSync(tmp, html)
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] })
for (const job of jobs) {
  const page = await browser.newPage()
  await page.setViewport({ width: job.w, height: job.h, deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle0' })
  await page.evaluate((v) => document.documentElement.setAttribute('style', v), job.vars)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(out, job.file) })
  await page.close()
  console.log('wrote', job.file)
}
await browser.close()
