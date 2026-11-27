# Setup on Windows

Everything works on Windows 11 with Git Bash or PowerShell. The only difference is `make`, which Windows does not ship with. `pnpm bootstrap` and `pnpm demo` call it, so run the same commands from `backend/` instead.

## Prerequisites

- Node 22 or newer and pnpm 10
- [uv](https://docs.astral.sh/uv/) (it installs Python 3.12 itself)
- Google Chrome, if you want PDF audit reports
- Git Bash, for the Agent37 deploy script

## Install

```bash
CI=true pnpm install            # CI=true stops pnpm asking to remove node_modules without a terminal
cd backend
uv sync --extra live
```

## Make targets without make

Run these from `backend/`:

| Instead of | Run |
|---|---|
| `make check` | `uv run ruff check . && uv run ruff format --check . && uv run python -m pytest -q` |
| `make target` | `uv run python -m uvicorn kavach.target.service:app --port 8001` |
| `make referee` | `uv run --extra live python -m kavach.band.live_referee` |
| `pnpm demo` or `make demo` | `uv run --extra live python -m kavach.record_demo` (the target must be running: `pnpm dev`, or the line above) |
| `make gate` | `uv run python -m kavach.cli ci --prompt ../data/ci/hardened_prompt.md --policy ../data/ci/hardened_policy.json --baseline ../data/ci/baseline.json` |
| `pnpm bootstrap` or `make setup` | `uv sync && uv run python -m kavach.setup` |

If `uv run uvicorn ...` or `uv run pytest` fails with `Failed to canonicalize script path`, use the `python -m` form shown in the table.

## Environment variables for one command

PowerShell:

```powershell
$env:APPROVAL_REQUIRED="true"; $env:APPROVAL_TIMEOUT_S="300"; pnpm dev
```

Git Bash:

```bash
APPROVAL_REQUIRED=true APPROVAL_TIMEOUT_S=300 pnpm dev
```

Under `pnpm dev`, Turbo passes through only the variables listed in `turbo.json`. If you add a new setting that `pnpm dev` must see, add it to `globalPassThroughEnv` there.

## Ports

| Port | What |
|---|---|
| 8000 | Kavach API |
| 8001 | DiwaliMart target (when `TARGET_URL` is local) |
| 5173 | Dashboard |
| 3000 | Site and docs |

If a run fails with "All connection attempts failed", the target on 8001 is not running. Start `pnpm dev` or the target line above first.

## Keeping the machine light

Live runs spend credits and CPU. Stop what you started when you are done: `pnpm dev` (Ctrl-C), the live Referee, and any standalone target. Nothing else needs to stay running.
