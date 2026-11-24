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
kavach/
  AGENTS.md  CLAUDE.md  README.md  .env.example  agent_config.example.yaml  .gitignore
  docs/               # specs (source of truth)
  prompts/target/     # DiwaliMart v1 system prompt
  prompts/agents/     # 7 Kavach agent prompts (also pasted into Lyzr Studio)
  data/               # mock_db.json, guard_policy_v1.json, benign_suite.json, attack_library.json
  skills/             # Finch-ready skill packs (stretch)
  docs/assets/brand/  # logo, favicon, thumbnails, agent avatars (see BRAND.md); use these in the dashboard
  scripts/            # probe_v1.py, band_setup.py, deploy_target_agent37.sh, build_brand.py
  runs/               # JSONL run logs (demo_run.jsonl = real live run; sample_simulated_run.jsonl = offline fake run)
  backend/
    pyproject.toml  Makefile
    kavach/
      config.py models.py runtime.py cli.py target_client.py
      target/      service.py llm.py runner.py tools.py guards.py db.py fake_model.py
      brains/      base.py lyzr.py direct.py fake.py
      agents/      red.py (recon, injector, social) blue.py (monitor, patcher, auditor) referee.py
      scoring/     detectors.py benign.py metrics.py
      orchestrator/ run.py audit.py events.py replay.py
      band/        client.py room.py
      api/         app.py
      report/      markdown.py
    tests/         (pytest, all offline: conftest.py test_target.py test_scoring.py test_run.py)
  frontend/        (Vite + React 19 + TS + Tailwind v4 + Recharts; see frontend/README.md)
    src/lib/       api.ts types.ts useRun.ts (SSE → view state) format.ts useStickyScroll.ts
    src/components/ Header Feed BreachChart ToolFeed DiffPanel Scoreboard
    src/brand/     logo + tokens (copied from docs/assets/brand/frontend/)
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

# frontend
cd frontend && npm install && npm run dev   # VITE_API_BASE=http://localhost:8000
```

## Code style
- Python: type hints everywhere, `async` for I/O, pydantic v2 models, `ruff` defaults (line length 100). Small modules, pure functions in `scoring/`.
- Log with `logging` (module loggers), not print. Include `run_id` and `round` in log records.
- Dashboard look: use `docs/assets/brand/frontend/` (tokens, Tailwind theme, `KavachLogo` component with idle/attack/breach/secured states). Violet `--kv-brand` is the only CTA colour; rose/cyan/mint/gold carry meaning only. See `docs/assets/brand/BRAND.md`.
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
