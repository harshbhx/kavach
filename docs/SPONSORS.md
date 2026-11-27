# Sponsor Integration Guide

Checked against each sponsor's public docs on 24 Nov 2026. Anything marked **VERIFY** wasn't fully documented: confirm it on the first live call and update this file.

Judging criterion (Devpost): **Sponsor Tool Integration**, i.e. how well the project uses Lyzr / AdaL / Finch / Band / Agent37 to build, deploy or power the agent workflow.

---

## 1. Lyzr: brains of the 7 agents

**Docs:** https://docs.lyzr.ai (index: https://docs.lyzr.ai/llms.txt)

### Setup (≈ 25 min, by hand in Lyzr Studio)
1. Sign up at Lyzr Studio and create an API key.
2. Create **7 agents**, one per file in `prompts/agents/`. For each: name it (e.g. `Kavach Recon`), paste the prompt file's content into the role/instructions fields, pick a fast model, set the temperature from `docs/AGENT_ROSTER.md`, and turn on Structured Output / JSON if it's offered.
3. Copy each agent ID into `.env` (`LYZR_AGENT_RECON`, … `LYZR_AGENT_REFEREE`).

### Calling an agent (`backend/kavach/brains/lyzr.py`)
```http
POST https://agent-prod.studio.lyzr.ai/v3/inference/chat/
x-api-key: $LYZR_API_KEY
Content-Type: application/json

{ "user_id": "$LYZR_USER_ID", "agent_id": "<agent id>", "session_id": "<run_id>-<agent>", "message": "TASK: ...\n\n{json}" }
```
- `session_id` keeps context across calls. Use a stable id per run+agent.
- Reply text field: **VERIFY**. The streaming docs show `{"response": "..."}`, so read `response` first, then fall back to searching for a string field.
- An older v2 endpoint also exists (`https://agent.api.lyzr.app/v2/chat/`). Don't use it unless v3 fails.
- Docs also describe per-agent endpoints (`POST /v3/agent/{id}/chat`). Use the inference endpoint above as primary.

### What to show judges
- A screenshot of the 7 agents in Lyzr Studio (for the README and video).
- Mention: role/goal/instructions per agent, structured JSON output, session memory across rounds.

---

## 2. Band: the shared Kavach room

**Docs:** https://docs.band.ai (index: https://docs.band.ai/llms.txt) · Python SDK `band-sdk` (needs Python 3.11+ and uv)

### Setup (≈ 20 min)
1. Sign in at app.band.ai → **Agents** → **Connect remote agent**. Do this 7 times with the names `Recon`, `Injector`, `Social Engineer`, `Monitor`, `Patcher`, `Auditor`, `Referee` (3–24 chars; description ≥ 10 chars, e.g. "Kavach red-team recon agent").
   Upload the matching avatar from `docs/assets/brand/agents/` for each agent, so the room looks clear in the video.
2. Each dialog shows the **ID** and **API key once**. Paste them into `agent_config.yaml` (template: `agent_config.example.yaml`).
3. Find your own user UUID (Human API `GET /me` or the web app) and set `BAND_OWNER_USER_ID`, so the Referee adds you to each room.
4. Run `uv run python scripts/band_setup.py`. It calls `GET /agent/me` for all 7 agents, prints the handles, creates a test room, adds everyone, and posts one test message.

### How we use it
- One room per run, created by the Referee agent, with the 6 sibling agents + you added (agents may add siblings and their owner).
- Every handoff is a message **from the acting agent's identity** that @mentions the next agent (mentions are required; an agent only receives messages that mention it).
- Endpoints and templates: `docs/API_CONTRACTS.md §3`.
- Base URL: **VERIFY**. The reference pages use `https://api.band.ai/api/v1`; the overview uses `https://app.band.ai/api/v1`. Set `BAND_API_BASE`.

### The live Referee (built)
`backend/kavach/band/live_referee.py` runs the Referee's Band identity on the Band SDK (`band-sdk`, the `live` extra), next to the Kavach API:

```bash
cd backend && make referee        # = uv run --extra live python -m kavach.band.live_referee
```

- It answers **people** who @mention it: `status` (the default), `breaches`, `patch`, `report` and `help`. Messages from agents are ignored, so the squads' own handoffs to @Referee never trigger it.
- It reads the newest run from the API (`KAVACH_API`, default `http://127.0.0.1:8000`), or the recorded demo run when no run is live. Every number comes from the run's `RunSummary`; no model is asked for a score.
- It is a custom `SimpleAdapter` with no LLM behind it: `answer()` is a pure function, unit-tested in `backend/tests/test_live_referee.py` against the real SDK classes.
- Credentials: the `referee` entry in `agent_config.yaml` (override the path with `BAND_AGENT_CONFIG`).
- **Approval from the room (built).** With `APPROVAL_REQUIRED=true`, a patch the Auditor passed waits: the Referee posts the numbers and mentions you, and `@Referee approve v2` or `@Referee reject v2 because ...` settles it (the live Referee forwards it to `POST /api/runs/{id}/approval`). The dashboard has the same buttons. A rejection goes to the Patcher's next attempt as a veto reason; a timeout follows `APPROVAL_ON_TIMEOUT`.

### What to show judges
- The Band room in a split screen next to the dashboard during the video.
- People can read and post in the room. Writing `@Referee status` (or `breaches`, `patch`, `report`) gets an answer from the live Referee when `make referee` is running, and with approval on, a person ships or rejects each patch from the room.

---

## 3. Agent37: isolated sandbox for the target

**Docs:** https://www.agent37.com/docs (index: https://www.agent37.com/docs/llms.txt, quickstart: `/docs/quickstart.md`)

### Facts from the docs (checked 24 Nov 2026)
- Create/delete: `https://api.agent37.com/v1/instances` with `Authorization: Bearer $AGENT37_API_KEY`.
- Exec: `POST https://api.agent37.com/v1/instances/{id}/exec` with `Authorization: Bearer $AGENT37_API_KEY`, body `{"command": "..."}` → `{exit_code, stdout, stderr, truncated}`. One call runs for at most 280 s, so long-running servers start with `nohup … &`. Files persist between commands.
- HTTP services are reachable at `https://{instanceId}-{port}.agent37.app` (no port registration). Requests need `X-Agent37-Key` (or a signed URL / public port for browsers).
- New workspaces include credit for one instance; more need a funded wallet. Deleting an instance stops billing; stopped instances still bill for disk.
- The default template (no body on create) is a Linux machine with Python, Node, git and build tools.

### Deploy (`scripts/deploy_target_agent37.sh`)
1. Create an instance → `INSTANCE_ID`.
2. Exec: install uv, `git clone <public repo>`, `cd kavach/backend && uv sync`.
3. Exec: start in the background, e.g. `nohup uv run uvicorn kavach.target.service:app --host 0.0.0.0 --port 8000 > /tmp/target.log 2>&1 &`, with `TARGET_MODEL` + the provider key passed as env vars in the command.
4. Health check: `curl -H "X-Agent37-Key: $AGENT37_API_KEY" https://$INSTANCE_ID-8000.agent37.app/health`.
5. In `.env`: `TARGET_URL=https://$INSTANCE_ID-8000.agent37.app`, `TARGET_EXTRA_HEADERS={"X-Agent37-Key":"..."}`.
6. After the hackathon: `DELETE` the instance.

Recorded: run 10 (`runs/gallery/demo10.jsonl`, 50% → 0% → 0%, utility 100%) used an Agent37 instance as the target, with every reply coming back over HTTPS. The script starts the server with `setsid` and frees the port with `fuser -k`; an earlier `pkill -f` matched its own shell and killed the start command, and `/health` alone is not proof (the proxy answers it even when nothing runs), so check a real `/chat` call.

If the wallet can't be funded in time, run the target locally (`:8001`) and say "Agent37-ready deploy script included" in the README. Don't claim a deployment that didn't happen.

### What to show judges
- The dashboard header shows `Target: Agent37 sandbox <id>`.
- The story: "attack your agent in a disposable microVM before production".

---

## 4. AdaL: the coding agent that builds it

**Install:** `npm install -g @sylphai/adal-cli` (or the install script at adal.sylph.ai).
- AdaL reads **`AGENTS.md` at the workspace root on every turn**. That's why this repo's rules live there.
- Project skills live in `.adal/skills/`. Kavach ships both skill packs there (copies of `skills/`, kept in sync by `python scripts/sync_skills.py` and checked by a test), so AdaL working in this repo can generate red-team messages for your own bot or harden it with the same playbooks Kavach's agents use.
- The SF edition suggested AdaL for making the demo video too. If you use it for that, say so. Don't claim AdaL built something unless it did.

## 5. Finch: the skill packs

The two packs in `skills/` are the squads' playbooks and a live input to every run (`backend/kavach/skills.py`):
- `skills/owasp-llm-attack-pack/` (`SKILL.md` + `techniques.json`): one card per technique (squad, round, OWASP risks, goals, a short how-to). The Injector and Social Engineer get the cards for their round on every call.
- `skills/agent-hardening-pack/` (`SKILL.md` + `playbook.json`): five principles, a guard policy template and system prompt additions. The Patcher gets it with every patch request.
- Each run records the packs it used (`name@version+digest`) in `run.started` and in the audit report.

### Publishing to the Finch market (needs the owner's wallet)
From the Finch CLI guide (finchtech.ai/en/story/cli-mcp, checked 27 Nov 2026; CLI 0.5.7+, Node 20+):
```bash
pnpm add --global @finchtech/cli@latest
finch wallet create            # or: finch wallet use --file <PATH>  (never paste a key into a command)
finch login --help             # pick a supported chain, then:
finch login --chain-id <SUPPORTED_AUTH_CHAIN_ID>
finch status
finch skill publish-submit --path skills/owasp-llm-attack-pack --intent <INTENT_ID>
finch skill publish-submit --path skills/agent-hardening-pack --intent <INTENT_ID>
```
The guide does not say where the `<INTENT_ID>` comes from; the Finch website or its Remote MCP (`https://www.finchtech.ai/mcp`) shows it. Publishing signs on-chain with a local CLI wallet, so only the owner can do it. Until then, describe the packs as "Kavach's playbooks, ready for Finch", not as published.
