# The Kavach film kit

Everything for the submission film is ready except the animation itself. When Harsh says **"start motion"**, Claude lifts the latest UI, builds the film as a Motion film from `BRIEF.md`, and hands back a link with Export (MP4).

| File | What it is |
|---|---|
| [`SCRIPT.md`](./SCRIPT.md) | The 1:55 film, scene by scene: picture, motion, words on screen, voice, sound |
| [`VOICEOVER.md`](./VOICEOVER.md) | The read on its own: casting, pronunciation, timings, ElevenLabs settings, mixing |
| [`BRIEF.md`](./BRIEF.md) | The settled choices and build rules Claude follows for "start motion" |
| [`YOUTUBE.md`](./YOUTUBE.md) | Title, description with chapters, tags, thumbnail, visibility |
| [`frames/`](./frames) | Stills of the current UI in every state the film shows, plus a contact sheet |

## What "start motion" does

1. **Lift the latest UI** with the site running:
   ```bash
   pnpm --filter @kavach/web build && pnpm --filter @kavach/web start   # terminal 1
   pnpm --filter @kavach/web film:lift                                  # terminal 2
   ```
   This writes `runs/film/`: the DOM, stylesheet, measured regions and a still for nine states (refund slip paid and held, the utility audit forms, the agents, and the dashboard at its first breach, the veto, complete, filtered to breaches, and with the detail drawer open), plus `numbers.json` from the recorded run. It uses `runs/demo_run.jsonl` once `pnpm demo` has saved one, otherwise the offline sample, and labels the film to match.
2. **Build the film** as a Motion film, scene by scene from `SCRIPT.md`, the UI scenes rebuilt from the lifted markup so they match the product exactly.
3. **Export** from the film's page, lay the voiceover over it if wanted, upload with `YOUTUBE.md`.

## Before saying "start motion"

- Run `pnpm demo` first if you can, so the film shows the live run and not the simulated sample.
- Decide the sponsor tiles: Agent37 only if the target ran there; AdaL only if you used it.
- For a voiced film, connect ElevenLabs in Claude's connectors (or record `VOICEOVER.md` yourself).
