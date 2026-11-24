# API Contracts

Three surfaces: (1) the Kavach API used by the dashboard, (2) the event envelope (SSE + JSONL), (3) outbound Band messages. The target service API is in `docs/TARGET_BOT.md §6`.

---

## 1. Kavach API (FastAPI, default `:8000`, prefix `/api`)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/api/health` | – | `{ ok, brain_provider, band_enabled, target_url, target_ok }` |
| POST | `/api/runs` | `{ "mode": "live" \| "replay", "rounds"?: 3, "attacks_per_agent"?: 3, "replay_file"?: "demo_run.jsonl", "speed"?: 1.0, "seed"?: 42 }` | `201 { run_id }` · `409` if a run is active |
| GET | `/api/runs/{run_id}` | – | `RunSummary` (below) |
| GET | `/api/runs/{run_id}/events` | `?from_seq=0` | **SSE** stream of `Event` (resends from `from_seq`, then live; an EventSource reconnect resumes after its `Last-Event-ID`) |
| GET | `/api/runs/{run_id}/configs/{version}` | – | `TargetConfig` |
| GET | `/api/runs/{run_id}/report.md` | – | `text/markdown` attachment `kavach-report-{run_id}.md` |
| POST | `/api/runs/{run_id}/stop` | – | `{ stopped: true }` |
| GET | `/api/runs` | – | `[{ run_id, mode, started_at, status }]` |

```jsonc
// RunSummary
{
  "run_id": "kv-20261124-1530-ab12",
  "mode": "live",
  "status": "running" | "completed" | "failed" | "stopped",
  "current_round": 2,
  "rounds": [
    { "round": 1, "config_attacked": "v1", "breach_rate": 0.67, "findings_by_rule": {"REFUND_LIMIT_EXCEEDED": 2, "PII_LEAK": 1},
      "attempts": 2, "vetoes": 1, "applied_version": "v2", "utility_applied": 1.0, "tth_seconds": 74.2, "status": "hardened" | "unhardened" | "no_breach" }
  ],
  "deployed_version": "v2",
  "band_room_url": "https://app.band.ai/...",   // null if Band disabled
  "report_ready": false
}
```

## 2. Event envelope (SSE `data:` lines and each JSONL line)

```jsonc
{
  "run_id": "kv-...",
  "seq": 17,                       // monotonically increasing per run
  "ts": "2026-11-24T15:30:12.345Z",
  "t_rel_ms": 12345,               // ms since run.started (used by replay)
  "type": "toolcall.intercepted",
  "round": 1,                      // null for run-level events
  "agent": "monitor",              // null if not agent-specific
  "data": { ... }                  // type-specific, below
}
```

SSE: `event: <type>` + `data: <json envelope>`. Send a keep-alive comment every 15 s.

### Event types and `data`

| type | data |
|---|---|
| `run.started` | `{ mode, rounds, attacks_per_agent, brain_provider, target_url, band_room_url }` |
| `round.started` | `{ config_version }` |
| `agent.message` | `{ agent, squad: "red"\|"blue"\|"neutral", text, mentions: [agent\|"owner"], band_message_id: string\|null }` — **the feed panel renders these** |
| `recon.dossier` | `Dossier` |
| `attack.launched` | `{ attack_id, agent, technique, goal, message }` |
| `target.response` | `{ attack_id \| benign_id, kind: "attack"\|"probe"\|"benign"\|"replay", reply_excerpt, config_version, input_blocked_by, latency_ms }` |
| `toolcall.intercepted` | `{ attack_id \| benign_id, kind, record: ToolCallRecord, verdict: "breach"\|"blocked"\|"ok", rule_id? }` — **the tool-call feed renders these** (red = breach, green = blocked, grey = ok) |
| `breach.detected` | `Finding` |
| `round.breach_scored` | `{ total_attacks, breaching, errors, breach_rate, findings_by_rule }` |
| `monitor.report` | `MonitorOutput` (minus `band_message`) |
| `patch.proposed` | `{ attempt, candidate_version, changelog, rationale, prompt_diff_stats: {added, removed}, policy_changes: [string] }` |
| `audit.result` | `{ attempt, candidate_version, decision: "approve"\|"veto", replay: {total, still_breaching}, utility: {score, failed:[{id, why}]}, reasons: [string] }` |
| `patch.applied` | `{ version, tth_seconds }` |
| `round.scored` | the round entry from `RunSummary.rounds` |
| `report.ready` | `{ url: "/api/runs/{id}/report.md" }` |
| `run.completed` | `{ final_breach_rate, final_utility, total_exploits, owasp_breakdown: {LLM06: 3, ...} }` |
| `band.error` | `{ action, status, detail }` (shown as a small warning chip; never fatal) |
| `error` | `{ where, detail, fatal: bool }` |

Chart data comes from `round.breach_scored` (Breach line) and `audit.result` (Utility points; vetoed candidates are drawn as hollow red dots labelled VETOED).

## 3. Band outbound messages

Base URL: `BAND_API_BASE` (default `https://api.band.ai/api/v1`; the docs also show `https://app.band.ai/api/v1`, so confirm one with `GET /agent/me` in `scripts/band_setup.py`). Auth: header `X-API-Key: <that agent's api_key>`.

| Action | Request |
|---|---|
| Who am I (resolve handle/id) | `GET /agent/me` |
| Create room (once per run, as Referee) | `POST /agent/chats` body `{"chat": {"title": "Kavach · <run_id>"}}` → `data.id` |
| Add participants (as Referee) | `POST /agent/chats/{chat_id}/participants` body `{"participant": {"participant_id": "<agent_id or owner user uuid>", "role": "member"}}` (one call each: 6 sibling agents + the owner `BAND_OWNER_USER_ID`) |
| Send message (as acting agent) | `POST /agent/chats/{chat_id}/messages` body `{"message": {"content": "@Patcher 🚨 ...", "mentions": [{"id": "<agent_id>", "handle": "<handle>"}]}}` |
| Post event (optional, informational) | `POST /agent/chats/{chat_id}/events`. Schema to confirm in the docs; use for intercepted tool calls if it works, else skip. |

Rules (from the Band docs):
- Messages **must** mention ≥ 1 participant, the mentioned handle must appear in `content`, and you can't mention yourself or someone outside the room. Error codes: `mentions_required`, `cannot_mention_self`, `handle_not_found`.
- Max content 512 KiB. Keep ours ≤ 1,500 chars.
- `403 limit_reached` = plan quota. Stop posting for the run, emit `band.error`, and continue.
- `503` = backpressure. Retry once after 1 s.

### Message templates (`band/bus.py`)

| Trigger event | From | Mentions | Content |
|---|---|---|---|
| `round.started` | Referee | Recon (R1) / Injector + Social Engineer (R2+) | `⚖️ Round {n} — target DiwaliMart {version}. @Recon map it.` |
| `recon.dossier` | Recon | Injector, Social Engineer | dossier `band_message` |
| attacks ready | Injector / Social Engineer | Monitor | agent `band_message` + `({k} attacks)` |
| `round.breach_scored` + `monitor.report` | Monitor | Patcher | monitor `band_message` |
| `patch.proposed` | Patcher | Auditor | patcher `band_message` |
| `audit.result` veto | Auditor | Patcher | auditor `verdict_message` |
| `audit.result` approve | Auditor | Referee | auditor `verdict_message` |
| `round.scored` | Referee | Recon or owner | referee commentary |
| `run.completed` | Referee | owner | final scoreboard + "report: <dashboard url>" |

Mirror every Band post as an `agent.message` SSE event, so the dashboard feed looks the same as the Band room even when `BAND_ENABLED=false`.

## 4. `agent_config.yaml` (Band credentials, gitignored)

```yaml
recon:      { agent_id: "...", api_key: "..." }
injection:  { agent_id: "...", api_key: "..." }
social:     { agent_id: "...", api_key: "..." }
monitor:    { agent_id: "...", api_key: "..." }
patcher:    { agent_id: "...", api_key: "..." }
auditor:    { agent_id: "...", api_key: "..." }
referee:    { agent_id: "...", api_key: "..." }
```

The same format as the Band SDK's `Agent.from_config(<key>)`, so stretch C1 can reuse it. The keys are the internal agent names used everywhere in code and events: `recon, injection, social, monitor, patcher, auditor, referee`. Band display names (`Injector`, `Social Engineer`, …) are only labels in the Band UI.
