# AGENTS.md — instructions for AI coding agents (AdaL, Claude Code, Codex, Cursor)

You're helping build **Kavach** for a hackathon with a hard deadline: **24 Nov 2026, 10:00 PM IST (submit by 9:30 PM)**. Speed matters, but the demo must work. Follow this file on every turn.

## What we're building (30-second version)
Seven AI agents (Recon, Injector, Social Engineer / Monitor, Patcher, Auditor / Referee) attack and harden **DiwaliMart Support**, a tool-using support agent with 4 mock tools (refunds, orders, KYC, coupons) and fake data. Breaches are detected **by code** from the tool-call log. Patches = system prompt + policy-as-code guardrails. A patch is accepted only if the exploits fail **and** benign utility stays ≥ 90%. Agents talk in a **Band** room; their brains run on **Lyzr**; the target runs in an **Agent37** sandbox; a React dashboard streams it all over SSE.

## Read before coding (in this order)
1. `docs/PRD.md`: scope, must/should/could, key decisions
2. `docs/ARCHITECTURE.md`: components, round sequence, directory layout, env
3. `docs/TARGET_BOT.md`: target tools, mock data, guard policy schema, target API
4. `docs/SCORING.md`: detectors, benign suite, metrics, patch acceptance
5. `docs/AGENT_ROSTER.md`: the 7 agents' I/O JSON contracts + brain interface
6. `docs/API_CONTRACTS.md`: Kavach API, SSE events, Band messages
7. `docs/SPONSORS.md`: Lyzr / Band / Agent37 / AdaL / Finch specifics
8. `docs/BUILD_PLAN.md`: **the ticket list. Work tickets in order and tick them off.**

## Golden rules
1. **Numbers come from code.** Breach detection, utility scoring, patch accept/veto and round metrics are deterministic Python in `backend/kavach/scoring/` and `orchestrator/audit.py`. LLM agents never decide them.
2. **Fake data only.** Never add real names, PANs, phone numbers or payment details. The target's tools are pure functions over `data/mock_db.json`: no network, no file writes, no subprocesses.
3. **Attacks only hit our own target.** Never point attack code at any third-party system or URL.
4. **Every LLM output is validated** with pydantic. 1 repair retry, then the documented fallback. Never crash a run because of one bad agent reply.
5. **Band never blocks the run.** Band errors → `band.error` event + log, then continue. Every Band message must @mention ≥ 1 participant, and the handle must appear in `content`.
6. **Feature flags must keep working:** `BRAIN_PROVIDER=fake BAND_ENABLED=false TARGET_MODEL=fake make smoke` runs 3 rounds offline. Keep it green.
7. **Contracts are the docs.** If you need to change a schema, event or endpoint, update the matching doc in the same change.
8. **No secrets in git.** `.env`, `agent_config.yaml` and `runs/*.jsonl` (except `runs/demo_run.jsonl` and `runs/sample_simulated_run.jsonl`) are gitignored. Never print keys in logs.
9. **Keep it simple.** No databases, auth, queues or extra services. One run at a time. In-memory state + JSONL.
10. **Hackathon rule:** project code is written during the event. Libraries and APIs are fine; don't paste in old project code.

## Repo layout
```
kavach/               # pnpm + Turborepo workspace (apps/*, packages/*) plus the Python backend
  AGENTS.md  CLAUDE.md  README.md  .env.example  agent_config.example.yaml  .gitignore
  package.json  pnpm-workspace.yaml  turbo.json
  docs/               # specs (source of truth)
  prompts/target/     # DiwaliMart v1 system prompt
  prompts/agents/     # 7 Kavach agent prompts (also pasted into Lyzr Studio)
  data/               # mock_db.json, guard_policy_v1.json, benign_suite.json, attack_library.json
  skills/             # Finch-ready skill packs (stretch)
  docs/assets/brand/  # logo, favicon, thumbnails, agent avatars (see BRAND.md); use these in the dashboard
  scripts/            # probe_v1.py, band_setup.py, deploy_target_agent37.sh, build_brand.py
  docs/assets/gallery # Devpost gallery screenshots (3:2)
  docs/film/          # the submission film: script, voiceover, brief, YouTube copy, UI stills
  runs/               # JSONL run logs (demo_run.jsonl = real live run; sample_simulated_run.jsonl = offline fake run)
  backend/
    pyproject.toml  Makefile
    kavach/
      config.py models.py runtime.py cli.py target_client.py
      devserver.py  record_demo.py   # `pnpm dev` backend (API + local target); `pnpm demo` recorder
      setup/       __main__.py provision.py envfile.py   # `pnpm bootstrap` wizard (creates Lyzr + Band agents)
      target/      service.py llm.py runner.py tools.py guards.py db.py fake_model.py
      brains/      base.py lyzr.py direct.py fake.py
      agents/      red.py (recon, injector, social) blue.py (monitor, patcher, auditor) referee.py
      scoring/     detectors.py benign.py metrics.py
      orchestrator/ run.py audit.py events.py replay.py
      band/        client.py room.py
      api/         app.py
      report/      markdown.py
    tests/         (pytest, all offline: conftest.py test_target.py test_scoring.py test_run.py)
  apps/dashboard/   (Vite + React 19 + TS + Tailwind v4 + shadcn/ui + Magic UI + React Bits + Recharts)
    src/lib/        api.ts types.ts useRun.ts (SSE → view state) demo.ts (in-browser replay) slips.ts format.ts useStickyScroll.ts
    src/components/ top-bar round-rail kpi-strip room-panel arena-panel slip-sheet trend-panel patch-panel narration
                    panel (Panel/Empty/Stamp) jump-pill error-boundary; ui/ (shadcn, Magic UI, React Bits, Aceternity)
  apps/web/         (Next.js 16 + Fumadocs: landing page at /, docs at /docs, dashboard demo at /dashboard)
    app/(home)/     landing page; components/landing/ refund slip, passbook, breach rules, audit forms, signatories
    scripts/sync-docs.mjs        copies docs/*.md into content/docs before dev/build (edit docs/, not content/)
    scripts/record-video.mjs     films the site + a run into runs/video/kavach-demo.mp4
    scripts/make-brand-cards.mjs renders the social card and Devpost thumbnail
    scripts/film-lift.mjs        lifts the latest UI states + run numbers into runs/film/ for the film (docs/film/)
    wrangler.jsonc               Cloudflare Workers static assets (STATIC_EXPORT=1 build → out/)
  packages/brand/   (@kavach/brand: KavachLogo + tokens.css + theme.css + fonts.css, shared by both apps)
  .github/workflows ci.yml (lint, tests, offline run, builds) · deploy-site.yml (Cloudflare)
```

## Commands
```bash
# backend (Python 3.11+, uv)
cd backend && uv sync
make target        # uv run uvicorn kavach.target.service:app --port 8001 --reload
make api           # uv run uvicorn kavach.api.app:app --port 8000 --reload
make test          # uv run pytest -q
make lint          # uv run ruff check . && uv run ruff format --check .
make check         # lint + test
make smoke         # offline 3-round run: BRAIN_PROVIDER=fake BAND_ENABLED=false TARGET_MODEL=fake
uv run python ../scripts/probe_v1.py     # Phase 1 exit check (v1 breach rate >= 50%)
uv run python ../scripts/band_setup.py   # verify the 7 Band identities + test room

# whole repo (Node 22+, pnpm 10), from the root
pnpm install
pnpm bootstrap       # setup wizard: keys → 7 Lyzr agents + 7 Band agents → .env + agent_config.yaml
pnpm dev             # backend (API + local target) + dashboard :5173 + site :3000
pnpm dev:offline     # the same with scripted agents, no keys
pnpm dev:dashboard   # dashboard only, proxies /api to :8000 (KAVACH_API to change)
pnpm dev:web         # site only: landing page, /docs, /dashboard?demo=sample
pnpm demo            # record a demo-worthy live run, fill the README results
pnpm build           # turbo builds every app
pnpm lint            # ruff + oxlint + tsc in each package
pnpm deploy:site     # static export + wrangler deploy (needs `npx wrangler login` or CLOUDFLARE_API_TOKEN)
pnpm --filter @kavach/web video   # demo video from a running site (Chrome + ffmpeg)
# add UI components with the shadcn CLI from an app folder, e.g.
#   pnpm dlx shadcn@latest add @magicui/number-ticker @react-bits/ShinyText-TS-TW @aceternity/spotlight-new
```

## Code style
- Python: type hints everywhere, `async` for I/O, pydantic v2 models, `ruff` defaults (line length 100). Small modules, pure functions in `scoring/`.
- Log with `logging` (module loggers), not print. Include `run_id` and `round` in log records.
- UI look: use `@kavach/brand` (tokens, Tailwind theme, `KavachLogo` with idle/attack/breach/secured states). Headlines use Bricolage Grotesque (condensed), UI text Inter, code JetBrains Mono. Components come from shadcn/ui, Magic UI, React Bits and Aceternity via the registries in each app's `components.json`. Violet `--kv-brand` is the only CTA colour; rose/cyan/mint/gold carry meaning only. See `docs/assets/brand/BRAND.md`.
- TypeScript: `strict: true`, function components + hooks, no `any` in the event types (mirror `docs/API_CONTRACTS.md`).
- Tests: every detector rule and guard field has unit tests. Use `respx` to mock Lyzr/Band HTTP. No network in tests.

## Definition of done (per ticket)
- The code runs; `make check` passes; `make smoke` still passes (from P2-5 on).
- The doc is updated if a contract changed.
- The ticket is ticked in `docs/BUILD_PLAN.md`.

## Git rules (repo owner's requirements)
- Commit author: **Harsh Bhanushali <bhanushaliharsh434@gmail.com>**. Set it with `git config user.name "Harsh Bhanushali"` and `git config user.email "bhanushaliharsh434@gmail.com"`.
- **Logical commits**: one coherent change per commit (usually one ticket or part of one), touching as many files as that change needs. Use clear conventional messages (`feat(target): add guard engine and tests`, `fix(scoring): count blocked refunds as safe`, `docs: ...`).
- Commits don't need to be signed/verified.
- **No `Co-Authored-By` or other AI attribution trailers** in commit messages.
- Push to `main` often. Never force-push.

## When unsure
Pick the simplest option that matches the docs, write it down in the relevant doc in one line, and keep going. Don't stop to ask unless it's an irreversible action or a secret is needed.
