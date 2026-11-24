# Kavach — Brand Kit

**Kavach** (कवच) means "armour" in Hindi.
**Tagline:** AI agents that attack and harden your support bot, before customers do.

## The logo: "Guardrail K"

The mark is the letter **K** drawn as `|<`:
- the **bar** `|` is the **guardrail** (cyan, defence)
- the **chevron** `<` is an **attack** striking it (rose, red agents)

At rest the two pieces form a K. In motion the attack hits the rail, the rail flashes, and the K holds. That one loop is the whole product. The logo has three parts (rail, chevron, impact ring), so it's easy to animate in CSS, SVG or video.

## Files

| File | Use |
|---|---|
| `kavach-mark.svg`, `kavach-mark-512.png` | The K mark on a transparent background |
| `kavach-mark-animated.svg` | Self-animating mark (CSS inside the SVG; plays in `<img>`, GitHub and browsers; respects reduced motion) |
| `kavach-logo-dark.svg` / `.png` | Mark + wordmark for **dark** backgrounds |
| `kavach-logo-dark-animated.svg` | The same, animated: dashboard splash, README dark mode |
| `kavach-logo-light.svg` / `.png` | Mark + wordmark for **light** backgrounds |
| `kavach-app-icon.svg`, `-512.png`, `-1024.png` | Mark on a dark rounded tile: GitHub/Devpost/Band avatar, app icon |
| `kavach-favicon.svg`, `-64.png`, `-180.png` | Favicon and apple-touch icon |
| `kavach-logo-intro.mp4` / `.gif` | 3-second logo animation (strike → wordmark): **opening shot of the demo video** |
| `kavach-social-card.png` (1280×640) | GitHub social preview and the video title card |
| `kavach-devpost-thumbnail.png` (1200×800, 3:2) | Devpost thumbnail |
| `agents/*.png` (256×256) | Avatars for the 7 agents (Band, Lyzr, dashboard feed) |
| `frontend/` | `KavachLogo.tsx`, `kavach-logo.css`, `brand-tokens.css`, `tailwind-theme.css` (v4), `tailwind.brand.cjs` (v3) |

The wordmarks in the logo SVGs are converted to outlines, so they don't need fonts. The two cards use live text (Inter), so **use the PNGs** for those.

## Colours (dark UI first)

| Token | Hex | Use |
|---|---|---|
| `--kv-bg` | `#0A0A16` | Page background (near-black indigo) |
| `--kv-surface` | `#12121F` | Panels |
| `--kv-surface-2` | `#1A1A2B` | Cards, inputs, chips |
| `--kv-border` | `#26263A` | Hairlines |
| `--kv-text` / `--kv-muted` / `--kv-faint` | `#F5F5FA` / `#A1A1B5` / `#6B6B80` | Text hierarchy |
| `--kv-attack` | `#FF4D6D` | Red agents, breaches, breach line |
| `--kv-defend` | `#22D3EE` | Blue agents, guardrails, BLOCKED cards |
| `--kv-secure` | `#34D399` | APPROVED, utility line, secured state |
| `--kv-verdict` | `#FFB020` | Referee, scores, VETOED outline, impact ring |
| `--kv-brand` | `#7C5CFF` (hover `#9A82FF`) | Primary buttons, links, focus ring |

Each semantic colour has a `-soft` tint (12–16% alpha) for card backgrounds: breach card = `attack-soft` background + `attack` border; blocked = `defend-soft` + `defend`; approved = `secure-soft` + `secure`; vetoed = `verdict-soft` background + `attack` text.

Rule of thumb: **violet is the only brand/CTA colour.** Rose, cyan, mint and gold carry meaning only (attack, defence, secured, verdict). Don't use them decoratively.

## Type
- **Inter Display Bold**, tracking −2%: wordmark and big numbers (Breach %, Utility %)
- **Inter** 400/500/600: UI text
- **JetBrains Mono**: tool calls, payloads, prompt diffs

## Logo states (dashboard header)

Use `<KavachLogo state={...} wordmark size={36} />` and drive it from the event stream:

| Event | State | Look |
|---|---|---|
| no run / between rounds | `idle` | Rail breathes softly |
| `attack.launched` (attacks in flight) | `attack` | Chevron strikes the rail on a loop |
| `breach.detected` (hold 1.5 s) | `breach` | Chevron punches through, rail turns rose, mark shakes |
| `patch.applied` (hold 2 s), `run.completed` | `secured` | Rail turns mint, gold ring pulses once |

Motion: strike loop 2.8 s, easing `cubic-bezier(.3,.7,.2,1)`; UI transitions 240 ms `cubic-bezier(.2,.8,.2,1)`. Everything is off under `prefers-reduced-motion`.

## Agent avatars

| Agent | Squad colour | Icon | File |
|---|---|---|---|
| Recon | Rose | Radar | `agents/recon.png` |
| Injector | Rose | `</>` | `agents/injection.png` |
| Social Engineer | Rose | Chat bubble | `agents/social.png` |
| Monitor | Cyan | Eye | `agents/monitor.png` |
| Patcher | Cyan | Patch | `agents/patcher.png` |
| Auditor | Cyan | Check | `agents/auditor.png` |
| Referee | Gold | Scales | `agents/referee.png` |

## Usage rules
- Keep clear space around the mark of at least half its width.
- Minimum size: 16 px for the mark; for the lockup, the mark must be at least 24 px tall.
- Never swap the colours (the rail is always cyan and the attack always rose), rotate the mark, or add gradients to it.

## Regenerating
`python3 scripts/build_brand.py docs/assets/brand` rebuilds every SVG/PNG plus the intro clip. It needs `uharfbuzz`, `fonttools`, `rsvg-convert`, `ffmpeg` and the Inter fonts.
