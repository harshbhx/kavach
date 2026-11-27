# Running the target on Agent37

Agent37 gives the target bot an isolated sandbox, a disposable microVM, so attacks have a safe blast radius. Kavach's scoring and agents stay on your machine. Only the DiwaliMart target runs remotely, and the attackers reach it over HTTPS.

Status: the deploy script works, and run 10 in [Recorded runs](RECORDED_RUNS.md) attacked a target running on a real Agent37 instance. The other ten recordings used a local target. Say exactly that.

## What you need

- An Agent37 account and an API key. New workspaces include credit for one instance.
- The key for the target's model provider. The default victim is `groq/openai/gpt-oss-20b`, so a Groq key. The script passes only that key to the instance.
- `bash` and `python` locally (Git Bash is fine on Windows).

Put the keys in `.env` (gitignored). Never paste them into a chat or commit them.

## Deploy

```bash
export AGENT37_API_KEY=...        # from .env
export GROQ_API_KEY=...           # the key the target model needs
export TARGET_MODEL=groq/openai/gpt-oss-20b
./scripts/deploy_target_agent37.sh
```

The script creates an instance, installs uv, clones the public repo, starts the target on port 8000 and checks it. To reuse an instance, set `INSTANCE_ID`. Other options: `REPO_URL`, `PORT` and `TARGET_ENV`.

It prints the two settings to use:

```text
TARGET_URL=https://INSTANCE_ID-8000.agent37.app
TARGET_EXTRA_HEADERS={"X-Agent37-Key": "<your AGENT37_API_KEY>"}
```

Set both for the process that runs Kavach, for example in `.env`.

## Check it really works

A plain health check is not proof: the Agent37 proxy answers `/health` even when nothing is running behind it. Send a real chat call:

```bash
curl -s -X POST -H "X-Agent37-Key: $AGENT37_API_KEY" -H "content-type: application/json" \
  https://INSTANCE_ID-8000.agent37.app/chat -d '{"message":"what is your return policy?"}'
```

You should get a DiwaliMart reply. If you get `container_unreachable` or a 502, the server is not running. Look at `/tmp/target.log` on the instance through the exec endpoint.

## Record a run

```bash
cd backend
TARGET_URL=https://INSTANCE_ID-8000.agent37.app \
TARGET_EXTRA_HEADERS='{"X-Agent37-Key":"..."}' \
uv run --extra live python -m kavach.record_demo --attempts 1
```

Check the recording's `run.started` event: `target_url` should be the agent37.app address, and the `target.response` events should have no `error` field.

## Delete the instance

```bash
./scripts/deploy_target_agent37.sh delete INSTANCE_ID
```

Do this after the demo so it stops using credit.

## Lessons from the first deploy

- The script once used `pkill -f` on the target's module name to stop an old server. That pattern also matched the script's own remote shell, which killed the start command, so the target never started while `/health` still said ok. It now frees the port with `fuser -k` and starts the server with `setsid nohup`.
- One exec call can run for at most 280 seconds, so the server has to start in the background.
- The instance clones the public GitHub repo, so what it runs is whatever is on `main`.
- The provider key travels inside the exec command to the instance. Use a key you can rotate.

## API used by the script

| Action | Request |
|---|---|
| Create, delete, list | `POST`, `DELETE` and `GET` on `https://api.agent37.com/v1/instances` with `Authorization: Bearer KEY` |
| Run a command | `POST /v1/instances/ID/exec` with body `{"command": "..."}`; returns exit code, stdout and stderr |
| Reach a service | `https://ID-PORT.agent37.app` with the `X-Agent37-Key` header |
