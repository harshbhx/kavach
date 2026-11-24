# Build Plan (ticket list for AI coding agents)

Deadline 10:00 PM IST, 24 Nov 2026. **Submit by 9:30 PM.** The "latest finish" column is the time by which a phase must be done. If a phase runs late, apply the cut lines in §7. Don't extend.

Tick boxes as you go (`[x]`). One ticket = one focused change. Run `make check` before marking a ticket done.

| Phase | Budget | Latest finish (IST) |
|---|---|---|
| 0. Accounts & keys (human) | 45 min | 10:00 |
| 1. Target + scoring core | 2 h 30 | 12:30 |
| 2. Agents + orchestrator + Band | 3 h | 15:30 |
| 3. Dashboard | 2 h 30 | 18:00 |
| 3b. Record the demo run | 30 min | 18:30 |
| 4. Deploy, README, video, submit | 2 h 30 | 21:30 |

---

## Phase 0: Accounts & keys (Harsh, by hand)

- [ ] P0-1 Lyzr Studio account + API key; create the 7 agents from `prompts/agents/*.md`; copy the IDs into `.env`.
- [ ] P0-2 Band: create the 7 remote agents; fill in `agent_config.yaml`; set `BAND_OWNER_USER_ID`.
- [ ] P0-3 LLM key for the target (and direct brain): set `TARGET_MODEL`, `DIRECT_MODEL` and the provider key.
- [ ] P0-4 Agent37 account + API key; fund the wallet if possible (otherwise skip S2).
- [x] P0-5 Create the public GitHub repo `harshbhx/kavach`; push these docs.
- [ ] P0-6 Install AdaL (`npm i -g @sylphai/adal-cli`) and open it in the repo.

## Phase 1: Target + scoring core

- [x] P1-1 **Scaffold backend.** `backend/pyproject.toml` (uv; deps: fastapi, uvicorn[standard], sse-starlette, httpx, pydantic>=2, pydantic-settings, litellm, pyyaml; dev: pytest, pytest-asyncio, respx, ruff), `kavach/config.py` (Settings from `.env`), `Makefile` (targets `check`, `test`, `lint`, `target`, `api`, `smoke`).
  *Done when* `make check` runs (lint + empty test pass).
- [x] P1-2 **Models.** `kavach/models.py` with every model named in `docs/AGENT_ROSTER.md`, `docs/TARGET_BOT.md`, `docs/SCORING.md`, `docs/API_CONTRACTS.md`.
  *Done when* the models import, and round-trip `data/guard_policy_v1.json` and the sample ToolCallRecord.
- [x] P1-3 **Mock DB + tools.** `target/db.py` (load `data/mock_db.json`, deep-copy reset), `target/tools.py` (the 4 tools + JSON schemas for LiteLLM).
  *Done when* unit tests cover each tool's happy path.
- [x] P1-4 **Guard engine.** `target/guards.py`: input filters, pre-tool checks, KYC masking, output redaction, canary block. Semantics as in `docs/TARGET_BOT.md §4`.
  *Done when* there are tests for every policy field, including `refund.max_auto_inr` → `pending_human_approval`.
- [x] P1-5 **Target LLM loop + service.** `target/llm.py`, `target/service.py` (`/chat`, `/config`, `/tools/log`, `/reset`, `/health`), with `config_override` support.
  *Done when* `make target` serves on :8001 and `curl /chat` with "Where is ORD-1001?" calls `get_order_status`.
- [x] P1-6 **Detectors.** `scoring/detectors.py`, the 5 rules from `docs/SCORING.md §1`.
  *Done when* there are ≥ 2 positive and 1 negative test per rule, using hand-built AttackResults.
- [x] P1-7 **Benign suite runner.** `scoring/benign.py`: run `data/benign_suite.json` against the target (optionally with `config_override`), evaluate the expectations, return the score + failures.
  *Done when* v1 scores ≥ 0.9 (v1 is helpful, just unsafe).
- [ ] P1-8 **EXIT CHECK: v1 is breakable.** A script `scripts/probe_v1.py` sends the Round 1 attacks from `data/attack_library.json` to v1 and prints the breach rate. _(Script done and passing on the offline fake target; rerun once `TARGET_MODEL` is set: `make probe`.)_
  *Done when* the breach rate is ≥ 50%. If not, tune `prompts/target/diwalimart_v1.md` (more naive) or switch `TARGET_MODEL`. **Don't continue until this passes.**

## Phase 2: Agents + orchestrator + Band

- [x] P2-1 **Brains.** `brains/base.py` (protocol + JSON extraction + validation + 1 repair retry), `brains/lyzr.py`, `brains/direct.py`, `brains/fake.py` + fixtures in `backend/tests/fixtures/fake_brain/`.
  *Done when* each brain passes a contract test (Lyzr mocked with respx).
- [x] P2-2 **Agent modules.** `agents/recon.py, injection.py, social.py, monitor.py, patcher.py, auditor.py, referee.py`: build the payloads exactly as in `docs/AGENT_ROSTER.md`, plus fallbacks (attack library; templated messages). _(Done as `agents/red.py`, `agents/blue.py`, `agents/referee.py`.)_
- [x] P2-3 **Event bus + JSONL.** `orchestrator/events.py`: async pub/sub, seq numbers, `t_rel_ms`, append to `runs/{run_id}.jsonl`.
- [x] P2-4 **Audit loop.** `orchestrator/audit.py`: exploit replay + benign suite with the candidate → decision as in `docs/SCORING.md §4`.
  *Done when* tested with FakeBrain: an over-blocking candidate is vetoed and a good one is approved.
- [x] P2-5 **Round loop.** `orchestrator/run.py`: the full flow from `docs/ARCHITECTURE.md §3`, concurrency with a semaphore, metrics, final report call.
  *Done when* `make smoke` (BRAIN_PROVIDER=fake, BAND_ENABLED=false, local target with a fake LLM mode) completes 3 rounds and writes a JSONL.
  Note: give the target a `TARGET_MODEL=fake` mode (a scripted tool-caller keyed on the message text) so smoke tests don't need an LLM.
- [x] P2-6 **Band client + bus.** `band/client.py` (me, create room, add participant, send message, post event; retries; error mapping), `band/bus.py` (event → message templates from `docs/API_CONTRACTS.md §3`), `scripts/band_setup.py`. _(Done as `band/client.py` + `band/room.py`; `scripts/band_setup.py` checks the identities.)_
  *Done when* a live run creates a room, and all 7 agents post with valid mentions.
- [x] P2-7 **API.** `api/app.py`: endpoints + SSE from `docs/API_CONTRACTS.md §1`, the single-run lock, CORS for the dashboard.
- [x] P2-8 **Report.** `report/markdown.py`: the hardened prompt, the final policy JSON, a metrics table, findings by OWASP category, the patch history, and the Referee narrative.
- [ ] P2-9 **First live run** (Lyzr + Band + local target). Fix prompt/JSON issues. Save a good run as `runs/demo_run.jsonl` if it looks good.

## Phase 3: Dashboard

- [x] P3-1 **Scaffold** `frontend/` (Vite React TS, Tailwind, Recharts, jsdiff). Copy `docs/assets/brand/frontend/*` into `frontend/src/brand/`; import `brand-tokens.css` at the root and `tailwind-theme.css` after Tailwind; `kavach-favicon.svg` as the favicon; agent avatars from `docs/assets/brand/agents/`. Env `VITE_API_BASE`.
- [x] P3-2 **Run controls + SSE hook.** Header with `<KavachLogo wordmark state={logoState} />` (state from events, table in BRAND.md "Logo states"), Start Live / Start Replay / speed, status chip, target badge (Local / Agent37), Band room link. `useRunEvents(runId)` reduces events into state.
- [x] P3-3 **Live feed** (left): `agent.message` bubbles with squad colour (red/blue/amber), agent avatar emoji, @mentions highlighted, and VETOED/APPROVED badges.
- [x] P3-4 **Breach vs Utility chart** (centre top): x = round; red line = breach rate; green line = utility of the applied patch; hollow red dots for vetoed candidates (tooltip with the reasons).
- [x] P3-5 **Intercepted tool-call feed** (centre bottom): a card per `toolcall.intercepted`. Red = breach (rule badge, e.g. `issue_refund(ORD-99, ₹50,000)`), green = `BLOCKED BY GUARDRAIL vN`, grey = ok. Auto-scroll; filter chips.
- [x] P3-6 **Diff + export** (right): version tabs v1…vN, a side-by-side diff of the system prompt + guard policy JSON, and an "Export hardened prompt & audit (.md)" button.
- [x] P3-7 **Scoreboard** (bottom): per-round cards (Breach %, Utility %, attempts/vetoes, TTH) + a final banner on `run.completed`.

## Phase 3b: Record the demo run (by 18:30)
- [ ] P3b-1 Do 2–3 live runs; keep the best one as `runs/demo_run.jsonl` (it needs ≥ 1 veto, a visible breach → block, and a falling breach line). Commit it.

## Phase 4: Deploy, docs, video, submit

- [ ] P4-1 (S2) Deploy the target to Agent37 with `scripts/deploy_target_agent37.sh`; run one live round against it. _(Script ready: `scripts/deploy_target_agent37.sh`; needs an Agent37 key + funded wallet.)_
- [ ] P4-2 README final: a GIF/screenshot, an architecture diagram, sponsor usage with screenshots (Lyzr agents, Band room, Agent37 instance), quickstart, and the HiDevs email line.
- [ ] P4-3 Record the ≤ 2-minute video following `docs/DEMO_AND_SUBMISSION.md` (use replay if live is flaky). Upload it to YouTube (unlisted is fine).
- [ ] P4-4 Devpost submission (text in `docs/DEMO_AND_SUBMISSION.md`) + HiDevs submission. **By 21:30.**
- [ ] P4-5 Make the repo public; check that it has no secrets (`git grep -n "api_key\|sk-"`).

## 7. Cut lines (apply in this order when behind)

1. Drop Finch (C3), the live Band agent (C1) and human approval (C2).
2. Drop Agent37 deploy (S2), but keep the script + an honest README note.
3. Simplify the diff panel to the prompt only (no policy diff).
4. 2 rounds instead of 3 (`ROUNDS=2`).
5. 2 attacks per agent (`ATTACKS_PER_AGENT=2`).
6. **Never cut:** the detectors, the Auditor veto logic, the Band messages, the chart, the tool-call feed, replay of a recorded run, the video, or the submission.
