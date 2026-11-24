// Copies the repo's docs/*.md (the source of truth) into content/docs for Fumadocs.
// Runs before `dev` and `build`. Generated files are gitignored; edit docs/*.md, not these.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const out = path.resolve(here, '../content/docs');
const GH = 'https://github.com/harshbhx/kavach/blob/main';

// source file → [slug, sidebar title, description]
const PAGES = [
  ['ARCHITECTURE.md', 'architecture', 'Architecture', 'Components, the round loop, events and configuration.'],
  ['TARGET_BOT.md', 'target-bot', 'Target bot', 'DiwaliMart Support: the persona, the four tools, the mock data and the guard policy.'],
  ['SCORING.md', 'scoring', 'Scoring', 'The five breach detectors, the benign suite, the metrics and when a patch is accepted.'],
  ['AGENT_ROSTER.md', 'agents', 'The seven agents', 'What each agent receives, what it returns and how it falls back.'],
  ['API_CONTRACTS.md', 'api', 'API and events', 'REST endpoints, the SSE event stream and the Band message contract.'],
  ['SPONSORS.md', 'sponsors', 'Sponsor integrations', 'How Kavach uses Lyzr, Band, Agent37 and AdaL, with setup steps.'],
  ['bring-your-prompt.md', 'bring-your-prompt', 'Bring your own prompt', 'Paste your system prompt, set your rules, and get it attacked, patched and reported inside the DiwaliMart sandbox.'],
  ['PRD.md', 'product', 'Product spec', 'The problem, the users, the scope and what success looks like.'],
];
const slugOf = Object.fromEntries(PAGES.map(([f, s]) => [f, s]));

function rewriteLinks(md) {
  return md.replace(/\]\(([^)\s]+)\)/g, (m, href) => {
    if (/^(https?:|mailto:|#)/.test(href)) return m;
    const [file, hash = ''] = href.split('#');
    const base = path.basename(file);
    if (slugOf[base]) return `](/docs/${slugOf[base]}${hash ? `#${hash}` : ''})`;
    if (base === 'README.md' && !file.includes('/')) return '](/docs)';
    const rel = path.normalize(path.join('docs', file)).replace(/\\/g, '/');
    return `](${GH}/${rel}${hash ? `#${hash}` : ''})`;
  });
}

function toMermaidMdx(md) {
  return md.replace(/```mermaid\n([\s\S]*?)```/g, (_, chart) => `<Mermaid chart={${JSON.stringify(chart.trim())}} />\n`);
}

await mkdir(out, { recursive: true });
for (const [file, slug, title, description] of PAGES) {
  // Windows checkouts can have CRLF endings; normalise so the title strip and the mermaid conversion match everywhere.
  let md = (await readFile(path.join(repo, 'docs', file), 'utf8')).replace(/\r\n?/g, '\n');
  md = md.replace(/^# .*\n+/, ''); // the title comes from frontmatter
  md = rewriteLinks(md);
  const hasMermaid = md.includes('```mermaid');
  if (hasMermaid) md = toMermaidMdx(md);
  const front = `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n\n`;
  const note = `{/* Generated from docs/${file} by scripts/sync-docs.mjs. Edit the source file instead. */}\n\n`;
  await writeFile(path.join(out, `${slug}.${hasMermaid ? 'mdx' : 'md'}`), front + (hasMermaid ? note : '') + md);
}
console.log(`synced ${PAGES.length} docs pages`);
