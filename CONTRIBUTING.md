# Contributing

Thanks for looking. Kavach is small on purpose: one run at a time, in-memory state, JSONL logs.

## Get running

```bash
pnpm install                 # web apps (Node 20+, pnpm 10)
cd backend && uv sync        # Python 3.11+ with uv
cd .. && pnpm dev:offline    # API, dashboard and site with scripted agents, no keys
```

`pnpm bootstrap` walks you through keys for a real run (Lyzr, Band, a model). See the [getting started guide](apps/web/content/docs/index.mdx).

## Where things live

`AGENTS.md` has the full map and the rules. The short version: specs in `docs/` are the source of truth, the backend is in `backend/kavach/`, the dashboard in `apps/dashboard/`, the site and docs in `apps/web/`, shared brand in `packages/brand/`.

## Before you open a PR

- `cd backend && make check && make smoke`
- `pnpm lint && pnpm build`
- If you change an event, endpoint or schema, update `docs/API_CONTRACTS.md` in the same PR.
- Breaches are decided by code in `backend/kavach/scoring/`. Never let a model grade itself.

Commits: one logical change each, conventional messages (`feat(scoring): …`, `fix(dashboard): …`, `docs: …`).
