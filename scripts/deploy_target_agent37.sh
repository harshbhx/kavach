#!/usr/bin/env bash
# Deploy the DiwaliMart target bot into an Agent37 sandbox (disposable microVM).
#
#   AGENT37_API_KEY=...  GROQ_API_KEY=...  ./scripts/deploy_target_agent37.sh
#   ./scripts/deploy_target_agent37.sh delete <instance_id>     # stop billing after the demo
#
# Optional env: REPO_URL (default the public GitHub repo), TARGET_MODEL (default groq/openai/gpt-oss-20b, the
# headline runs' victim), PORT (8000), INSTANCE_ID (reuse one), TARGET_ENV (extra KEY=VALUE pairs for the target,
# e.g. "TARGET_CONCURRENCY=8 TARGET_TEMPERATURE=0.2"). The API key is at
# https://www.agent37.com/dashboard/cloud/api-keys. Endpoints per https://www.agent37.com/docs/quickstart.md
# (checked 28 Nov 2026): create and delete on api.agent37.com with `Authorization: Bearer`; exec on
# sandbox.agent37.app and preview URLs with `X-Agent37-Key`. One exec call may run for up to 280 s, so the server is
# started in the background. On Windows, run this in Git Bash.
set -euo pipefail

API=https://api.agent37.com/v1
SANDBOX=https://sandbox.agent37.app/v1
REPO_URL=${REPO_URL:-https://github.com/harshbhx/kavach.git}
TARGET_MODEL=${TARGET_MODEL:-groq/openai/gpt-oss-20b}
PORT=${PORT:-8000}

: "${AGENT37_API_KEY:?set AGENT37_API_KEY}"
PY=$(command -v python3 || command -v python) || { echo "python is required (used to read the JSON replies)"; exit 1; }

# JSON helpers (no jq needed). json_body builds the exec request; json_get prints the first non-empty value among the given paths.
json_body() { "$PY" -c 'import json,sys; print(json.dumps({"command": sys.argv[1]}))' "$1"; }
json_get() {
  "$PY" -c '
import json, sys
d = json.load(sys.stdin)
def dig(o, p):
    for k in p.split("."):
        if isinstance(o, dict) and k in o:
            o = o[k]
        else:
            return None
    return o
for path in sys.argv[1:]:
    v = dig(d, path)
    if v not in (None, ""):
        print(v)
        break
' "$@"
}

if [[ "${1:-}" == "delete" ]]; then
  id=${2:?usage: $0 delete <instance_id>}
  curl -fsS -X DELETE "$API/instances/$id" -H "Authorization: Bearer $AGENT37_API_KEY" && echo "deleted $id"
  exit 0
fi

# Provider key for the target model (only the one TARGET_MODEL needs).
case "$TARGET_MODEL" in
  anthropic/*) KEY_ENV="ANTHROPIC_API_KEY" ;;
  openai/*) KEY_ENV="OPENAI_API_KEY" ;;
  gemini/*) KEY_ENV="GEMINI_API_KEY" ;;
  groq/*) KEY_ENV="GROQ_API_KEY" ;;
  *) KEY_ENV="" ;;
esac
KEY_VAL=""
if [[ -n "$KEY_ENV" ]]; then
  KEY_VAL=${!KEY_ENV:-}
  [[ -n "$KEY_VAL" ]] || { echo "set $KEY_ENV for $TARGET_MODEL"; exit 1; }
fi

exec_cmd() { # exec_cmd "<shell command>" -> prints stdout, fails on non-zero exit
  local reply status out code
  # Exec lives on sandbox.agent37.app (X-Agent37-Key). Older workspaces took it on the hosting API, so fall back once.
  reply=$(curl -sS -w $'\n%{http_code}' -X POST "$SANDBOX/instances/$INSTANCE_ID/exec" \
    -H "X-Agent37-Key: $AGENT37_API_KEY" -H "Content-Type: application/json" -d "$(json_body "$1")")
  status=${reply##*$'\n'}
  if [[ "$status" == "404" || "$status" == "405" ]]; then
    reply=$(curl -sS -w $'\n%{http_code}' -X POST "$API/instances/$INSTANCE_ID/exec" \
      -H "Authorization: Bearer $AGENT37_API_KEY" -H "Content-Type: application/json" -d "$(json_body "$1")")
    status=${reply##*$'\n'}
  fi
  out=${reply%$'\n'*}
  if [[ "$status" != 2* ]]; then
    # Only the error message: the raw body could echo the command, which carries the provider key.
    echo "Agent37 exec failed (HTTP $status): $(echo "$out" | json_get error.message message 2>/dev/null || echo 'no message')" >&2
    return 1
  fi
  echo "$out" | json_get stdout
  code=$(echo "$out" | json_get exit_code); code=${code:-0}
  if [[ "$code" != "0" ]]; then
    echo "$out" | json_get stderr >&2
    echo "command failed ($code)" >&2
    return 1
  fi
}

if [[ -z "${INSTANCE_ID:-}" ]]; then
  echo "1/4 creating instance…"
  # The default template is a Linux machine with Python, Node, git and build tools.
  reply=$(curl -sS -w $'\n%{http_code}' -X POST "$API/instances" -H "Authorization: Bearer $AGENT37_API_KEY")
  status=${reply##*$'\n'}
  body=${reply%$'\n'*}
  if [[ "$status" != 2* ]]; then
    echo "Agent37 refused to create an instance (HTTP $status): $(echo "$body" | json_get error.message message 2>/dev/null || echo "$body")" >&2
    [[ "$status" == "402" ]] && echo "Add balance or a card at https://www.agent37.com/dashboard/cloud, then run this again." >&2
    exit 1
  fi
  INSTANCE_ID=$(echo "$body" | json_get id data.id instance.id)
  [[ -n "$INSTANCE_ID" && "$INSTANCE_ID" != "null" ]] || { echo "could not read the instance id"; exit 1; }
fi
echo "    instance: $INSTANCE_ID"

echo "2/4 installing uv + cloning the repo…"
exec_cmd 'command -v uv >/dev/null || (curl -LsSf https://astral.sh/uv/install.sh | sh)'
exec_cmd "export PATH=\$HOME/.local/bin:\$PATH; [ -d kavach ] && (cd kavach && git pull -q) || git clone -q $REPO_URL kavach; cd kavach/backend && uv sync -q"

echo "3/4 starting the target on :$PORT…"
ENV_LINE="TARGET_MODEL=$TARGET_MODEL"
[[ -n "${TARGET_ENV:-}" ]] && ENV_LINE="$ENV_LINE $TARGET_ENV"
[[ -n "$KEY_ENV" ]] && ENV_LINE="$ENV_LINE $KEY_ENV=$KEY_VAL"
exec_cmd "export PATH=\$HOME/.local/bin:\$PATH; cd kavach/backend; pkill -f 'kavach.target.service' || true; \
  $ENV_LINE nohup uv run uvicorn kavach.target.service:app --host 0.0.0.0 --port $PORT > /tmp/target.log 2>&1 & sleep 1; echo started" \
  | grep -v "$KEY_VAL" || true

URL="https://$INSTANCE_ID-$PORT.agent37.app"
echo "4/4 health check: $URL/health"
for _ in $(seq 1 30); do
  if curl -fsS -H "X-Agent37-Key: $AGENT37_API_KEY" "$URL/health" >/dev/null 2>&1; then
    echo
    echo "Target is up. Put this in .env:"
    echo "  TARGET_URL=$URL"
    echo "  TARGET_EXTRA_HEADERS={\"X-Agent37-Key\":\"<your AGENT37_API_KEY>\"}"
    echo
    echo "After the demo: $0 delete $INSTANCE_ID"
    exit 0
  fi
  sleep 2
done
echo "health check timed out. Logs:"
exec_cmd "tail -n 40 /tmp/target.log" || true
exit 1
