# Kavach dashboard

React 19 + Vite + Tailwind v4 + Recharts. Shows one run as it happens: the agent room, the security-vs-utility
chart (with vetoed patches), every intercepted tool call, the patch diff and the per-round scoreboard.

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api to http://localhost:8000
```

Start the API first (from `backend/`): `make api`. For a fully offline demo:

```bash
BRAIN_PROVIDER=fake BAND_ENABLED=false TARGET_MODEL=fake TARGET_URL=inprocess FAKE_DELAY_S=1 make api
```

- **Start live run** runs the 7 agents against the target. **Replay** plays a recorded run from `runs/`
  (`demo_run.jsonl` first; `sample_simulated_run.jsonl` is an offline fake-brain run, labelled as such).
- `?run=<run_id>` (add `&mode=replay` for replays) re-attaches to a run, so a refresh never loses the screen.
- The logo follows the run: attack while red is working, breach on a detected exploit, secured when a patch is
  approved. Tokens and the logo come from `src/brand/` (copied from `docs/assets/brand/frontend/`).

Layout: `src/lib/useRun.ts` turns the SSE event stream into view state; `src/components/*` are the panels.
Event shapes: `docs/API_CONTRACTS.md`.
