# Human approval

Kavach runs unattended by default: when the Auditor passes a patch and utility holds, the patch ships. Human approval is an option you switch on when a person should have the final say on shipping a patch. Code still decides whether a patch is good enough to ask about. A person only decides whether to ship it.

## Switching it on

| Where | How | Default |
|---|---|---|
| Dashboard | Tick **Human approval** next to **Start live run**. Unticked sends an explicit off, so it overrides the backend setting. | off |
| API | `POST /api/runs` with `"require_approval": true` (or `false`) | follows `APPROVAL_REQUIRED` |
| Environment | `APPROVAL_REQUIRED=true` | off |

Related settings:

| Variable | Meaning | Default |
|---|---|---|
| `APPROVAL_REQUIRED` | Ask a person before each patch ships | `false` |
| `APPROVAL_TIMEOUT_S` | Seconds to wait for an answer | `120` |
| `APPROVAL_ON_TIMEOUT` | `approve` or `reject` when nobody answers | `approve` |

With the defaults an unattended run never stalls: no answer in two minutes means approve.

## What happens in a run

1. The Patcher proposes a patch and the Auditor replays the exploits and re-scores everyday requests.
2. If the patch passes, the run emits `approval.requested` and the summary shows `awaiting_approval`.
3. The Referee asks in the Band room and mentions the owner. The dashboard shows a banner with **Approve** and **Reject** buttons and a countdown.
4. A person answers from either place. The first answer wins.
5. Approve: the patch deploys and the next round attacks the new version. Reject: it counts as a veto, the reason goes to the Patcher's next attempt, and the Patcher tries again (up to `MAX_PATCH_ATTEMPTS`).
6. The run emits `approval.decided` with who decided, from where (`band`, `dashboard`, `api`, `timeout` or `auto`) and how long it waited.

## Answering from the Band room

Run the live Referee next to the API:

```bash
cd backend
uv run --extra live python -m kavach.band.live_referee     # or: make referee
```

Then in the run's room:

| You type | The Referee does |
|---|---|
| `@Referee approve v2` | ships the waiting patch |
| `@Referee reject v2 because it needs a human check` | sends it back with your reason |
| `@Referee status` | the score by round |
| `@Referee breaches` | which breach rules fired, by round |
| `@Referee patch` | what the blue squad shipped |
| `@Referee report` | a link to the audit report |
| `@Referee help` | the list above |

A decision word has to open your message (after the @mention). A question like "should I approve v2?" never ships anything.

## Answering from the API

```bash
curl -X POST localhost:8000/api/runs/RUN_ID/approval \
  -H "content-type: application/json" \
  -d '{"decision": "approve", "version": "v2", "by": "Harsh", "source": "api"}'
```

It returns `409` if no patch is waiting, or if the waiting version is not the one you named.

## Recorded example

`runs/demo_approval.jsonl` is a recorded live run with a person in the loop: v2 was rejected in the Band room, then approved. See [Recorded runs](RECORDED_RUNS.md).

## Troubleshooting

- **The run never asks.** Check the checkbox, or that `APPROVAL_REQUIRED=true` reached the backend. Under `pnpm dev`, Turbo only passes through the variables listed in `turbo.json`; `APPROVAL_REQUIRED` and `APPROVAL_TIMEOUT_S` are on that list since 0.1.0-beta.1. Older checkouts silently dropped them.
- **The Referee does not answer in the room.** The live Referee process has to be running, and it needs `agent_config.yaml` from `pnpm bootstrap`. It reads the latest run from the API at `KAVACH_API` (default `http://127.0.0.1:8000`).
- **A run waited the full timeout.** Nobody answered, so `APPROVAL_ON_TIMEOUT` applied.
