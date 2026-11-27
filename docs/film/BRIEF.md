# "Start motion": the brief

This is what Claude follows when Harsh says **"start motion"**. Everything a decision needs is settled here, so the film can be made in one pass with no questions.

## The ask, in one line

A 1:55 product film for the Kavach hackathon submission, in Kavach's own security-paper brand, told as `SCRIPT.md` tells it, built as a **Motion** film (code-based animation, Export saves the MP4), showing the **real, latest UI** lifted from the running site and dashboard.

## Settled choices (no form needed)

- **Style:** security printing. Guilloche bands and rosettes that draw themselves on, ruled ledger paper, slips that file in, rubber stamps that land with ink bleed, numbering-machine counters. Camera moves are eased glides and dives, never cuts between flat slides.
- **Colours (the site's tokens):** ground paper `#E6EFE9` (lighter paper `#F1F6F2`), ink `#0E231C`, secondary ink `#3A574C`, faint ink `#5F7A70`, rules `#B9CDC2`, guilloche `#2E7D6F`, stamp rose `#C8203F`, hold teal `#0B6E7F`, thread ochre `#B07D1A`, secure green `#1F7A4D`. No purple anywhere.
- **Type:** IBM Plex Sans (headings 600 at −0.03 em, text 400–500), IBM Plex Mono (tool calls, serials, counters), IBM Plex Sans Devanagari (कवच). The font files are the woff2s in `apps/dashboard/node_modules/@fontsource*/ibm-plex-*` and become film font assets.
- **Length:** 115 seconds (Motion allows up to 300).
- **Voice:** Motion adds none. The words are on screen; `VOICEOVER.md` is laid over the export afterwards.
- **Score:** an original wordless score and effects as `SCRIPT.md` describes.

## Material, and where it comes from

1. **Run `pnpm --filter @kavach/web film:lift`** with the site running (`pnpm --filter @kavach/web build && pnpm --filter @kavach/web start`). It drives the landing page and the dashboard into every state the film shows and writes, per state, the element tree, the stylesheet, measured sizes of key elements, and a 1920×1080 still, plus `numbers.json` (the run's real figures) and `manifest.json`, to `runs/film/`. Rebuild the film's UI scenes from that markup and CSS (recreate-ui route A): the product keeps its own look inside the frame; the film's motion lives around it.
2. **Assets:** agent avatars `apps/web/public/agents/*.png`; the mark and wordmark from `packages/brand` (`KavachLogo`); print art `apps/web/public/print/{rosette-large,rosette-seal,band,band-rose,lattice}.svg`; the font files above.
3. **Numbers:** only from `runs/film/numbers.json`. A simulated run is labelled "Simulated run, scripted agents" on screen; a live run "Recorded live run" with its target model. Never show a sponsor claim that isn't true at the time (Agent37 only if the target ran there; AdaL only if Harsh used it).

## Rules for the build

- Follow the Motion type's own pages (rough cut first, then finalize, motion, film-api, recreate-ui, sound) for structure and craft.
- One idea per scene; nothing on screen that the script doesn't need. Every word the viewer must read is at least 26 px after zoom.
- The camera never rests on a whole window longer than about 1.2 s; each dashboard beat zooms 1.6–2.4× onto its region with the spotlight on.
- Stamps land on the beat, rotate −4° to −7°, and bleed ink over 0.2 s. Nothing flashes more than three times a second; no scene under a second.
- Cuts land on bar lines of the 104 BPM score where the script allows; scene changes are motion (a slip becoming a column, a rosette becoming the mark, a ring becoming the dashboard), not hard cuts.
- The cursor, where it appears, travels on arcs, settles 200–300 ms, then clicks.
- Closing card: the mark, the repo URL, the live site URL, "Built by Harsh Bhanushali".

## After the film

1. Export the MP4 from the film's page (the download arrow).
2. Lay the voiceover (`VOICEOVER.md`) and score over it, or upload the export unvoiced (the words are all on screen).
3. Upload to YouTube with `YOUTUBE.md`, and put the link in Devpost.
