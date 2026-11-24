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

### Stretch C1: a live agent in the room
Run the Referee as a real Band SDK agent, so judges can ask `@Referee` questions during the live demo:
```python
from band import Agent
from band.adapters import LangGraphAdapter   # or the Anthropic / Pydantic AI adapter
agent = Agent.from_config("referee", adapter=adapter)
await agent.run()   # replies via the band_send_message tool when mentioned
```
Give it a custom tool that reads the latest `RunSummary` from our API.

### What to show judges
- The Band room in a split screen next to the dashboard during the video.
- Human-in-the-loop: you can type in the room at any time (stretch C2: the Referee waits for your "approve").

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

If the wallet can't be funded in time, run the target locally (`:8001`) and say "Agent37-ready deploy script included" in the README. Don't claim a deployment that didn't happen.

### What to show judges
- The dashboard header shows `Target: Agent37 sandbox <id>`.
- The story: "attack your agent in a disposable microVM before production".

---

## 4. AdaL: the coding agent that builds it

**Install:** `npm install -g @sylphai/adal-cli` (or the install script at adal.sylph.ai).
- AdaL reads **`AGENTS.md` at the workspace root on every turn**. That's why this repo's rules live there.
- Project skills go in `.adal/skills/` (optional).
- Use AdaL for the build tasks in `docs/BUILD_PLAN.md`, and mention it in the README ("Built with AdaL"). The SF edition suggested AdaL for making the demo video too. If you use it for that, say so.

---

## 5. Finch: stretch only (no listed prize)

Finch (finchtech.ai) runs Agent / Task / Skill markets. Using it needs `@finchtech/cli` (0.5.6+ to publish skills), a local wallet, OAuth through its Remote MCP (`https://www.finchtech.ai/mcp`), and on-chain publication. That's too slow for a one-day build.

Plan:
- Write the skill packs as plain folders first: `skills/owasp-llm-attack-pack/SKILL.md` and `skills/agent-hardening-pack/SKILL.md` (agentskills-style: name, description, instructions).
- Only if everything else is done by 5 PM, publish them to Finch and link them in the README.
- In the README, describe Finch as "skill packs are Finch-ready". Don't claim Finch integration unless they're published.
