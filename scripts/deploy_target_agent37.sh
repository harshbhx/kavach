#!/usr/bin/env bash
# Deploy the DiwaliMart target bot into an Agent37 sandbox (disposable microVM).
#
#   AGENT37_API_KEY=...  ANTHROPIC_API_KEY=...  ./scripts/deploy_target_agent37.sh
#   ./scripts/deploy_target_agent37.sh delete <instance_id>     # stop billing after the demo
#
# Optional env: REPO_URL (default the public GitHub repo), TARGET_MODEL, PORT (8000), INSTANCE_ID (reuse one).
# Needs a funded Agent37 wallet. Endpoints per https://www.agent37.com/docs — VERIFY the background-process
# rules on the "Run commands" page if the health check never comes up.
set -euo pipefail

API=https://api.agent37.com/v1
SANDBOX=https://sandbox.agent37.app/v1
REPO_URL=${REPO_URL:-https://github.com/harshbhx/kavach.git}
TARGET_MODEL=${TARGET_MODEL:-anthropic/claude-haiku-5-5}
PORT=${PORT:-8000}

: "${AGENT37_API_KEY:?set AGENT37_API_KEY}"
command -v jq >/dev/null || { echo "jq is required"; exit 1; }

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
  local out
  out=$(curl -fsS -X POST "$SANDBOX/instances/$INSTANCE_ID/exec" \
    -H "X-Agent37-Key: $AGENT37_API_KEY" -H "Content-Type: application/json" \
    -d "$(jq -n --arg c "$1" '{command: $c}')")
  echo "$out" | jq -r '.stdout // empty'
  local code
  code=$(echo "$out" | jq -r '.exit_code // 0')
  if [[ "$code" != "0" ]]; then
    echo "$out" | jq -r '.stderr // empty' >&2
    echo "command failed ($code): $1" >&2
    return 1
  fi
}

if [[ -z "${INSTANCE_ID:-}" ]]; then
  echo "1/4 creating instance…"
  INSTANCE_ID=$(curl -fsS -X POST "$API/instances" -H "Authorization: Bearer $AGENT37_API_KEY" \
    -H "Content-Type: application/json" -d '{"template":"agent37-base"}' | jq -r '.id // .data.id // .instance.id')
  [[ -n "$INSTANCE_ID" && "$INSTANCE_ID" != "null" ]] || { echo "could not read the instance id"; exit 1; }
fi
echo "    instance: $INSTANCE_ID"

echo "2/4 installing uv + cloning the repo…"
exec_cmd 'command -v uv >/dev/null || (curl -LsSf https://astral.sh/uv/install.sh | sh)'
exec_cmd "export PATH=\$HOME/.local/bin:\$PATH; [ -d kavach ] && (cd kavach && git pull -q) || git clone -q $REPO_URL kavach; cd kavach/backend && uv sync -q"

echo "3/4 starting the target on :$PORT…"
ENV_LINE="TARGET_MODEL=$TARGET_MODEL"
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
