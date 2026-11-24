# Kavach dashboard

The live console for one run: a round rail (Probe → Attack → Detect → Patch → Audit), the four numbers that matter, the agent room, the arena of intercepted tool calls, the security-vs-utility chart and the patch diff.

Vite + React 19 + Tailwind v4, with components from shadcn/ui, Magic UI (number ticker, border beam) and React Bits (shiny text, decrypted text). Logo and tokens come from `@kavach/brand`.

```bash
# from the repo root
pnpm install
pnpm dev:dashboard     # http://localhost:5173, proxies /api to http://localhost:8000 (KAVACH_API to change)
```

Start the API first (`cd backend && make api`). Fully offline:

```bash
BRAIN_PROVIDER=fake BAND_ENABLED=false TARGET_MODEL=fake TARGET_URL=inprocess FAKE_DELAY_S=1 make api
```

- **Start live run** runs the agents. **Replay** plays a recorded run from `runs/` (the demo run first; the sample run is offline and labelled simulated).
- `?run=<run_id>` (plus `&mode=replay`) re-attaches after a refresh.
- Toasts mark the moments that matter: the first breach of a round, a vetoed patch, a deployed guardrail, the end of the run.

Code map: `src/lib/useRun.ts` reduces the SSE stream into view state; `src/components/*-panel.tsx` are the panels. Event shapes live in `docs/API_CONTRACTS.md`.
